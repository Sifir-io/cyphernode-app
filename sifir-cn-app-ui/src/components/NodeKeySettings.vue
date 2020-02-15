<template>
  <v-card>
    <v-alert
      v-if="unlockedNodeDeviceId && unlockedNodeDeviceId.length"
      type="info"
      align="center"
      justify="center"
    >
      <b>Attention</b>: You already have setup and activated keys for device:
      '{{ unlockedNodeDeviceId }}`. You do not need to setup or create new keys
      for that node. Simply
      <v-btn to="pairing/" class="ma-3">
        Click here to pair a device now!
      </v-btn>
    </v-alert>
    <v-card-title>Encryption Keys</v-card-title>
    <v-card-subtitle>
      Sifir encrypts and signs all communication to and from Cyphernode using
      state of the art asymetic key encryption (PGP). Your keys are encrypted
      using a password so you can only use them.
    </v-card-subtitle>
    <v-card-text>
      This password will also be used to verify any change of settings you
      request to be made.
    </v-card-text>
    <v-alert v-if="error" color="red">
      {{ error }}
    </v-alert>
    <v-form :valid="formValid" ref="form">
      <v-text-field
        v-model="keyPassphrase"
        label="Enter a strong passphrase thats at least 6 characters long"
        :rules="[this.keyPassphrase.length > 6]"
        type="password"
        required
      ></v-text-field>
      <v-text-field
        v-model="keyPassphraseConfirm"
        label="Confirm your password"
        :disabled="!keyPassphrase.length"
        type="password"
        required
        :rules="[this.keyPassphrase === this.keyPassphraseConfirm]"
      ></v-text-field>

      <v-text-field
        v-model="nodeDeviceId"
        label="A name to remmber the Cyphernode installation this key is for"
        required
      ></v-text-field>
    </v-form>
    <v-card-actions>
      <v-btn :disabled="!valid" @click="genKeys">
        Make my Keys
      </v-btn>
      <slot
        name="actions"
        :unlocked="unlocked"
        :publicKeyArmored="publicKeyArmored"
      >
      </slot>
    </v-card-actions>
  </v-card>
</template>

<script>
import superagent from "superagent";
export default {
  name: "NodeKeySettings",
  data: () => ({
    formValid: false,
    keyPassphrase: "",
    keyPassphraseConfirm: "",
    nodeDeviceId: "cyphernode1",
    error: null,
    unlockedNodeDeviceId: null,
    nodeDevices: null,
    unlocked: false,
    publicKeyArmored: ""
  }),
  computed: {
    valid() {
      return this.keyPassphrase.length > 6 && this.nodeDeviceId.length > 3;
    },
    nodeIsSetup() {
      return this.nodeId && this.pubkeyArmored;
    }
  },
  async mounted() {
    const {
      body: { devices, unlockedNodeDeviceId }
    } = await superagent.post(`http://localhost:3009/setup/status/`);

    if (devices && unlockedNodeDeviceId) {
      this.nodeDevices = devices;
      this.unlockedNodeDeviceId = unlockedNodeDeviceId;
    }
  },
  methods: {
    async genKeys() {
      try {
        const { keyPassphrase, nodeDeviceId } = this;
        const { body: keyGenBody } = await superagent
          .post(`http://localhost:3009/setup/keys/gen`)
          .send({
            keyPassphrase,
            nodeDeviceId
          });
        const { publicKeyArmored } = keyGenBody;
        this.publicKeyArmored = publicKeyArmored;
        const {
          body: { unlocked }
        } = await superagent
          .post(`http://localhost:3009/setup/keys/unlock`)
          .send({
            keyPassphrase,
            nodeDeviceId
          });
        if (unlocked !== true) this.error = "Error unlocking keys";
        this.unlocked = true;
      } catch (error) {
        const {
          response: { body }
        } = error;
        const { err } = body;
        this.error = err || error;
      }
    }
  }
};
</script>
