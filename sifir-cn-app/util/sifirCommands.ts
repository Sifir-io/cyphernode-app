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
const debug = require("debug")("sifir:sifirCommands:");

const sifirCommands = ({
  // defaults to a CN transport
  transport = cypherNodeHttpTransport(),
  registry = _registry,
  bridge = new EventEmitter()
} = {}) => {
  const { getDeviceKeysByKeyId } = _nodeStore();
  const { parseSignedToken } = pairingUtil();
  // FIXME i moved this from app here, not sure if we should be lsnere here or in pairing api ?
  bridge.on(pairingEvents.RECIEVED, async pairingPayload => {
    debug("FIXME app got pairing event but will do nothing for now ??");
    await validatePairingEvent(pairingPayload);
  });
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
  const checkValidSign = ({ isValidSign }) => {
    if (isValidSign !== true) throw "Invalid request signature, buting out";
  };
  const isSifirCommand = (command: string): boolean =>
    !![
      "sifirGetLnWalletSnapshot",
      "sifirGetBtcWalletSnapshot",
      "pairing-event",
      "sync"
    ].find(cmd => cmd === command);
  const processSifirCommand = async (command: string, param: any) => {
    let reply;
    switch (command) {
      case "sifirGetLnWalletSnapshot":
        checkValidSign(param);
        reply = await getLnWalletSnapshot(param);
        break;
      case "sifirGetBtcWalletSnapshot":
        checkValidSign(param);
        reply = await getBtcWalletSnapshot(param);
        break;
      case "pairing-event":
      case "sync":
        // Part of pairing and sync is exchanging keys so we dont check device signatures here
        debug(`processing sifir-app command ${command}`);
        const validationPayload = await validatePairingEvent(param);
        if (!validationPayload) {
          reply = { err: "Invalid pairing param" };
        } else {
          reply = validationPayload;
        }
    }
    return reply;
  };
  const getLnWalletSnapshot = async param => {
    // FIXME sifirClient({transport}) should work :) and clean up this mess
    const [funds, { invoices }, { pays }] = await Promise.all([
      transport.get("ln_listfunds"),
      transport.get("ln_getinvoice"),
      transport.get("ln_listpays")
    ]);
    return { funds, invoices, pays };
  };
  const getBtcWalletSnapshot = async param => {};

  return { isSifirCommand, processSifirCommand };
};
export { sifirCommands };
