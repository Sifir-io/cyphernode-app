"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const get = (serviceName) => {
    const { service } = services.find(({ name }) => name === serviceName) || {};
    return service;
};
exports.get = get;
const set = (name, service) => {
    services.push({ name, service });
};
exports.set = set;
const services = [];
