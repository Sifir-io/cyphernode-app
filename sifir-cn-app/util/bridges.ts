import * as _registry from "../stores/registry";
import { matrixEvents, pairingEvents, appEvents } from "../stores/constants";
import { nodeStore as _nodeStore } from "../stores/";
import { EventEmitter } from "events";
import {
  signedHttpBridge,
  matrixBridge as _matrixBridge,
  getSyncMatrixClient
} from "cyphernode-js-sdk-transports";
import { cypherNodeHttpTransport } from "cyphernode-js-sdk";
import { sifirMsgMiddlware } from "./msgMiddleWare";
import { pairingUtil } from "./pairing";
const debug = require("debug")("sifir:bridgeUtil:");

const sifirBridgeUtil = ({
  nodeStore = _nodeStore,
  registry = _registry,
  bridge = new EventEmitter()
} = {}) => {
  const { parseSignedToken } = pairingUtil();
  const cnTransport = cypherNodeHttpTransport();
  const {
    getDevicePgpKeys,
    setDevicePgpKeys,
    getDeviceKeysByKeyId,
    getPairedDevicesByPrimaryDevice
  } = nodeStore();
  const validatePairingEvent = async pairingPayload => {
    const { token, key } = pairingPayload;
    if (!token || !key) {
      debug("Pairing request missing token or key");
      return false;
    }
    const isValid = await parseSignedToken(token, key);
    if (isValid !== true) return false;

    debug("Pairing request validated!");
    const { deviceId, devicePubkey, nodeKeyId } = pairingPayload;
    // TODO make this into Joi schema
    if (!deviceId || !devicePubkey) {
      debug("Valid paring request is missing deviceId or devicePubkey");
      return false;
    }
    if (!nodeKeyId) {
      debug("Node KeyId for pairing is missing");
    }
    const { pubKey, deviceId: nodeDeviceId } = await getDeviceKeysByKeyId(
      nodeKeyId
    );
    if (nodeDeviceId !== registry.get("node-id")) {
      debug(
        "KeyId does not belong to node !",
        nodeDeviceId,
        registry.get("node_id"),
        pubKey
      );
      return false;
    }
    // Pairing is legit : )
    const pairingResp = { isValid: true, nodePubkey: pubKey };
    bridge.emit(pairingEvents.VALIDATED, { pairingPayload, pairingResp });
    return pairingResp;
  };
  const setupSifirMatrixBridge = async ({
    user,
    pass,
    inboundMiddleware,
    outboundMiddleware
  }: {
    user: string;
    pass: string;
  }) => {
    debug(
      `setting up sifir matrix bridge for ${user} : ${registry.get("node-id")}`
    );
    const client = await getSyncMatrixClient({
      baseUrl: process.env.SIFIR_SYNAPSE_HOMESERVER_URL,
      user: user,
      password: pass,
      deviceId: registry.get("node-id")
    });
    const matrixBridge = _matrixBridge({
      bridge,
      client,
      inboundMiddleware,
      outboundMiddleware
    });
    await matrixBridge.startBridge();
    registry.set("matrix-bridge", matrixBridge);
    registry.set("matrix-client", client);
    bridge.emit(matrixEvents.SIFIR_CLIENT_UPDATE, { client });
    debug("matrix bridge is up");
    // Finally lsn to bridge commands and link to cn
  };
  const setupTorBridge = async ({ inboundMiddleware, outboundMiddleware }) => {
    const torBridge = signedHttpBridge({
      bridge,
      inboundMiddleware,
      outboundMiddleware
    });
    registry.set(
      "tor-bridge",
      await torBridge.startBridge({
        bridgeApiPort: process.env.SIFIR_APP_TOR_BRIDGE_PORT
      })
    );
    debug("tor bridge is up");
  };
  const startCnCommandBridge = () => {
    if (registry.get("cn-cmd-bridge-setup") === true) {
      debug("cn cmd bridge already setup , skipping");
      return;
    }
    bridge.on(
      "sifirBridgeCommand",
      async ({ source, command, nonce, method, param, isValidSign }) => {
        let reply;
        debug(`got command from ${source}`, command, method, nonce);
        try {
          // intercep sifir commands here mainly for tor
          if (["pairing-event", "sync"].includes(command)) {
            debug(`processing sifir-app command ${command}`);
            const validationPayload = await validatePairingEvent(param);
            if (!validationPayload) {
              reply = { err: "Invalid pairing param" };
            } else {
              reply = { command, method, ...validationPayload };
            }
          } else {
            // cn command need to be signed
            if (isValidSign !== true)
              throw "Invalid request signature, buting out";
            switch (method) {
              case "GET":
                debug("processing cn get", command);
                reply = await cnTransport.get(command, param);
                break;
              case "POST":
                debug("processing cn post", command);
                reply = await cnTransport.post(command, param);
                break;
              default:
                debug("Unknown cn command method", method);
                return;
            }
          }
          debug(`done command from ${source}`, command, method, nonce);
        } catch (err) {
          debug(
            `error processing command from ${source}`,
            command,
            method,
            nonce,
            err
          );
          reply = { err };
        } finally {
          bridge.emit(nonce, reply);
        }
      }
    );
    debug("sifir cyphernode command bridge setup");
    registry.set("cn-cmd-bridge-setup", true);
  };
  const setupAndStartBridges = async () => {
    // Start bridges and lsn for commands
    const { privKey: decryptedPrivkeyObj, pubKey } = registry.get(
      "node-auth-info"
    );
    const msgMiddleware = sifirMsgMiddlware({ decryptedPrivkeyObj, pubKey });
    try {
      if (!registry.get("tor-bridge")) {
        await setupTorBridge({
          inboundMiddleware: msgMiddleware.httpInboundBridgeMiddleware,
          outboundMiddleware: msgMiddleware.httpOutboundBridgeMsgMiddleware
        });
      } else {
        debug("sifir tor bridge already up, skippping");
      }
    } catch (err) {
      debug("ERROR - Setting up tor bridge", err);
    }
    try {
      const { user, pass } = registry.get("node-sifir-login") || {};
      if (user && pass) {
        if (!registry.get("matrix-bridge")) {
          await setupSifirMatrixBridge({
            inboundMiddleware: msgMiddleware.matrixBridgeInboundMiddleWare,
            outboundMiddleware: msgMiddleware.matrixBridgeOutboundMiddleWare,
            user,
            pass
          });
        } else {
          debug("sifir-matrix-bridge already up, skippping");
        }
      } else {
        debug("sifir-matrix setup not detected, skipping matirx bridge");
      }
    } catch (err) {
      debug("ERROR Setting up matrix bridge", err);
    }
  };
  return {
    setupAndStartBridges,
    setupSifirMatrixBridge,
    startCnCommandBridge,
    setupTorBridge,
    validatePairingEvent
  };
};

export { sifirBridgeUtil };
