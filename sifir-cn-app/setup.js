"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const events_1 = require("events");
const pgp = __importStar(require("openpgp"));
const stores_1 = require("./stores/");
const pgpUtil_1 = require("./util/pgpUtil");
const debug_1 = __importDefault(require("debug"));
const superagent_1 = __importDefault(require("superagent"));
const crypto_1 = require("crypto");
const constants_1 = require("./stores/constants");
const pairing_1 = require("./util/pairing");
const debug = debug_1.default("sifir:setup");
const SifirSetup = async ({ nodeStore = stores_1.nodeStore(), bridge = new events_1.EventEmitter(), sifirServer = process.env.SIFIR_PAIRING_SERVER, sifirHomeServer = process.env.SIFIR_SYNAPSE_HOMESERVER, authUtil = pairing_1.pairingUtil() } = {}) => {
    const { getSignedToken, parseSignedToken } = authUtil;
    const api = express_1.default.Router();
    let unlockedNodeDeviceId;
    // TODO make this into a proper JWT
    let accessToken;
    api.post("/status/", async (req, res, next) => {
        try {
            const { value: { nodeDeviceId, token }, error } = stores_1.setupStatusPayload.validate(req.body);
            if (error) {
                res.status(400).json({ err: error });
                return;
            }
            if (token && token !== accessToken) {
                res.status(400).json({ err: error });
                return;
            }
            // Are keys settup or not ?
            const payload = {
                devices: await nodeStore.getDevicesHavingPrivKey(),
                unlockedNodeDeviceId
            };
            if (token && nodeDeviceId) {
                payload["pairedDevices"] = await nodeStore.getPairedDevicesByPrimaryDevice(nodeDeviceId);
            }
            res.status(200).json(payload);
        }
        catch (err) {
            debug("error getting setup status", err);
            res.status(400).json({ err });
            return;
        }
    });
    api.post("/pairing/status/", async (req, res, next) => {
        const { value: { pairingId, status }, error } = stores_1.updatePairingStatus.validate(req.body);
        if (error) {
            res.status(400).json({ err: error });
            return;
        }
        try {
            await nodeStore.updatePairingIdStatus(pairingId, status);
            res.status(200).json({ pairingId });
        }
        catch (err) {
            debug("[ERROR] updating paring status", err);
            res.status(400).json({ err });
        }
    });
    api.post("/keys/gen", async (req, res, next) => {
        // TODO Can supply already existing keys
        const { value: { nodeDeviceId, keyPassphrase }, error } = stores_1.setupPayload.validate(req.body);
        if (error) {
            res.status(400).json({ err: error });
            return;
        }
        try {
            const { publicKeyArmored } = await nodeStore.makeAndSetNodeKeys(nodeDeviceId, keyPassphrase);
            bridge.emit(constants_1.appEvents.SETUP_KEYS_DONE);
            res.status(200).json({ publicKeyArmored, nodeDeviceId });
        }
        catch (err) {
            debug("error setting up", err);
            res.status(400).json({ err });
            return;
        }
    });
    api.post("/keys/unlock", async (req, res, next) => {
        const { value: { nodeDeviceId, keyPassphrase }, error } = stores_1.setupPayload.validate(req.body);
        if (error) {
            res.status(400).json({ err: error });
            return;
        }
        try {
            const { pubKey, privKey } = (await nodeStore.getDevicePgpKeys(nodeDeviceId)) || {};
            if (!pubKey || !privKey)
                throw "Node keys not found, please run setup to gen keys";
            const nodeAuthInfo = await nodeStore.getDecryptSynapseLogin(nodeDeviceId, keyPassphrase);
            bridge.emit(constants_1.appEvents.SETUP_KEYS_UNLOCKED, {
                ...nodeAuthInfo,
                nodeId: nodeDeviceId
            });
            // Generate a signed token that be used to get info about status of installation
            const { key } = await getSignedToken({ nodeDeviceId });
            unlockedNodeDeviceId = nodeDeviceId;
            accessToken = key;
            res.status(200).json({ unlocked: true, token: key });
        }
        catch (err) {
            debug("error setting up", err);
            res.status(400).json({ err });
            return;
        }
    });
    /**
     * Endpoint used to activate app's key with sifir sync ONLY if using sifir sync
     * NOTE: This is very alpha right now and is provided as an alternative when TOR is not avalible
     * Endpoints and flow are likley to change alot
     */
    api.post("/sifir/user", async (req, res, next) => {
        const { value: { nodeDeviceId, keyPassphrase }, error } = stores_1.setupPayload.validate(req.body);
        if (error) {
            res.status(400).json({ err: error });
            return;
        }
        const { pubKey: publicKeyArmored, privKey: privateKeyArmored } = (await nodeStore.getDevicePgpKeys(nodeDeviceId)) || {};
        if (!publicKeyArmored || !privateKeyArmored) {
            const err = "Cannot setup user without key, please run key setup first";
            debug(err);
            res.status(400).json({ err });
            return;
        }
        // Request user from id server
        // get nonce
        const { body: { sifirPubKey, nonce } } = await superagent_1.default.get(`${sifirServer}/legacy/register/keys`);
        const { token, key } = JSON.parse(Buffer.from(nonce, "base64").toString("utf8"));
        try {
            // sign it wiht key to use as as proof of ownership of key
            const privKeyToSign = await pgpUtil_1.getDecryptedPrivateKeyFromArmored(privateKeyArmored, keyPassphrase);
            const { signature } = await pgp.sign({
                message: await pgp.cleartext.fromText(nonce),
                privateKeys: [privKeyToSign],
                detached: true
            });
            // FIXME you need to sign the whole payload not just the nonce
            debug("Signed nonce with node key", nonce, signature, crypto_1.createHash("sha256")
                .update(publicKeyArmored)
                .digest("base64"), crypto_1.createHash("sha256")
                .update(signature)
                .digest("base64"));
            // Hash Keypassword 100000 times and user as password for network access
            const saltMainAccount = crypto_1.randomBytes(32).toString("base64");
            const saltDevicesAccount = crypto_1.randomBytes(32).toString("base64");
            const passwordMain = crypto_1.pbkdf2Sync(keyPassphrase, saltMainAccount, 100000, 64, "sha512").toString("base64");
            const passwordDevices = crypto_1.pbkdf2Sync(keyPassphrase, saltDevicesAccount, 100000, 64, "sha512").toString("base64");
            // send it off to get user nad pass
            const { body: { user } } = await superagent_1.default.post(`${sifirServer}/legacy/register/keys`).send({
                nonce,
                armoredPub64: Buffer.from(publicKeyArmored, "utf8").toString("base64"),
                passwordMain,
                passwordDevices,
                signature: Buffer.from(signature, "utf8").toString("base64")
            });
            const pubKeyObj = await pgpUtil_1.getPrimarykeyFromArmored(publicKeyArmored);
            await nodeStore.setNodeSifirUser(nodeDeviceId, user, saltMainAccount, saltDevicesAccount);
            debug("new user node setup done!", user);
            bridge.emit(constants_1.appEvents.SETUP_SIFIR_USER_DONE, {
                user,
                pass: passwordMain
            });
            res
                .status(200)
                .json({ user, saltMainAccount, saltDevicesAccount, nodeDeviceId });
        }
        catch (err) {
            const { status, response: { text } } = err;
            debug("error setting node user", status, text);
            res.status(400).json({ err });
            return;
        }
    });
    return api;
};
exports.SifirSetup = SifirSetup;
