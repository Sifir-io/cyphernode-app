import _api from "./api";
import { doMigrations, nodeStore as _nodeStore } from "./stores/";
import { EventEmitter } from "events";
import { getArmoredKeyFingerPrint } from "./util/pgpUtil";
import { matrixEvents, pairingEvents, appEvents } from "./stores/constants";
import * as registry from "./stores/registry";
import { sifirBridgeUtil } from "./util/bridges";

const debug = require("debug")("sifir:app");
const bridge = new EventEmitter();
const {
  getDevicePgpKeys,
  insertPairedDevice,
  setDevicePgpKeys,
  getPairedDevicesByPrimaryDevice
} = _nodeStore();
const {
  setupSifirMatrixBridge,
  startCnCommandBridge,
  setupTorBridge,
  validatePairingEvent,
  setupAndStartBridges
} = sifirBridgeUtil({ bridge, registry });

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
    await doMigrations();
  } catch (err) {
    debug("Error running migrations", err);
    process.exit();
  }
  /**
   * Setup done event
   */
  bridge.on(appEvents.SETUP_KEYS_UNLOCKED, async nodeAuthInfo => {
    debug(
      `${appEvents.SETUP_KEYS_UNLOCKED} event, sending bridge start event with node auth info.`
    );
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
  bridge.on(appEvents.SETUP_SIFIR_USER_DONE, async ({ user, pass }) => {
    debug(
      `${appEvents.SETUP_SIFIR_USER_DONE} event, sending bridge start event.`
    );
    // update node auth info with sifir auth
    registry.set("node-sifir-login", { user, pass });
    bridge.emit(matrixEvents.SIFIR_NODE_AUTH_UPDATE, { user, pass });
    await initBridgesAndPairingApi();
  });

  bridge.on(pairingEvents.RECIEVED, async pairingPayload => {
    await validatePairingEvent(pairingPayload);
  });
  /**
   * Device has been validated/paired
   */
  bridge.on(
    pairingEvents.VALIDATED,
    async ({ pairingPayload, pairingResp }) => {
      const {
        deviceId,
        devicePubkey,
        token: { eventType }
      } = pairingPayload;
      const fingerPrint = await getArmoredKeyFingerPrint(devicePubkey);
      try {
        await setDevicePgpKeys(deviceId, fingerPrint, devicePubkey);
      } catch (err) {
        debug(
          "[INFO] error inserting device keys or they already already exist"
        );
      }
      try {
        await insertPairedDevice(
          registry.get("node-id"),
          deviceId,
          fingerPrint,
          eventType
        );
        debug(
          `deviceId ${deviceId} with pubkey fingerprint ${fingerPrint} has been paired with ${registry.get(
            "node-id"
          )} using ${eventType} !`
        );
      } catch (err) {
        // TODO make a way to notify the use of this so it's better UX
        // for now must manually delete the pairing
        debug(
          "[ERROR] error inserting pairing into DB, device is possibly already paired with this node",
          err
        );
      }
      bridge.emit(pairingEvents.USER_DEVICE_VER_COMPLETED, {
        pairingPayload,
        pairingResp
      });
    }
  );
  debug(`-----------  Sifir.io  -------------`);
  debug("                                    ");
  debug("           //=======\\\\             ");
  debug("           ||       ||              ");
  debug("           ||   0   ||              ");
  debug("           ||       ||              ");
  debug("           \\\\=======//              ");
  debug("                                    ");
  const api = await _api({ bridge });
  api.enableService("setup");
  api.app.listen(process.env.SIFIR_APP_API_PORT);
  registry.set("api", api);
  debug("setup api is running, Ready to be unlocked.");
})();
