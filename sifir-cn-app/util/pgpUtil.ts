import * as pgp from "openpgp";
const getPrimarykeyFromArmored = async (armoredKey: string) => {
  const foundKeys = await pgp.key.readArmored(armoredKey);
  const {
    keys: [primaryKey]
  } = foundKeys;
  return primaryKey;
};
const getDecryptedPrivateKeyFromArmored = async (
  armoredPrivatekey: string,
  passphrase: string
) => {
  const {
    keys: [privateKey]
  } = await pgp.key.readArmored(armoredPrivatekey);
  await privateKey.decrypt(passphrase);
  return privateKey;
};

const getArmoredKeyFingerPrint = async (armoredKey: string) => {
  const {
    primaryKey: { fingerprint }
  } = await getPrimarykeyFromArmored(armoredKey);
  return Buffer.from(fingerprint)
    .toString("hex")
    .toUpperCase();
};

export {
  getPrimarykeyFromArmored,
  getDecryptedPrivateKeyFromArmored,
  getArmoredKeyFingerPrint
};
