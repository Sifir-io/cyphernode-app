"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const appEvents = {
    SETUP_KEYS_DONE: "sifir:setup_keys:done",
    SETUP_KEYS_UNLOCKED: "sifir:setup_keys:unlocked",
    SETUP_SIFIR_USER_DONE: "sifir:setup_sifir:done"
};
exports.appEvents = appEvents;
const msgTypes = {
    PAIRING_ACK: "s:pr-ack",
    PAIRING_REQ: "s:pr"
};
exports.msgTypes = msgTypes;
const pairingEvents = {
    RECIEVED: "pairing:recieved",
    STARTING: "pairing:started",
    VALIDATED: "pairing:validated",
    BRIDGE_STARTED: "pairing:bridgeup",
    DEVICE_VER_REQUEST: "pairing:deviceVer-req",
    USER_DEVICE_ROOM_INVITED: "pairing:deviceRoom-invited",
    USER_DEVICE_ROOM_ENCRYPTED: "pairing:deviceRoom-encrypted",
    USER_DEVICE_VER_COMPLETED: "pairing:deviceVer-confirm",
    USER_DEVICE_VER_MISMATCH: "pairing:deviceVer-mismatch",
    USER_DEVICE_VER_CANCELED: "pairing:deviceVer-canceled"
};
exports.pairingEvents = pairingEvents;
const userDevicePairingStatus = {
    INVITED: 1,
    JOINED: 2,
    VERIFIED: 3
};
exports.userDevicePairingStatus = userDevicePairingStatus;
const matrixEvents = {
    SIFIR_CLIENT_UPDATE: "sifir:client:updated",
    SIFIR_NODE_AUTH_UPDATE: "sifir:login:updated"
};
exports.matrixEvents = matrixEvents;
