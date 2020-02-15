"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./stores/constants");
const express_1 = __importDefault(require("express"));
const qr_image_1 = __importDefault(require("qr-image"));
const debug_1 = __importDefault(require("debug"));
const events_1 = require("events");
const pairing_1 = require("./util/pairing");
const stores_1 = require("./stores/");
const pgpUtil_1 = require("./util/pgpUtil");
const debug = debug_1.default("sifir:pairing-api");
const SifirPairingApi = async ({ nodeStore = stores_1.nodeStore(), authUtil = pairing_1.pairingUtil(), acceptedPairingTypes = ["tor", "matrix"], bridge = new events_1.EventEmitter(), client = null } = {}) => {
    const { getSignedToken, parseSignedToken } = authUtil;
    const api = express_1.default.Router();
    // TODO i feel this is monkey shit hacking that breaks the pattern of data flow. To be fixed next iteration
    bridge.on(constants_1.matrixEvents.SIFIR_CLIENT_UPDATE, ({ client: updatedClient }) => {
        debug(`got ${constants_1.matrixEvents.SIFIR_CLIENT_UPDATE} event, updating client`);
        client = updatedClient;
    });
    bridge.on(constants_1.pairingEvents.USER_DEVICE_VER_COMPLETED, async ({ pairingPayload, pairingResp }) => {
        const { deviceId, user, token: { pairingEvent, eventType } } = pairingPayload;
        switch (eventType) {
            case "matrix":
                if (client) {
                    debug(`got ${constants_1.pairingEvents.USER_DEVICE_VER_COMPLETED} for matrix, sending device confirmation msg`);
                    await client.sendToDevice(pairingEvent, {
                        [user]: {
                            [deviceId]: {
                                ...pairingResp
                            }
                        }
                    });
                }
                break;
        }
    });
    // Setup pairing recieved event manager
    // individual bridges are responsible for emitting a briding recieved event
    // TODO Although this all runs locally on the users PC
    // it would be much better to have the salt2 sent to the user app, where it hashed with keytpassphrase to get
    // the password for the phone
    api.post("/start/:eventType/:output?", async (req, res, next) => {
        const { value: { keyPassphrase, nodeDeviceId, deviceId }, error } = stores_1.pairingPayload.validate(req.body);
        const { eventType, output } = req.params;
        if (error) {
            res.status(400).json({ err: error });
            return;
        }
        if (!acceptedPairingTypes.includes(eventType)) {
            res.status(400).json({ err: "Invalid eventtype", eventType });
            return;
        }
        try {
            let pairingToken;
            const { pubKey, privKey, keyId } = (await nodeStore.getDevicePgpKeys(nodeDeviceId)) || {};
            if (!pubKey || !privKey)
                throw "Node keys not set or wrong node id";
            // test to make sure password isvalid
            const privKeyToSign = await pgpUtil_1.getDecryptedPrivateKeyFromArmored(privKey, keyPassphrase);
            switch (eventType) {
                case "matrix":
                    if (!client) {
                        throw "Matrix client was not passed to pairing-api , please make sure you ran setup for a sifir user";
                    }
                    const matrixPairing = pairing_1.matrixPairingUtil({
                        client,
                        bridge
                    });
                    pairingToken = {
                        ...(await matrixPairing.getPairingToken(nodeDeviceId, keyPassphrase)),
                        nodeDeviceId,
                        nodeKeyId: keyId,
                        eventType
                    };
                    break;
                case "tor":
                    pairingToken = {
                        onionUrl: `${process.env.CYPHERNODE_ONION_URL}/sifir/`,
                        nodeDeviceId,
                        nodeKeyId: keyId,
                        eventType
                    };
                    break;
                default:
                    throw "Event type is poop";
            }
            const signedToken = await getSignedToken(pairingToken);
            const base64Token = Buffer.from(JSON.stringify({ ...signedToken })).toString("base64");
            switch (output) {
                case "json":
                    res.status(200).json({ b64token: base64Token });
                    return;
                    break;
                case "qr":
                default:
                    const qrPngBuffer = qr_image_1.default.imageSync(base64Token, {
                        type: "png"
                    });
                    const pngBase64Image = Buffer.from(qrPngBuffer, "base64");
                    res.writeHead(200, {
                        "Content-Type": "image/png",
                        "Content-Length": pngBase64Image.length
                    });
                    res.end(pngBase64Image);
                    break;
            }
        }
        catch (err) {
            debug("error genering pairing payload", err);
            res.status(400).json({ err });
            return;
        }
        next();
    });
    return api;
};
exports.SifirPairingApi = SifirPairingApi;
