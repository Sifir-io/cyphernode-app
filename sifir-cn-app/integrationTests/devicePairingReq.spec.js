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
const ava_1 = require("ava");
const pgp = __importStar(require("openpgp"));
const pgpUtil = __importStar(require("../util/pgpUtil"));
const superagent_1 = __importDefault(require("superagent"));
const cyphernode_js_sdk_1 = require("cyphernode-js-sdk");
const cyphernode_js_sdk_transports_1 = require("cyphernode-js-sdk-transports");
const v4_1 = __importDefault(require("uuid/v4"));
const debug = require("debug")("sifir:ava:intergration");
const test = ava_1.serial;
let roomId;
test.before(async (t) => {
    // This data is enter on the CnApp and will posted to the QR generting endpoint so
    // the Sifir CN app will then generate the data required nad present it to the phone in form of a QR code
    const cnAppkeyPassphrase = "daYw5a7Mwv3nywXOU+67avsrsNySW5EdIEkIupt3vwY";
    const cnAppnodeDeviceId = "test1";
    const cnAppdeviceId = v4_1.default().replace(/[^a-z]/gim, "");
    const cnAppEndpoint = "http://localhost:3009";
    t.context = {
        cnAppkeyPassphrase,
        cnAppnodeDeviceId,
        cnAppdeviceId,
        cnAppEndpoint
    };
});
test("Should be able able to get a pairing token, register the devices key with the cn-app and send and recieve a signed request via Tor", async (t) => {
    const { cnAppkeyPassphrase, cnAppnodeDeviceId, cnAppdeviceId, cnAppEndpoint } = t.context;
    // 1. Generate a key for "device";
    const deviceKeypassphrase = "verybadsecret";
    const { privateKeyArmored, publicKeyArmored } = await pgp.generateKey({
        userIds: [{ name: cnAppdeviceId }],
        curve: "ed25519",
        passphrase: deviceKeypassphrase
    });
    const fingerprint = await pgpUtil.getArmoredKeyFingerPrint(publicKeyArmored);
    const decryptedPrivkeyObj = await pgpUtil.getDecryptedPrivateKeyFromArmored(privateKeyArmored, deviceKeypassphrase);
    //2. Get paringin token (in json format)
    const { body: { b64token } } = await superagent_1.default.post(`${cnAppEndpoint}/pair/start/tor/json`).send({
        keyPassphrase: cnAppkeyPassphrase,
        nodeDeviceId: cnAppnodeDeviceId,
        deviceId: cnAppdeviceId
    });
    const { token: tokenString, key } = JSON.parse(Buffer.from(b64token, "base64").toString("utf8"));
    const token = JSON.parse(tokenString);
    const { onionUrl, deviceId, nodeDeviceId, nodeKeyId, eventType } = token;
    //3. Register our devices key with cn app
    const transport = cyphernode_js_sdk_1.cypherNodeHttpTransport({
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
                "content-signature": Buffer.from(`${signature};${fingerprint}`, "utf8").toString("base64")
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
    const client = cyphernode_js_sdk_1.btcClient({ transport });
    const hash = await client.getBestBlockHash();
    t.true(hash.length > 10);
});
test("Should be able to register pair and register a devices keys via Sifir servers", async (t) => {
    const { cnAppkeyPassphrase, cnAppnodeDeviceId, cnAppdeviceId, cnAppEndpoint } = t.context;
    // 1. Generate a key for "device";
    const deviceKeypassphrase = "verybadsecret";
    const { privateKeyArmored, publicKeyArmored } = await pgp.generateKey({
        userIds: [{ name: cnAppdeviceId }],
        curve: "ed25519",
        passphrase: deviceKeypassphrase
    });
    //2. Get paringin token (in json format)
    const { body: { b64token } } = await superagent_1.default.post(`${cnAppEndpoint}/pair/start/matrix/json`).send({
        keyPassphrase: cnAppkeyPassphrase,
        nodeDeviceId: cnAppnodeDeviceId,
        deviceId: cnAppdeviceId
    });
    const { token: tokenString, key } = JSON.parse(Buffer.from(b64token, "base64").toString("utf8"));
    const token = JSON.parse(tokenString);
    const { user, password, nodeDeviceId, deviceId, server, nodeKeyId, pairingEvent } = token;
    // Setup keys we will need
    const fingerprint = await pgpUtil.getArmoredKeyFingerPrint(publicKeyArmored);
    const decryptedPrivkeyObj = await pgpUtil.getDecryptedPrivateKeyFromArmored(privateKeyArmored, deviceKeypassphrase);
    // Await for pairing ACK
    const client = await cyphernode_js_sdk_transports_1.getSyncMatrixClient({
        user,
        password,
        baseUrl: server,
        deviceId
    });
    // Setup lsner to node response confirming pairingæ:w
    // æ
    const pairingPromise = new Promise((res, rej) => {
        const timeOut = setTimeout(() => rej("Failed to get pairing response"), 15000);
        client.on("toDeviceEvent", async (event) => {
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
    const inboundMiddleware = async ({ event, acccountUser }) => {
        const { body } = event.getContent();
        const { encryptedData, signature } = JSON.parse(body);
        const decryptyedMsg = await pgp.decrypt({
            message: await pgp.message.readArmored(encryptedData),
            privateKeys: [decryptedPrivkeyObj],
            publicKeys: nodePubkeyArmored
        });
        const { data: decryptedData } = decryptyedMsg;
        const verifiedSignature = await pgp.verify({
            message: await pgp.cleartext.fromText(decryptedData),
            signature: await pgp.signature.readArmored(signature),
            publicKeys: nodePubkeyArmored
        });
        const { signatures: [{ valid }] } = verifiedSignature;
        t.true(valid);
        return JSON.parse(decryptedData);
    };
    const outboundMiddleware = async (msg) => {
        const payload = JSON.parse(msg);
        const payloadToEnc = JSON.stringify({ ...payload, fingerprint });
        const encryptedMsg = await pgp.encrypt({
            message: pgp.message.fromText(payloadToEnc),
            detached: true,
            publicKeys: nodePubkeyArmored,
            privateKeys: [decryptedPrivkeyObj] // for signing (optional)
        });
        const { data: encryptedData, signature } = encryptedMsg;
        return JSON.stringify({ encryptedData, signature });
    };
    const transport = await cyphernode_js_sdk_transports_1.cypherNodeMatrixTransport({
        nodeAccountUser: nodeUser,
        nodeDeviceId,
        client,
        inboundMiddleware,
        outboundMiddleware
    });
    const btc = cyphernode_js_sdk_1.btcClient({ transport });
    const hash = await btc.getBestBlockHash();
    t.true(hash.length > 10);
});
