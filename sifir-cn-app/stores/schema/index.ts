import joi from "@hapi/joi";
const setupStatusPayload = joi.object().keys({
  nodeDeviceId: joi.string().pattern(/^[a-z]+[a-z0-9]{3,}$/),
  token: joi.string()
});
const updatePairingStatus = joi.object().keys({
  pairingId: joi.number().required(),
  status: joi.valid(0, 1).required()
});

const setupPayload = joi.object().keys({
  nodeDeviceId: joi
    .string()
    .pattern(/^[a-z]+[a-z0-9]{3,}$/)
    .required(),
  keyPassphrase: joi.string().required()
});
const pairingPayload = joi.object().keys({
  nodeDeviceId: joi
    .string()
    .pattern(/^[a-z]+[a-z0-9]{3,}$/)
    .required(),
  deviceId: joi
    .string()
    .pattern(/^[a-z]+[a-z0-9]{3,}$/)
    .required(),
  keyPassphrase: joi.string().required()
});

export {
  setupStatusPayload,
  setupPayload,
  pairingPayload,
  updatePairingStatus
};
