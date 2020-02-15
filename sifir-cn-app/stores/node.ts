import { nodeModel } from "./impl/node";
import {
  getDecryptedPrivateKeyFromArmored,
  getArmoredKeyFingerPrint
} from "../util/pgpUtil";
import * as pgp from "openpgp";
import { pbkdf2Sync } from "crypto";
import debug from "debug";
const nodeStore = (model = nodeModel(), log = debug("nodestore")) => {
  const { getNodeSifirUser, getDevicePgpKeys, setDevicePgpKeys } = model;
  const makeAndSetNodeKeys = async (
    nodeDeviceId: string,
    keyPassphrase: string
  ): Promise<{ publicKeyArmored: string; privateKeyArmored: string }> => {
    // 1- Setup node PGP keys
    const { pubKey, privKey } = (await getDevicePgpKeys(nodeDeviceId)) || {};
    if (pubKey || privKey) {
      throw "Keys already setup for this device, nothing to do !";
    }
    const { privateKeyArmored, publicKeyArmored } = await pgp.generateKey({
      userIds: [{ name: nodeDeviceId }],
      curve: "ed25519", // ECC curve name
      passphrase: keyPassphrase
    });
    const fingerprint = await getArmoredKeyFingerPrint(publicKeyArmored);
    await setDevicePgpKeys(
      nodeDeviceId,
      fingerprint,
      publicKeyArmored,
      privateKeyArmored
    );
    return { publicKeyArmored, privateKeyArmored };
  };

  const getNodeKeysAndSifirUser = async (
    nodeDeviceId: string
  ): Promise<{
    user: string;
    salt: string;
    salt2: string;
    pubKey: string;
    privKey: string;
  }> => {
    const [nodeSifirUser, nodePgpKeys] = await Promise.all([
      getNodeSifirUser(nodeDeviceId),
      getDevicePgpKeys(nodeDeviceId)
    ]);
    let user: string,
      salt: string,
      salt2: string,
      pubKey: string,
      privKey: string;
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
  const getDecryptSynapseLogin = async (
    nodeDeviceId: string,
    keyPassphrase: string
  ) => {
    const nodeKeysAndUser = await getNodeKeysAndSifirUser(nodeDeviceId);
    const {
      user,
      salt,
      salt2,
      privKey: armoredPrivatekey,
      pubKey
    } = nodeKeysAndUser;
    const privKey = await getDecryptedPrivateKeyFromArmored(
      armoredPrivatekey,
      keyPassphrase
    );
    let payload = {
      privKey,
      pubKey
    };
    if (user && salt2 && salt) {
      const password = pbkdf2Sync(
        keyPassphrase,
        salt,
        100000,
        64,
        "sha512"
      ).toString("base64");
      const devicesPassword = pbkdf2Sync(
        keyPassphrase,
        salt2,
        100000,
        64,
        "sha512"
      ).toString("base64");
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
export { nodeStore };
