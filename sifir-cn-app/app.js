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
const api_1 = __importDefault(require("./api"));
const stores_1 = require("./stores/");
const events_1 = require("events");
const pgpUtil_1 = require("./util/pgpUtil");
const constants_1 = require("./stores/constants");
const registry = __importStar(require("./stores/registry"));
const bridges_1 = require("./util/bridges");
const debug = require("debug")("sifir:app");
const bridge = new events_1.EventEmitter();
const { getDevicePgpKeys, insertPairedDevice, setDevicePgpKeys, getPairedDevicesByPrimaryDevice } = stores_1.nodeStore();
const { setupSifirMatrixBridge, startCnCommandBridge, setupTorBridge, 
// validatePairingEvent,
setupAndStartBridges } = bridges_1.sifirBridgeUtil({ bridge, registry });
const initBridgesAndPairingApi = async () => {
    await setupAndStartBridges();
    const client = registry.get("matrix-client");
    const api = registry.get("api");
    await api.enableService("pairing", { client });
    startCnCommandBridge();
    debug("init bridges and pairing api finished");
};
(async () => {
    try {
        await stores_1.doMigrations();
    }
    catch (err) {
        debug("Error running migrations", err);
        process.exit();
    }
    /**
     * Setup done event
     */
    bridge.on(constants_1.appEvents.SETUP_KEYS_UNLOCKED, async (nodeAuthInfo) => {
        debug(`${constants_1.appEvents.SETUP_KEYS_UNLOCKED} event, sending bridge start event with node auth info.`);
        registry.set("node-auth-info", nodeAuthInfo);
        registry.set("node-id", nodeAuthInfo.nodeId);
        const { user, pass } = nodeAuthInfo;
        if (user && pass) {
            registry.set("node-sifir-login", {
                user,
                pass
            });
        }
        await initBridgesAndPairingApi();
    });
    bridge.on(constants_1.appEvents.SETUP_SIFIR_USER_DONE, async ({ user, pass }) => {
        debug(`${constants_1.appEvents.SETUP_SIFIR_USER_DONE} event, sending bridge start event.`);
        // update node auth info with sifir auth
        registry.set("node-sifir-login", { user, pass });
        bridge.emit(constants_1.matrixEvents.SIFIR_NODE_AUTH_UPDATE, { user, pass });
        await initBridgesAndPairingApi();
    });
    bridge.on(constants_1.pairingEvents.RECIEVED, async (pairingPayload) => {
        debug("FIXME app got pairing event but will do nothing for now ??");
        // await validatePairingEvent(pairingPayload);
    });
    /**
     * Device has been validated/paired
     */
    bridge.on(constants_1.pairingEvents.VALIDATED, async ({ pairingPayload, pairingResp }) => {
        const { deviceId, devicePubkey, token: { eventType } } = pairingPayload;
        const fingerPrint = await pgpUtil_1.getArmoredKeyFingerPrint(devicePubkey);
        try {
            await setDevicePgpKeys(deviceId, fingerPrint, devicePubkey);
        }
        catch (err) {
            debug("[INFO] error inserting device keys or they already already exist");
        }
        try {
            await insertPairedDevice(registry.get("node-id"), deviceId, fingerPrint, eventType);
            debug(`deviceId ${deviceId} with pubkey fingerprint ${fingerPrint} has been paired with ${registry.get("node-id")} using ${eventType} !`);
        }
        catch (err) {
            // TODO make a way to notify the use of this so it's better UX
            // for now must manually delete the pairing
            debug("[ERROR] error inserting pairing into DB, device is possibly already paired with this node", err);
        }
        bridge.emit(constants_1.pairingEvents.USER_DEVICE_VER_COMPLETED, {
            pairingPayload,
            pairingResp
        });
    });
    debug(`-----------  Sifir.io  -------------`);
    debug("                                    ");
    debug("           //=======\\\\             ");
    debug("           ||       ||              ");
    debug("           ||   0   ||              ");
    debug("           ||       ||              ");
    debug("           \\\\=======//              ");
    debug("                                    ");
    const api = await api_1.default({ bridge });
    api.enableService("setup");
    api.app.listen(process.env.SIFIR_APP_API_PORT);
    registry.set("api", api);
    debug("setup api is running, Ready to be unlocked.");
})();
