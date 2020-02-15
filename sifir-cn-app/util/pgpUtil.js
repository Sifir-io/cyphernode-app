"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const pgp = __importStar(require("openpgp"));
const getPrimarykeyFromArmored = async (armoredKey) => {
    const foundKeys = await pgp.key.readArmored(armoredKey);
    const { keys: [primaryKey] } = foundKeys;
    return primaryKey;
};
exports.getPrimarykeyFromArmored = getPrimarykeyFromArmored;
const getDecryptedPrivateKeyFromArmored = async (armoredPrivatekey, passphrase) => {
    const { keys: [privateKey] } = await pgp.key.readArmored(armoredPrivatekey);
    await privateKey.decrypt(passphrase);
    return privateKey;
};
exports.getDecryptedPrivateKeyFromArmored = getDecryptedPrivateKeyFromArmored;
const getArmoredKeyFingerPrint = async (armoredKey) => {
    const { primaryKey: { fingerprint } } = await getPrimarykeyFromArmored(armoredKey);
    return Buffer.from(fingerprint)
        .toString("hex")
        .toUpperCase();
};
exports.getArmoredKeyFingerPrint = getArmoredKeyFingerPrint;
