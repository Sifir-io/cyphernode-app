"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const joi_1 = __importDefault(require("@hapi/joi"));
const setupStatusPayload = joi_1.default.object().keys({
    nodeDeviceId: joi_1.default.string().pattern(/^[a-z]+[a-z0-9]{3,}$/),
    token: joi_1.default.string()
});
exports.setupStatusPayload = setupStatusPayload;
const updatePairingStatus = joi_1.default.object().keys({
    pairingId: joi_1.default.number().required(),
    status: joi_1.default.valid(0, 1).required()
});
exports.updatePairingStatus = updatePairingStatus;
const setupPayload = joi_1.default.object().keys({
    nodeDeviceId: joi_1.default
        .string()
        .pattern(/^[a-z]+[a-z0-9]{3,}$/)
        .required(),
    keyPassphrase: joi_1.default.string().required()
});
exports.setupPayload = setupPayload;
const pairingPayload = joi_1.default.object().keys({
    nodeDeviceId: joi_1.default
        .string()
        .pattern(/^[a-z]+[a-z0-9]{3,}$/)
        .required(),
    deviceId: joi_1.default
        .string()
        .pattern(/^[a-z]+[a-z0-9]{3,}$/)
        .required(),
    keyPassphrase: joi_1.default.string().required()
});
exports.pairingPayload = pairingPayload;
