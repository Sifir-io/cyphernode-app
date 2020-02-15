import { SifirSetup } from "./setup";
import { SifirPairingApi } from "./pairing-api";
import { deviceVerification } from "./device-verifcation";
import express from "express";
import { EventEmitter } from "events";
import { nodeStore as _nodeStore, pairingPayload } from "./stores/";
import bodyParser from "body-parser";
import { getSyncMatrixClient } from "cyphernode-js-sdk-transports";
import { pairingUtil } from "./util/pairing";
import debug from "debug";
import cors from "cors";
interface SifirApiServices {
  app: Express.Application;
  enableService: (route: string, serviceParam?: any) => void;
}
export default async ({
  nodeStore = _nodeStore(),
  authUtil = pairingUtil(),
  sifirServer = process.env.SIFIR_PAIRING_SERVER,
  sifirHomeServer = process.env.SIFIR_SYNAPSE_HOMESERVER,
  sifirHomeServerURL = process.env.SIFIR_SYNAPSE_HOMESERVER_URL,
  bridge = new EventEmitter(),
  log = debug("sifir:api-services")
} = {}): Promise<SifirApiServices> => {
  const api = express();
  api.use(bodyParser.json());
  api.use(
    cors({
      methods: ["GET", "POST", "OPTIONS"],
      origin: true,
      allowedHeaders: ["Content-Type", "Authorization", "token"],
      credentials: true
    })
  );
  const enabledRoutes: string[] = [];
  const enableService = async (route: string, serviceParam?: any) => {
    /**
     * Enables routes on demand
     * @TODO
     *    1. Disable service functionality
     *    2 replace this hardcoded poop
     */
    if (enabledRoutes.includes(route)) {
      log(`service ${route} is already enabled, skipping`);
      return;
    }
    switch (route) {
      case "setup":
        // Setup route enabled by default
        const setupApi = await SifirSetup({
          nodeStore,
          bridge,
          sifirServer,
          sifirHomeServer
        });
        api.use("/setup", setupApi);
        enabledRoutes.push(route);
        break;
      case "pairing":
        const client = serviceParam.client || null;
        const pairingApi = await SifirPairingApi({
          bridge,
          nodeStore,
          authUtil,
          client
        });
        api.use("/pair", pairingApi);
        enabledRoutes.push(route);
        break;
    }
  };
  return { app: api, enableService };
};
