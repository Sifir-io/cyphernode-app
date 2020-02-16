"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cyphernode_js_sdk_1 = require("cyphernode-js-sdk");
const debug_1 = __importDefault(require("debug"));
const v4_1 = __importDefault(require("uuid/v4"));
const index_1 = require("../stores/constants/index");
const stores_1 = require("../stores");
const debug = debug_1.default("sifir:pairing");
const nodeStore = stores_1.nodeStore();
const { hmacSHA256Hex } = cyphernode_js_sdk_1.cryptoUtils();
const crypto_1 = require("crypto");
const sessionSecret = crypto_1.randomBytes(64).toString("hex");
const pairingUtil = ({ tokenSigningSecret = process.env.SIFIR_API_PAIRING_SECRET || sessionSecret } = {}) => {
    const parseSignedToken = async (token, key, tokenExpiry = process.env.SIFIR_API_PAIRING_KEY_EXPIRY || 30000) => {
        try {
            const { timestamp } = token;
            if (timestamp > Date.now())
                return false;
            if (Date.now() - parseInt(timestamp) > tokenExpiry)
                return false;
            const { key: validKey } = await getSignedToken(token, parseInt(timestamp));
            if (key === validKey)
                return true;
        }
        catch (err) {
            debug("error parsing key", err);
            return false;
        }
        return false;
    };
    const getSignedToken = async (token, timestamp = Date.now()) => {
        const tokenString = JSON.stringify({ ...token, timestamp });
        return {
            token: tokenString,
            timestamp,
            key: await hmacSHA256Hex(tokenString, tokenSigningSecret)
        };
    };
    return {
        getSignedToken,
        parseSignedToken
    };
};
exports.pairingUtil = pairingUtil;
const matrixPairingUtil = ({ client, bridge }) => {
    const sifirHomeServerURL = process.env.SIFIR_SYNAPSE_HOMESERVER_URL;
    const _createAndBindPairingEvent = async () => {
        const pairingEvent = `${index_1.msgTypes.PAIRING_REQ}:${v4_1.default()}`;
        debug("created pairing event", pairingEvent);
        // FIXME send a second key that does not have the password as part of it's hash!
        client.on("toDeviceEvent", async (event) => {
            if (event.getType() !== pairingEvent) {
                return;
            }
            const pairingPayload = {
                ...event.getContent(),
                user: event.getSender()
            };
            debug("matrix::Got pairing request", {
                ...pairingPayload
            });
            bridge.emit(index_1.pairingEvents.RECIEVED, pairingPayload);
        });
        return pairingEvent;
    };
    const getPairingToken = async (nodeDeviceId, keyPassphrase) => {
        const { devicesUser, devicesPassword, pubKey } = await nodeStore.getDecryptSynapseLogin(nodeDeviceId, keyPassphrase);
        const pairingEvent = await _createAndBindPairingEvent();
        return {
            // Schema we have now, could change in future
            user: devicesUser,
            password: devicesPassword,
            server: sifirHomeServerURL,
            pairingEvent
        };
    };
    return { getPairingToken };
};
exports.matrixPairingUtil = matrixPairingUtil;
