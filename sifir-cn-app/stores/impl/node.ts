import { getClient } from "../db";
interface PairedDeviceEntry {
  pairingId: string;
  primaryDeviceId: string;
  secondaryDeviceId: string;
  pairingkeyId: string;
  status: number;
}
const nodeModel = (_db = getClient()) => {
  const setDevicePgpKeys = async (
    deviceId: string,
    keyId: string,
    pubKey: string,
    privKey?: string
  ) => {
    const db = await _db;
    return await new Promise((res, rej) =>
      db.run(
        "INSERT INTO device_keys (deviceId,keyId,pubKey,privKey) values ($deviceId,$keyId,$pub,$priv)",
        {
          $deviceId: deviceId,
          $keyId: keyId,
          $priv: privKey,
          $pub: pubKey
        },
        err => (err ? rej(err) : res())
      )
    );
  };

  /** FIXME change this to all since now device can have multiple keys*/
  const getDevicePgpKeys = async (
    deviceId: string
  ): Promise<{
    deviceId: string;
    keyId: string;
    privKey: string;
    pubKey: string;
  }> => {
    const db = await _db;
    return new Promise((res, rej) =>
      db.get(
        "SELECT * from device_keys WHERE deviceId = $deviceId ",
        { $deviceId: deviceId },
        (err, keys) => (err ? rej(err) : res(keys))
      )
    );
  };
  const getDeviceKeysByKeyId = async (
    keyId: string
  ): Promise<{
    deviceId: string;
    keyId: string;
    privKey: string;
    pubKey: string;
  }> => {
    const db = await _db;
    return new Promise((res, rej) =>
      db.get(
        "SELECT * from device_keys WHERE keyId = $keyId ",
        { $keyId: keyId },
        (err, keys) => (err ? rej(err) : res(keys))
      )
    );
  };
  const getPairedDeviceKeysByKeyIdAndType = async (
    keyId: string,
    pairingType: string,
    pairingStatus: number = 1
  ): Promise<{
    deviceId: string;
    keyId: string;
    privKey: string;
    pubKey: string;
    pairingType: string;
    pairingStatus: number;
  }> => {
    const db = await _db;
    return new Promise((res, rej) =>
      db.get(
        `SELECT dk.deviceId, dk.keyId, dk.privKey, dk.pubKey, pd.pairingType, pd.status 
	 FROM device_keys AS dk 
	 INNER JOIN paired_user_devices AS pd ON pd.secondaryDeviceKeyId = dk.keyId
	 WHERE pd.secondaryDeviceKeyId = $keyId AND pd.pairingType = $pairingType AND pd.status = $pairingStatus`,
        {
          $keyId: keyId,
          $pairingType: pairingType,
          $pairingStatus: pairingStatus
        },
        (err, keys) => (err ? rej(err) : res(keys))
      )
    );
  };
  const updatePairingIdStatus = async (
    pairingId: number,
    pairingStatus: number
  ) => {
    const db = await _db;
    return new Promise((res, rej) =>
      db.run(
        `UPDATE paired_user_devices SET status = $pairingStatus WHERE pairingId = $pairingId`,
        {
          $pairingId: pairingId,
          $pairingStatus: pairingStatus
        },
        err => (err ? rej(err) : res())
      )
    );
  };
  const getNodeSifirUser = async (
    nodeDeviceId: string
  ): Promise<{
    user: string;
    salt1: string;
    salt2: string;
  }> => {
    const db = await _db;
    return new Promise((res, rej) =>
      db.get(
        "SELECT user,salt1,salt2 FROM devices_sifir_login WHERE nodeDeviceId = $nodeDeviceId ",
        { $nodeDeviceId: nodeDeviceId },
        (err, user) => (err ? rej(err) : res(user))
      )
    );
  };

  const setNodeSifirUser = async (
    nodeDeviceId: string,
    user: string,
    primarySalt: string,
    secondarySalt: string
  ) => {
    const db = await _db;
    return await new Promise((res, rej) =>
      db.run(
        "INSERT INTO devices_sifir_login (nodeDeviceId,user,salt1,salt2) values ($nodeDeviceId,$user,$salt1,$salt2)",
        {
          $nodeDeviceId: nodeDeviceId,
          $user: user,
          $salt1: primarySalt,
          $salt2: secondarySalt
        },
        err => (err ? rej(err) : res())
      )
    );
  };
  const insertPairedDevice = async (
    primaryDevice: string,
    secondaryDevice: string,
    secondaryDeviceKeyId: string,
    pairingType: string,
    pairingStatus: number = 1
  ) => {
    const db = await _db;
    return await new Promise((res, rej) =>
      db.run(
        "INSERT INTO paired_user_devices (primaryDeviceId,secondaryDeviceId,secondaryDeviceKeyId,pairingType,status) values ($primaryDeviceId,$secondaryDeviceId,$secondaryDeviceKeyId,$pairingType,$status)",
        {
          $primaryDeviceId: primaryDevice,
          $secondaryDeviceId: secondaryDevice,
          $secondaryDeviceKeyId: secondaryDeviceKeyId,
          $pairingType: pairingType,
          $status: pairingStatus
        },
        err => (err ? rej(err) : res())
      )
    );
  };
  const getPairedDevicesByPrimaryDevice = async (
    deviceId: string
  ): Promise<PairedDeviceEntry[]> => {
    const db = await _db;
    return new Promise((res, rej) =>
      db.all(
        "SELECT * FROM paired_user_devices WHERE primaryDeviceId = $deviceId ",
        { $deviceId: deviceId },
        (err, devices) => (err ? rej(err) : res(devices))
      )
    );
  };
  const getPairedDevicesByStatus = async (
    status = 1
  ): Promise<PairedDeviceEntry[]> => {
    const db = await _db;
    return new Promise((res, rej) =>
      db.all(
        "SELECT * FROM paired_user_devices WHERE status = $status ",
        { $status: status },
        (err, devices) => (err ? rej(err) : res(devices))
      )
    );
  };
  const getDevicesHavingPrivKey = async (
    status = 1
  ): Promise<PairedDeviceEntry[]> => {
    const db = await _db;
    return new Promise((res, rej) =>
      db.all(
        `SELECT dk.pubKey, dk.deviceId, dk.keyId FROM device_keys AS dk WHERE dk.privKey IS NOT NULL`,
        {},
        (err, devices) => (err ? rej(err) : res(devices))
      )
    );
  };
  return {
    setDevicePgpKeys,
    getDevicePgpKeys,
    getDeviceKeysByKeyId,
    getNodeSifirUser,
    setNodeSifirUser,
    getPairedDevicesByStatus,
    getPairedDevicesByPrimaryDevice,
    getPairedDeviceKeysByKeyIdAndType,
    getDevicesHavingPrivKey,
    insertPairedDevice,
    updatePairingIdStatus
  };
};
export { nodeModel };
