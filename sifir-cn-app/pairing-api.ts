import { matrixEvents, msgTypes, pairingEvents } from "./stores/constants";
import express from "express";
import qr from "qr-image";
import _debug from "debug";
import { EventEmitter } from "events";
import { pairingUtil, matrixPairingUtil } from "./util/pairing";
import { nodeStore as _nodeStore, pairingPayload } from "./stores/";
import bodyParser from "body-parser";
import { getDecryptedPrivateKeyFromArmored } from "./util/pgpUtil";
const debug = _debug("sifir:pairing-api");

const SifirPairingApi = async ({
  nodeStore = _nodeStore(),
  authUtil = pairingUtil(),
  acceptedPairingTypes = ["tor", "matrix"],
  bridge = new EventEmitter(),
  client = null
} = {}): Promise<Express.Application> => {
  const { getSignedToken, parseSignedToken } = authUtil;
  const api = express.Router();
  // TODO i feel this is monkey shit hacking that breaks the pattern of data flow. To be fixed next iteration
  bridge.on(matrixEvents.SIFIR_CLIENT_UPDATE, ({ client: updatedClient }) => {
    debug(`got ${matrixEvents.SIFIR_CLIENT_UPDATE} event, updating client`);
    client = updatedClient;
  });
  bridge.on(
    pairingEvents.USER_DEVICE_VER_COMPLETED,
    async ({ pairingPayload, pairingResp }) => {
      const {
        deviceId,
        user,
        token: { pairingEvent, eventType }
      } = pairingPayload;
      switch (eventType) {
        case "matrix":
          if (client) {
            debug(
              `got ${pairingEvents.USER_DEVICE_VER_COMPLETED} for matrix, sending device confirmation msg`
            );
            await client.sendToDevice(pairingEvent, {
              [user]: {
                [deviceId]: {
                  ...pairingResp
                }
              }
            });
          }

          break;
      }
    }
  );

  // Setup pairing recieved event manager
  // individual bridges are responsible for emitting a briding recieved event

  // TODO Although this all runs locally on the users PC
  // it would be much better to have the salt2 sent to the user app, where it hashed with keytpassphrase to get
  // the password for the phone
  api.post("/start/:eventType/:output?", async (req, res, next) => {
    const {
      value: { keyPassphrase, nodeDeviceId, deviceId },
      error
    } = pairingPayload.validate(req.body);
    const { eventType, output } = req.params;
    if (error) {
      res.status(400).json({ err: error });
      return;
    }
    if (!acceptedPairingTypes.includes(eventType)) {
      res.status(400).json({ err: "Invalid eventtype", eventType });
      return;
    }

    try {
      let pairingToken;
      const { pubKey, privKey, keyId } =
        (await nodeStore.getDevicePgpKeys(nodeDeviceId)) || {};
      if (!pubKey || !privKey) throw "Node keys not set or wrong node id";
      // test to make sure password isvalid
      const privKeyToSign = await getDecryptedPrivateKeyFromArmored(
        privKey,
        keyPassphrase
      );
      switch (eventType) {
        case "matrix":
          if (!client) {
            throw "Matrix client was not passed to pairing-api , please make sure you ran setup for a sifir user";
          }
          const matrixPairing = matrixPairingUtil({
            client,
            bridge
          });
          pairingToken = {
            ...(await matrixPairing.getPairingToken(
              nodeDeviceId,
              keyPassphrase
            )),
            nodeDeviceId,
            nodeKeyId: keyId,
            eventType
          };
          break;

        case "tor":
          pairingToken = {
            onionUrl: `${process.env.CYPHERNODE_ONION_URL}/sifir/`,
            nodeDeviceId,
            nodeKeyId: keyId,
            eventType
          };
          break;
        default:
          throw "Event type is poop";
      }
      const signedToken = await getSignedToken(pairingToken);
      const base64Token = Buffer.from(
        JSON.stringify({ ...signedToken })
      ).toString("base64");
      switch (output) {
        case "json":
          res.status(200).json({ b64token: base64Token });
          return;
          break;
        case "qr":
        default:
          const qrPngBuffer = qr.imageSync(base64Token, {
            type: "png"
          });
          const pngBase64Image = Buffer.from(qrPngBuffer, "base64");
          res.writeHead(200, {
            "Content-Type": "image/png",
            "Content-Length": pngBase64Image.length
          });
          res.end(pngBase64Image);
          break;
      }
    } catch (err) {
      debug("error genering pairing payload", err);
      res.status(400).json({ err });
      return;
    }
    next();
  });

  return api;
};

export { SifirPairingApi };
