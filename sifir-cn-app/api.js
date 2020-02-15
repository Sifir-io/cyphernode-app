"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const setup_1 = require("./setup");
const pairing_api_1 = require("./pairing-api");
const express_1 = __importDefault(require("express"));
const events_1 = require("events");
const stores_1 = require("./stores/");
const body_parser_1 = __importDefault(require("body-parser"));
const pairing_1 = require("./util/pairing");
const debug_1 = __importDefault(require("debug"));
const cors_1 = __importDefault(require("cors"));
exports.default = async ({ nodeStore = stores_1.nodeStore(), authUtil = pairing_1.pairingUtil(), sifirServer = process.env.SIFIR_PAIRING_SERVER, sifirHomeServer = process.env.SIFIR_SYNAPSE_HOMESERVER, sifirHomeServerURL = process.env.SIFIR_SYNAPSE_HOMESERVER_URL, bridge = new events_1.EventEmitter(), log = debug_1.default("sifir:api-services") } = {}) => {
    const api = express_1.default();
    api.use(body_parser_1.default.json());
    api.use(cors_1.default({
        methods: ["GET", "POST", "OPTIONS"],
        origin: true,
        allowedHeaders: ["Content-Type", "Authorization", "token"],
        credentials: true
    }));
    const enabledRoutes = [];
    const enableService = async (route, serviceParam) => {
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
                const setupApi = await setup_1.SifirSetup({
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
                const pairingApi = await pairing_api_1.SifirPairingApi({
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
