import { cryptoUtils } from "cyphernode-js-sdk";
import _debug from "debug";
import uuid from "uuid/v4";
import { pairingEvents, msgTypes } from "../stores/constants/index";
import { nodeStore as _nodeStore } from "../stores";
const debug = _debug("sifir:pairing");
const nodeStore = _nodeStore();
const { hmacSHA256Hex } = cryptoUtils();
import { randomBytes } from "crypto";
const sessionSecret = randomBytes(64).toString("hex");
const pairingUtil = ({
  tokenSigningSecret = process.env.SIFIR_API_PAIRING_SECRET || sessionSecret
} = {}) => {
  const parseSignedToken = async (
    token: any,
    key: string,
    tokenExpiry = process.env.SIFIR_API_PAIRING_KEY_EXPIRY || 30000
  ) => {
    try {
      const { timestamp } = token;
      if (timestamp > Date.now()) return false;
      if (Date.now() - parseInt(timestamp) > tokenExpiry) return false;
      const { key: validKey } = await getSignedToken(
        token,
        parseInt(timestamp)
      );
      if (key === validKey) return true;
    } catch (err) {
      debug("error parsing key", err);
      return false;
    }
    return false;
  };
  const getSignedToken = async (
    token: object,
    timestamp: number = Date.now()
  ): Promise<{ token: string; timestamp: number; key: string }> => {
    const tokenString = JSON.stringify({ ...token, timestamp });
    return {
      token: tokenString,
      timestamp,
      key: await hmacSHA256Hex(tokenString, tokenSigningSecret)
    };
  };
  return {
    getSignedToken,
    parseSignedToken
  };
};

const matrixPairingUtil = ({ client, bridge }) => {
  const sifirHomeServerURL = process.env.SIFIR_SYNAPSE_HOMESERVER_URL;
  const _createAndBindPairingEvent = async () => {
    const pairingEvent = `${msgTypes.PAIRING_REQ}:${uuid()}`;
    debug("created pairing event", pairingEvent);
    // FIXME send a second key that does not have the password as part of it's hash!
    client.on("toDeviceEvent", async event => {
      if (event.getType() !== pairingEvent) {
        return;
      }
      const pairingPayload = {
        ...event.getContent(),
        user: event.getSender()
      };
      debug("matrix::Got pairing request", {
        ...pairingPayload
      });
      bridge.emit(pairingEvents.RECIEVED, pairingPayload);
    });

    return pairingEvent;
  };
  const getPairingToken = async (
    nodeDeviceId: string,
    keyPassphrase: string
  ) => {
    const {
      devicesUser,
      devicesPassword,
      pubKey
    } = await nodeStore.getDecryptSynapseLogin(nodeDeviceId, keyPassphrase);
    const pairingEvent = await _createAndBindPairingEvent();
    return {
      // Schema we have now, could change in future
      user: devicesUser,
      password: devicesPassword,
      server: sifirHomeServerURL,
      pairingEvent
    };
  };

  return { getPairingToken };
};
export { pairingUtil, matrixPairingUtil };
