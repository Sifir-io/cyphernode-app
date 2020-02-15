"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("./impl/node");
const pgpUtil_1 = require("../util/pgpUtil");
const pgp = __importStar(require("openpgp"));
const crypto_1 = require("crypto");
const debug_1 = __importDefault(require("debug"));
const nodeStore = (model = node_1.nodeModel(), log = debug_1.default("nodestore")) => {
    const { getNodeSifirUser, getDevicePgpKeys, setDevicePgpKeys } = model;
    const makeAndSetNodeKeys = async (nodeDeviceId, keyPassphrase) => {
        // 1- Setup node PGP keys
        const { pubKey, privKey } = (await getDevicePgpKeys(nodeDeviceId)) || {};
        if (pubKey || privKey) {
            throw "Keys already setup for this device, nothing to do !";
        }
        const { privateKeyArmored, publicKeyArmored } = await pgp.generateKey({
            userIds: [{ name: nodeDeviceId }],
            curve: "ed25519",
            passphrase: keyPassphrase
        });
        const fingerprint = await pgpUtil_1.getArmoredKeyFingerPrint(publicKeyArmored);
        await setDevicePgpKeys(nodeDeviceId, fingerprint, publicKeyArmored, privateKeyArmored);
        return { publicKeyArmored, privateKeyArmored };
    };
    const getNodeKeysAndSifirUser = async (nodeDeviceId) => {
        const [nodeSifirUser, nodePgpKeys] = await Promise.all([
            getNodeSifirUser(nodeDeviceId),
            getDevicePgpKeys(nodeDeviceId)
        ]);
        let user, salt, salt2, pubKey, privKey;
        if (nodeSifirUser) {
            ({ user, salt1: salt, salt2 } = nodeSifirUser);
        }
        if (nodePgpKeys) {
            ({ pubKey, privKey } = nodePgpKeys);
        }
        return {
            user,
            salt,
            salt2,
            pubKey,
            privKey
        };
    };
    const getDecryptSynapseLogin = async (nodeDeviceId, keyPassphrase) => {
        const nodeKeysAndUser = await getNodeKeysAndSifirUser(nodeDeviceId);
        const { user, salt, salt2, privKey: armoredPrivatekey, pubKey } = nodeKeysAndUser;
        const privKey = await pgpUtil_1.getDecryptedPrivateKeyFromArmored(armoredPrivatekey, keyPassphrase);
        let payload = {
            privKey,
            pubKey
        };
        if (user && salt2 && salt) {
            const password = crypto_1.pbkdf2Sync(keyPassphrase, salt, 100000, 64, "sha512").toString("base64");
            const devicesPassword = crypto_1.pbkdf2Sync(keyPassphrase, salt2, 100000, 64, "sha512").toString("base64");
            // TODO deviceUser has a schema of being the user with -dev
            // Should either save this to a DB for clarity or depreacte this
            const userSplit = user.split(":", 2);
            payload = {
                ...payload,
                user,
                pass: password,
                devicesUser: `${userSplit[0]}-dev:${userSplit[1]}`,
                devicesPassword
            };
        }
        return payload;
    };
    return {
        ...model,
        getNodeKeysAndSifirUser,
        getDecryptSynapseLogin,
        makeAndSetNodeKeys
    };
};
exports.nodeStore = nodeStore;
