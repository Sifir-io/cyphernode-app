import { serial, TestInterface } from "ava";
import * as pgp from "openpgp";
import * as pgpUtil from "../util/pgpUtil";
import agent from "superagent";
import {
  cypherNodeHttpTransport,
  btcClient as _btcClient
} from "cyphernode-js-sdk";
import {
  getSyncMatrixClient,
  cypherNodeMatrixTransport,
  MatrixEvent
} from "cyphernode-js-sdk-transports";
import uuid from "uuid/v4";

const debug = require("debug")("sifir:ava:intergration");
const test = serial as TestInterface<{
  cnAppkeyPassphrase: string;
  cnAppnodeDeviceId: string;
  cnAppdeviceId: string;
  cnAppEndpoint: string;
}>;
let roomId: string;
test.before(async t => {
  // This data is enter on the CnApp and will posted to the QR generting endpoint so
  // the Sifir CN app will then generate the data required nad present it to the phone in form of a QR code
  const cnAppkeyPassphrase = "daYw5a7Mwv3nywXOU+67avsrsNySW5EdIEkIupt3vwY";
  const cnAppnodeDeviceId = "test1";
  const cnAppdeviceId = uuid().replace(/[^a-z]/gim, "");
  const cnAppEndpoint = "http://localhost:3009";
  t.context = {
    cnAppkeyPassphrase,
    cnAppnodeDeviceId,
    cnAppdeviceId,
    cnAppEndpoint
  };
});
test("Should be able able to get a pairing token, register the devices key with the cn-app and send and recieve a signed request via Tor", async t => {
  const {
    cnAppkeyPassphrase,
    cnAppnodeDeviceId,
    cnAppdeviceId,
    cnAppEndpoint
  } = t.context;
  // 1. Generate a key for "device";
  const deviceKeypassphrase = "verybadsecret";
  const { privateKeyArmored, publicKeyArmored } = await pgp.generateKey({
    userIds: [{ name: cnAppdeviceId }],
    curve: "ed25519", // ECC curve name
    passphrase: deviceKeypassphrase
  });
  const fingerprint = await pgpUtil.getArmoredKeyFingerPrint(publicKeyArmored);
  const decryptedPrivkeyObj = await pgpUtil.getDecryptedPrivateKeyFromArmored(
    privateKeyArmored,
    deviceKeypassphrase
  );

  //2. Get paringin token (in json format)
  const {
    body: { b64token }
  } = await agent.post(`${cnAppEndpoint}/pair/start/tor/json`).send({
    keyPassphrase: cnAppkeyPassphrase,
    nodeDeviceId: cnAppnodeDeviceId,
    deviceId: cnAppdeviceId
  });
  const { token: tokenString, key } = JSON.parse(
    Buffer.from(b64token, "base64").toString("utf8")
  );
  const token = JSON.parse(tokenString);
  const { onionUrl, deviceId, nodeDeviceId, nodeKeyId, eventType } = token;
  //3. Register our devices key with cn app
  const transport = cypherNodeHttpTransport({
    proxyUrl: "socks://127.0.0.1:9050",
    gatewayUrl: onionUrl,
    customHeaders: async ({ command, payload }) => {
      const payloadToSign = JSON.stringify({
        command,
        payload: payload || null
      });
      const { signature } = await pgp.sign({
        message: await pgp.cleartext.fromText(payloadToSign),
        privateKeys: [decryptedPrivkeyObj],
        detached: true
      });
      return {
        "content-signature": Buffer.from(
          `${signature};${fingerprint}`,
          "utf8"
        ).toString("base64")
      };
    }
  });
  const reply = await transport.post("pairing-event", {
    devicePubkey: publicKeyArmored,
    nodeKeyId,
    deviceId,
    token,
    key
  });
  t.is(reply.isValid, true);
  t.true(reply.nodePubkey.startsWith("-----BEGIN PGP PUBLIC KEY BLOCK-----"));
  const client = _btcClient({ transport });
  const hash = await client.getBestBlockHash();
  t.true(hash.length > 10);
});
test("Should be able to register pair and register a devices keys via Sifir servers", async t => {
  const {
    cnAppkeyPassphrase,
    cnAppnodeDeviceId,
    cnAppdeviceId,
    cnAppEndpoint
  } = t.context;
  // 1. Generate a key for "device";
  const deviceKeypassphrase = "verybadsecret";
  const { privateKeyArmored, publicKeyArmored } = await pgp.generateKey({
    userIds: [{ name: cnAppdeviceId }],
    curve: "ed25519", // ECC curve name
    passphrase: deviceKeypassphrase
  });
  //2. Get paringin token (in json format)
  const {
    body: { b64token }
  } = await agent.post(`${cnAppEndpoint}/pair/start/matrix/json`).send({
    keyPassphrase: cnAppkeyPassphrase,
    nodeDeviceId: cnAppnodeDeviceId,
    deviceId: cnAppdeviceId
  });
  const { token: tokenString, key } = JSON.parse(
    Buffer.from(b64token, "base64").toString("utf8")
  );
  const token = JSON.parse(tokenString);
  const {
    user,
    password,
    nodeDeviceId,
    deviceId,
    server,
    nodeKeyId,
    pairingEvent
  } = token;
  // Setup keys we will need
  const fingerprint = await pgpUtil.getArmoredKeyFingerPrint(publicKeyArmored);
  const decryptedPrivkeyObj = await pgpUtil.getDecryptedPrivateKeyFromArmored(
    privateKeyArmored,
    deviceKeypassphrase
  );
  // Await for pairing ACK
  const client = await getSyncMatrixClient({
    user,
    password,
    baseUrl: server,
    deviceId
  });
  // Setup lsner to node response confirming pairingæ:w
  // æ
  const pairingPromise = new Promise((res, rej) => {
    const timeOut = setTimeout(
      () => rej("Failed to get pairing response"),
      15000
    );
    client.on("toDeviceEvent", async event => {
      if (event.getType() !== pairingEvent) {
        return;
      }
      res(event.getContent());
    });
  });
  const nodeUser = user.replace("-dev", "");
  await client.sendToDevice(pairingEvent, {
    [nodeUser]: {
      [nodeDeviceId]: {
        devicePubkey: publicKeyArmored,
        deviceId,
        token,
        nodeKeyId,
        key
      }
    }
  });
  const { isValid, nodePubkey } = await pairingPromise;
  t.is(isValid, true);
  t.true(nodePubkey.startsWith("-----BEGIN PGP PUBLIC KEY BLOCK-----"));
  const nodePubkeyArmored = await pgpUtil.getPrimarykeyFromArmored(nodePubkey);

  const inboundMiddleware = async ({
    event,
    acccountUser
  }): Promise<{ reply: any; nonce: string }> => {
    const { body } = event.getContent();
    const { encryptedData, signature } = JSON.parse(body);
    const decryptyedMsg = await pgp.decrypt({
      message: await pgp.message.readArmored(encryptedData),
      privateKeys: [decryptedPrivkeyObj], // for decryption,
      publicKeys: nodePubkeyArmored
    });
    const { data: decryptedData } = decryptyedMsg;
    const verifiedSignature = await pgp.verify({
      message: await pgp.cleartext.fromText(decryptedData),
      signature: await pgp.signature.readArmored(signature),
      publicKeys: nodePubkeyArmored
    });
    const {
      signatures: [{ valid }]
    } = verifiedSignature;
    t.true(valid);
    return JSON.parse(decryptedData);
  };
  const outboundMiddleware = async (msg: string): Promise<string> => {
    const payload = JSON.parse(msg);
    const payloadToEnc = JSON.stringify({ ...payload, fingerprint });
    const encryptedMsg = await pgp.encrypt({
      message: pgp.message.fromText(payloadToEnc), // input as Message object
      detached: true,
      publicKeys: nodePubkeyArmored,
      privateKeys: [decryptedPrivkeyObj] // for signing (optional)
    });
    const { data: encryptedData, signature } = encryptedMsg;
    return JSON.stringify({ encryptedData, signature });
  };

  const transport = await cypherNodeMatrixTransport({
    nodeAccountUser: nodeUser,
    nodeDeviceId,
    client,
    inboundMiddleware,
    outboundMiddleware
  });

  const btc = _btcClient({ transport });
  const hash = await btc.getBestBlockHash();
  t.true(hash.length > 10);
});
