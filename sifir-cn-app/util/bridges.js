"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const _registry = __importStar(require("../stores/registry"));
const constants_1 = require("../stores/constants");
const stores_1 = require("../stores/");
const events_1 = require("events");
const cyphernode_js_sdk_transports_1 = require("cyphernode-js-sdk-transports");
const cyphernode_js_sdk_1 = require("cyphernode-js-sdk");
const msgMiddleWare_1 = require("./msgMiddleWare");
const pairing_1 = require("./pairing");
const debug = require("debug")("sifir:bridgeUtil:");
const sifirBridgeUtil = ({ nodeStore = stores_1.nodeStore, registry = _registry, bridge = new events_1.EventEmitter() } = {}) => {
    const { parseSignedToken } = pairing_1.pairingUtil();
    const cnTransport = cyphernode_js_sdk_1.cypherNodeHttpTransport();
    const { getDevicePgpKeys, setDevicePgpKeys, getDeviceKeysByKeyId, getPairedDevicesByPrimaryDevice } = nodeStore();
    const validatePairingEvent = async (pairingPayload) => {
        const { token, key } = pairingPayload;
        if (!token || !key) {
            debug("Pairing request missing token or key");
            return false;
        }
        const isValid = await parseSignedToken(token, key);
        if (isValid !== true)
            return false;
        debug("Pairing request validated!");
        const { deviceId, devicePubkey, nodeKeyId } = pairingPayload;
        // TODO make this into Joi schema
        if (!deviceId || !devicePubkey) {
            debug("Valid paring request is missing deviceId or devicePubkey");
            return false;
        }
        if (!nodeKeyId) {
            debug("Node KeyId for pairing is missing");
        }
        const { pubKey, deviceId: nodeDeviceId } = await getDeviceKeysByKeyId(nodeKeyId);
        if (nodeDeviceId !== registry.get("node-id")) {
            debug("KeyId does not belong to node !", nodeDeviceId, registry.get("node_id"), pubKey);
            return false;
        }
        // Pairing is legit : )
        const pairingResp = { isValid: true, nodePubkey: pubKey };
        bridge.emit(constants_1.pairingEvents.VALIDATED, { pairingPayload, pairingResp });
        return pairingResp;
    };
    const setupSifirMatrixBridge = async ({ user, pass, inboundMiddleware, outboundMiddleware }) => {
        debug(`setting up sifir matrix bridge for ${user} : ${registry.get("node-id")}`);
        const client = await cyphernode_js_sdk_transports_1.getSyncMatrixClient({
            baseUrl: process.env.SIFIR_SYNAPSE_HOMESERVER_URL,
            user: user,
            password: pass,
            deviceId: registry.get("node-id")
        });
        const matrixBridge = cyphernode_js_sdk_transports_1.matrixBridge({
            bridge,
            client,
            inboundMiddleware,
            outboundMiddleware
        });
        await matrixBridge.startBridge();
        registry.set("matrix-bridge", matrixBridge);
        registry.set("matrix-client", client);
        bridge.emit(constants_1.matrixEvents.SIFIR_CLIENT_UPDATE, { client });
        debug("matrix bridge is up");
        // Finally lsn to bridge commands and link to cn
    };
    const setupTorBridge = async ({ inboundMiddleware, outboundMiddleware }) => {
        const torBridge = cyphernode_js_sdk_transports_1.signedHttpBridge({
            bridge,
            inboundMiddleware,
            outboundMiddleware
        });
        registry.set("tor-bridge", await torBridge.startBridge({
            bridgeApiPort: process.env.SIFIR_APP_TOR_BRIDGE_PORT
        }));
        debug("tor bridge is up");
    };
    const startCnCommandBridge = () => {
        if (registry.get("cn-cmd-bridge-setup") === true) {
            debug("cn cmd bridge already setup , skipping");
            return;
        }
        bridge.on("sifirBridgeCommand", async ({ source, command, nonce, method, param, isValidSign }) => {
            let reply;
            debug(`got command from ${source}`, command, method, nonce);
            try {
                // intercep sifir commands here mainly for tor
                if (["pairing-event", "sync"].includes(command)) {
                    debug(`processing sifir-app command ${command}`);
                    const validationPayload = await validatePairingEvent(param);
                    if (!validationPayload) {
                        reply = { err: "Invalid pairing param" };
                    }
                    else {
                        reply = { command, method, ...validationPayload };
                    }
                }
                else {
                    // cn command need to be signed
                    if (isValidSign !== true)
                        throw "Invalid request signature, buting out";
                    switch (method) {
                        case "GET":
                            debug("processing cn get", command);
                            reply = await cnTransport.get(command, param);
                            break;
                        case "POST":
                            debug("processing cn post", command);
                            reply = await cnTransport.post(command, param);
                            break;
                        default:
                            debug("Unknown cn command method", method);
                            return;
                    }
                }
                debug(`done command from ${source}`, command, method, nonce);
            }
            catch (err) {
                debug(`error processing command from ${source}`, command, method, nonce, err);
                // If it's an error with a body (generated by superagent calling cyphernode, parse it into something friendly)
                if (err.response && err.response.body)
                    reply = { err: err.response.body };
                else
                    reply = { err };
            }
            finally {
                bridge.emit(nonce, reply);
            }
        });
        debug("sifir cyphernode command bridge setup");
        registry.set("cn-cmd-bridge-setup", true);
    };
    const setupAndStartBridges = async () => {
        // Start bridges and lsn for commands
        const { privKey: decryptedPrivkeyObj, pubKey } = registry.get("node-auth-info");
        const msgMiddleware = msgMiddleWare_1.sifirMsgMiddlware({ decryptedPrivkeyObj, pubKey });
        try {
            if (!registry.get("tor-bridge")) {
                await setupTorBridge({
                    inboundMiddleware: msgMiddleware.httpInboundBridgeMiddleware,
                    outboundMiddleware: msgMiddleware.httpOutboundBridgeMsgMiddleware
                });
            }
            else {
                debug("sifir tor bridge already up, skippping");
            }
        }
        catch (err) {
            debug("ERROR - Setting up tor bridge", err);
        }
        try {
            const { user, pass } = registry.get("node-sifir-login") || {};
            if (user && pass) {
                if (!registry.get("matrix-bridge")) {
                    await setupSifirMatrixBridge({
                        inboundMiddleware: msgMiddleware.matrixBridgeInboundMiddleWare,
                        outboundMiddleware: msgMiddleware.matrixBridgeOutboundMiddleWare,
                        user,
                        pass
                    });
                }
                else {
                    debug("sifir-matrix-bridge already up, skippping");
                }
            }
            else {
                debug("sifir-matrix setup not detected, skipping matirx bridge");
            }
        }
        catch (err) {
            debug("ERROR Setting up matrix bridge", err);
        }
    };
    return {
        setupAndStartBridges,
        setupSifirMatrixBridge,
        startCnCommandBridge,
        setupTorBridge,
        validatePairingEvent
    };
};
exports.sifirBridgeUtil = sifirBridgeUtil;
