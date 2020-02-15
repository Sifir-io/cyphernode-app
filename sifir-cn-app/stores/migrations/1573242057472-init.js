const { getClient } = require("../db");
module.exports.up = async function(next) {
  const db = await getClient();
  await new Promise((res, rej) =>
    db.run(
      "CREATE TABLE _migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, migrationJson TEXT)",
      err => (err ? rej(err) : res())
    )
  );
  // Store node and paired device PGP keys
  await new Promise((res, rej) =>
    // TODO depcreate deviceId from this table, all dvices should be recognized by their fingerprint
    // deviceId just becomes a pairing table thing for convience
    db.run(
      `CREATE TABLE device_keys (
	      id INTEGER PRIMARY KEY AUTOINCREMENT, 
	      keyId VARCHAR(255) NOT NULL UNIQUE, 
	      deviceId VARCHAR(255) NOT NULL, 
	      pubKey BLOB NOT NULL, 
	      privKey BLOB
      )`,
      err => (err ? rej(err) : res())
    )
  );
  // device and key pairing maps
  await new Promise((res, rej) =>
    db.run(
      `CREATE TABLE paired_user_devices (
              pairingId INTEGER PRIMARY KEY AUTOINCREMENT, 
              primaryDeviceId VARCHAR(255) NOT NULL,
              secondaryDeviceId VARCHAR(255) NOT NULL, 
              secondaryDeviceKeyId VARCHAR(255) NOT NULL, 
	      pairingType VARCHAR(255) NOT NULL,
              status INT DEFAULT 1,
              FOREIGN KEY(secondaryDeviceKeyId) REFERENCES device_keys(keyId),
              FOREIGN KEY(primaryDeviceId) REFERENCES device_keys(deviceId),
              FOREIGN KEY(secondaryDeviceId) REFERENCES device_keys(deviceId)
              UNIQUE(primaryDeviceId,secondaryDeviceKeyId,pairingType)
      )`,
      err => (err ? rej(err) : res())
    )
  );
  // sifir network logins
  await new Promise((res, rej) =>
    db.run(
      `CREATE TABLE devices_sifir_login (
              nodeDeviceId VARCHAR(255) NOT NULL UNIQUE,
              user TEXT,
              salt1 BLOB,
              salt2 BLOB,
              FOREIGN KEY(nodeDeviceId) REFERENCES device_keys(deviceId)
      )`,
      err => (err ? rej(err) : res())
    )
  );
  next();
};

module.exports.down = function(next) {
  next();
};
