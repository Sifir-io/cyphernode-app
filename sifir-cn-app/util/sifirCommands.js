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
const cyphernode_js_sdk_1 = require("cyphernode-js-sdk");
const pairing_1 = require("./pairing");
const debug = require("debug")("sifir:sifirCommands:");
const sifirCommands = ({ 
// defaults to a CN transport
transport = cyphernode_js_sdk_1.cypherNodeHttpTransport(), registry = _registry, bridge = new events_1.EventEmitter() } = {}) => {
    const { getDeviceKeysByKeyId } = stores_1.nodeStore();
    const { parseSignedToken } = pairing_1.pairingUtil();
    // FIXME i moved this from app here, not sure if we should be lsnere here or in pairing api ?
    bridge.on(constants_1.pairingEvents.RECIEVED, async (pairingPayload) => {
        debug("FIXME app got pairing event but will do nothing for now ??");
        await validatePairingEvent(pairingPayload);
    });
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
    const checkValidSign = ({ isValidSign }) => {
        if (isValidSign !== true)
            throw "Invalid request signature, buting out";
    };
    const isSifirCommand = (command) => !![
        "sifirGetLnWalletSnapshot",
        "sifirGetBtcWalletSnapshot",
        "pairing-event",
        "sync"
    ].find(cmd => cmd === command);
    const processSifirCommand = async (command, param) => {
        let reply;
        switch (command) {
            case "sifirGetLnWalletSnapshot":
                checkValidSign(param);
                reply = await getLnWalletSnapshot(param);
                break;
            case "sifirGetBtcWalletSnapshot":
                checkValidSign(param);
                reply = await getBtcWalletSnapshot(param);
                break;
            case "pairing-event":
            case "sync":
                // Part of pairing and sync is exchanging keys so we dont check device signatures here
                debug(`processing sifir-app command ${command}`);
                const validationPayload = await validatePairingEvent(param);
                if (!validationPayload) {
                    reply = { err: "Invalid pairing param" };
                }
                else {
                    reply = validationPayload;
                }
        }
        return reply;
    };
    const getLnWalletSnapshot = async (param) => {
        // FIXME sifirClient({transport}) should work :) and clean up this mess
        const [funds, { invoices }, { pays }] = await Promise.all([
            transport.get("ln_listfunds"),
            transport.get("ln_getinvoice"),
            transport.get("ln_listpays")
        ]);
        return { funds, invoices, pays };
    };
    const getBtcWalletSnapshot = async (param) => { };
    return { isSifirCommand, processSifirCommand };
};
exports.sifirCommands = sifirCommands;
