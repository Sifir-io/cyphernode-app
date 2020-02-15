<template>
  <v-card class="mb-12" color="" height="400px" text-left>
    <v-card-title>Cyphernode Settings</v-card-title>
    <v-card-subtitle>
      Let's start by verifying your Cyphernode Settings
    </v-card-subtitle>
    <v-card-text>
      <v-form ref="form" v-model="valid" :lazy-validation="lazy">
        <v-text-field
          v-model="cnGatewayUrl"
          label="CN gateway URl"
          required
        ></v-text-field>

        <v-text-field
          v-model="cnApiKey"
          label="CN Api key to be used by Sifir"
          required
        ></v-text-field>
        <v-text-field
          v-model="cnApiKeyId"
          label="CN Api key Id"
          required
        ></v-text-field>
        <v-text-field
          v-model="cnOnionUrl"
          label="CN Onion URL"
          required
        ></v-text-field>

        <v-text-field
          v-model="cnGatekeeperCert"
          label="CN Gatekeeper Cert"
          required
        ></v-text-field>
        <v-btn
          :disabled="!valid"
          color="success"
          class="mr-4"
          @click="validate"
        >
          Validate
        </v-btn>
      </v-form>
    </v-card-text>
    <v-card-actions>
      <v-btn
        v-if="!hasKeysAndNodeId"
        :disabled="!nodeId || !keyPassphrase"
        @click="genKeys"
      >
        Make my Keys
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import superagent from "superagent";
export default {
  name: "CypherNodeSetings",
  data: () => ({
    valid: false,
    cnGatewayUrl: "",
    cnApiKey: "",
    cnApiKeyId: "",
    cnOnionUrl: "",
    cnGatekeeperCert: "",
    error: ""
  }),
  async mounted() {
    // Get inital settings
    const { body } = superagent.get(
      `${this.sifirEndpoint}:${this.sifirPort}/setup/settings`
    );
  },
  methods: {
    async validate() {
      const {
        body: { isValid, err }
      } = superagent
        .post(`${this.sifirEndpoint}:${this.sifirPort}/setup/settings`)
        .send({
          cnGatewayurl: this.cnGatewayurl,
          cnApiKey: this.cnApiKey,
          cnApiKeyId: this.cnApiKeyId
        });
      if (isValid) this.valid = true;
      else this.error = err;
    }
    //async checkCnConnection() {
    //  try {
    //    const { makeToken } = cryptoUtils();
    //    const transport = cypherNodeHttpTransport({
    //      gatewayUrl: this.cnGatewayUrl,
    //      auth: () => makeToken(this.cnApiKey, this.cnApiKeyId)
    //    });
    //    const client = btcClient({ transport });
    //    const bestBlock = await client.getBestBlockHash();
    //    if (!bestBlock || !bestBlock.length)
    //      this.error =
    //        "Failed to pull latest block from CN , please check your settings";
    //  } catch (err) {
    //    this.err = err.toString();
    //  }
    //}
  }
};
</script>
