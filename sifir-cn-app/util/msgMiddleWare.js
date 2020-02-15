"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const stores_1 = require("../stores/");
const pgp = __importStar(require("openpgp"));
const pgpUtil = __importStar(require("../util/pgpUtil"));
const _lru = require("lru-cache");
const debug = require("debug");
const sifirMsgMiddlware = ({ pubKey = null, decryptedPrivkeyObj = null, decryptContent = async (msg, devicePubkey) => {
    const decryptyedMsg = await pgp.decrypt({
        message: await pgp.message.readArmored(msg),
        // publicKeys: devicePubkey, // for verification
        privateKeys: [decryptedPrivkeyObj] // for decryption
    });
    const { data: decryptedData } = decryptyedMsg;
    return decryptedData;
}, encryptAndSign = async (msg, devicePubkey) => {
    const encryptedMsg = await pgp.encrypt({
        message: pgp.message.fromText(msg),
        publicKeys: devicePubkey,
        privateKeys: [decryptedPrivkeyObj] // for signing (optional)
    });
    const { data: encryptedData } = encryptedMsg;
    return encryptedData;
}, signMessage = async (msg) => {
    // Sign a msg
    const { signature } = await pgp.sign({
        message: await pgp.cleartext.fromText(msg),
        privateKeys: [decryptedPrivkeyObj],
        detached: true
    });
    return signature;
}, checkSign = async (msg, devicePubkey, signature) => {
    // Verify a message
    const verifiedSignature = await pgp.verify({
        message: await pgp.cleartext.fromText(msg),
        signature: await pgp.signature.readArmored(signature),
        publicKeys: devicePubkey
    });
    const { signatures: [{ valid }] } = verifiedSignature;
    return valid;
}, nodeStore = stores_1.nodeStore(), log = debug("sifir:msgMiddleware"), lru = new _lru(50) } = {}) => {
    if (!decryptedPrivkeyObj || !pubKey)
        throw "Middleware needs unlcoked privkey obj at init";
    const matrixBridgeInboundMiddleWare = async ({ event, accountsPairedDeviceList }) => {
        const eventSender = event.getSender();
        const { body } = event.getContent();
        const { encryptedData, signature } = JSON.parse(body);
        const decryptedBody = await decryptContent(encryptedData);
        log("sucessfully decrypted event", decryptedBody, signature);
        const { fingerprint, nonce, ...rest } = JSON.parse(decryptedBody);
        const { deviceId, pubKey } = (await nodeStore.getPairedDeviceKeysByKeyIdAndType(fingerprint, "matrix")) || {};
        // verify sigs
        let isValidSign = false;
        if (deviceId && pubKey) {
            lru.set(nonce, { deviceId, pubKey, fingerprint, eventSender });
            const devicePubkey = await pgpUtil.getPrimarykeyFromArmored(pubKey);
            isValidSign = await checkSign(decryptedBody, devicePubkey, signature);
            log(`found paired pubkey for fingerprint with deviceId ${deviceId}`);
        }
        return { ...rest, nonce, deviceId, isValidSign };
    };
    /**
     * Relies heavily on LRU cache to target correct device
     * TODO how kosher?
     */
    const matrixBridgeOutboundMiddleWare = async (msg) => {
        const { nonce, ...payload } = JSON.parse(msg);
        const { deviceId, eventSender, pubKey, fingerprint } = lru.get(nonce);
        const devicePubkey = await pgpUtil.getPrimarykeyFromArmored(pubKey);
        log("outbound session found for nonce,deviceId", deviceId, nonce, fingerprint);
        const encryptedMsg = await pgp.encrypt({
            message: pgp.message.fromText(JSON.stringify({ nonce, ...payload })),
            detached: true,
            publicKeys: devicePubkey,
            privateKeys: [decryptedPrivkeyObj] // for signing (optional)
        });
        const { data: encryptedData, signature } = encryptedMsg;
        return {
            deviceId,
            eventSender,
            body: JSON.stringify({ encryptedData, signature })
        };
    };
    // TODO LRU cache keys by fingerprint
    const httpInboundBridgeMiddleware = async (req) => {
        // Decrypt / Check sign
        const signatureb64 = req.headers["content-signature"];
        if (!signatureb64) {
            throw "Payload is unsigned !";
        }
        const signature = Buffer.from(signatureb64, "base64").toString("utf8");
        const [sig, fingerprint] = signature.split(";");
        if (!sig || !fingerprint) {
            throw "missing sig or fingerprint on request";
        }
        log("inbound signed request form device fingerprint:", fingerprint);
        let { command } = req.params;
        let method = req.method;
        let param = method === "POST" ? req.body : req.params["0"];
        let isValidSign = false;
        // Load fingerprint from paired devices;
        const { deviceId, pubKey, pairingType } = (await nodeStore.getPairedDeviceKeysByKeyIdAndType(fingerprint, "tor")) ||
            {};
        if (deviceId && pubKey) {
            log(`found paired pubkey for fingerprint with deviceId ${deviceId}`);
            //schema matters when validating sigs
            const msgToValidate = JSON.stringify({ command, payload: param || null });
            const devicePubkeyArmored = await pgpUtil.getPrimarykeyFromArmored(pubKey);
            isValidSign = await checkSign(msgToValidate, devicePubkeyArmored, sig);
            log("inbound signature validates payload and paired pubkey", msgToValidate, fingerprint, isValidSign);
        }
        return { command, method, param, deviceId, isValidSign };
    };
    // TODO cache fingerprint
    const httpOutboundBridgeMsgMiddleware = async (payload, res) => {
        const payloadString = JSON.stringify(payload);
        const [nodeFingerprint, payloadSignature] = await Promise.all([
            pgpUtil.getArmoredKeyFingerPrint(pubKey),
            signMessage(payloadString)
        ]);
        const signature = Buffer.from(`${payloadSignature};${nodeFingerprint}`, "utf8").toString("base64");
        log("httpoutbound signed payload", payload, payloadSignature, nodeFingerprint, signature);
        res.set("content-signature", signature);
        return res;
    };
    return {
        matrixBridgeOutboundMiddleWare,
        matrixBridgeInboundMiddleWare,
        httpInboundBridgeMiddleware,
        httpOutboundBridgeMsgMiddleware
    };
};
exports.sifirMsgMiddlware = sifirMsgMiddlware;
