<template>
  <v-container>
    <v-layout text-left wrap>
      <v-flex xs12>
        <h1>Phone Pairing</h1>
      </v-flex>
      <template v-if="pairedDevices.length">
        <v-flex xs12><h2>Devices Already Paired</h2></v-flex>
        <v-flex xs12>
          <v-data-table
            v-model="tableSelectedDevice"
            :headers="tableHeaders"
            :items="pairedDevices"
            :single-select="true"
            item-key="pairingId"
            show-select
            class="elevation-1"
          >
          </v-data-table>
        </v-flex>
        <v-flex xs12 v-if="tableSelectedDevice">
          <v-btn @click="togglePairingStatus"
            >Enable/Disable pairing status</v-btn
          >
        </v-flex>
      </template>
      <v-flex xs12><h2>Pair a new device</h2></v-flex>

      <v-flex xs12 v-if="!unlockedNodeDeviceId || !token">
        <node-unlock>
          <template v-slot:actions="unlockSlot">
            <v-alert
              type="success"
              v-if="unlockSlot.token && unlockSlot.unlockedNodeDeviceId"
            >
              {{ unlockSlot.unlockedNodeDeviceId }} unlocked and ready for
              pairing
            </v-alert>
          </template>
        </node-unlock>
      </v-flex>
      <v-flex xs12 v-else>
        <v-stepper v-model="e1">
          <v-stepper-header>
            <v-stepper-step step="1">
              How do you want to connect to {{ unlockedNodeDeviceId }} ?
            </v-stepper-step>
            <v-stepper-step step="2">Scan Pairing QR</v-stepper-step>
          </v-stepper-header>

          <v-stepper-items>
            <v-stepper-content step="1">
              <v-layout row wrap>
                <v-flex md6 xs12>
                  <v-card v-if="unlockedNodeDeviceId" flat>
                    <v-card-title>A. Select a connector </v-card-title>
                    <v-card-text>
                      Sifir allows you to pair your phone using Tor or Sifir
                      servers. Both methods offer e2e encryption and
                      authentication of requests.
                      <v-list three-line>
                        <v-list-item @click="selectConnector('tor')">
                          <v-list-item-avatar>
                            <v-img src="../assets/Orbot-logo.svg.png"></v-img>
                          </v-list-item-avatar>
                          <v-list-item-content>
                            <v-list-item-title>Tor</v-list-item-title>
                            <v-list-item-subtitle>
                              Maximum anonymity, untracable, encrypted. Can be
                              slow at times, requires Orbot to be installed on
                              phone.
                            </v-list-item-subtitle>
                          </v-list-item-content>
                        </v-list-item>
                        <v-list-item @click="selectConnector('matrix')">
                          <v-list-item-avatar>
                            <v-img
                              src="../assets/logo_onDarkBG_notext.png"
                            ></v-img>
                          </v-list-item-avatar>
                          <v-list-item-content>
                            <v-list-item-title>Sifir Sync</v-list-item-title>
                            <v-list-item-subtitle>
                              "Clear net" Ip but PGP encrypted e2e, built for 2
                              way communication. Zero setup.
                            </v-list-item-subtitle>
                          </v-list-item-content>
                        </v-list-item>
                      </v-list>
                    </v-card-text>
                  </v-card>
                </v-flex>
                <v-spacer />
                <v-flex md6 xs12>
                  <v-card v-if="selectedConnector" flat>
                    <v-card-title
                      >B.
                      {{
                        selectedConnector.charAt(0).toUpperCase() +
                          selectedConnector.slice(1)
                      }}
                      `{{ unlockedNodeDeviceId }}` Pairing</v-card-title
                    >
                    <v-card-subtitle> </v-card-subtitle>
                    <v-card-text>
                      Enter a unique name to recgonize this device by followed
                      by {{ unlockedNodeDeviceId }} key's password to confirm
                    </v-card-text>
                    <v-alert v-if="error" color="red">
                      {{ error }}
                    </v-alert>
                    <v-form :valid="formValid" ref="form">
                      <v-text-field
                        v-model="deviceId"
                        label="Name the device you are pairing"
                        hint="ex: myphone"
                        required
                      ></v-text-field>
                      <v-text-field
                        v-model="keyPassphrase"
                        :label="`Enter ${unlockedNodeDeviceId} keys password`"
                        :rules="[this.keyPassphrase.length > 6]"
                        required
                        type="password"
                      ></v-text-field>
                    </v-form>
                  </v-card>
                </v-flex>
                <v-flex xs12>
                  <v-row align="center" justify="end">
                    <v-btn
                      color="primary"
                      @click="nextStep(2)"
                      :disabled="!valid"
                      >Show Pairing QR</v-btn
                    >
                  </v-row>
                </v-flex>
              </v-layout>
            </v-stepper-content>
            <v-stepper-content step="2">
              <v-row align="center" justify="center">
                <v-card v-if="error">
                  <v-alert type="error">{{ error }}</v-alert>
                  <v-card-actions>
                    <v-btn @click="nextStep(1)">Try again</v-btn>
                  </v-card-actions>
                </v-card>
                <v-card v-if="pairingInfo">
                  <v-card-title class="justify-center"
                    >Start Sifir App on your Phone and Scan this QR
                    code</v-card-title
                  >
                  <v-card-text
                    class="justify-center"
                    v-if="deviceIdIsNowPaired"
                  >
                    Device is now paired!
                  </v-card-text>
                  <v-card-text class="justify-center" v-else>
                    <qrcode-vue
                      :value="pairingInfo"
                      :size="400"
                      level="L"
                    ></qrcode-vue>
                  </v-card-text>
                  <!-- <img :src="`data:image/png;base64,${pairingInfo}`" /> -->
                  <v-card-actions class="justify-center">
                    <v-btn
                      class="primary"
                      target="_blank"
                      rel="noopener"
                      href="https://github.com/Sifir-io/sifir-mobile-wallet/releases"
                      >Download Sifir Apk for Android</v-btn
                    >
                  </v-card-actions>
                </v-card>
              </v-row>
            </v-stepper-content>
          </v-stepper-items>
        </v-stepper>
      </v-flex>
    </v-layout>
    <v-dialog v-model="loading" hide-overlay persistent width="300">
      <v-card color="primary" dark>
        <v-card-text>
          Making Magic, Stand by...
          <v-progress-linear
            indeterminate
            color="white"
            class="mb-0"
          ></v-progress-linear>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>
<script>
import superagent from "superagent";
import QrcodeVue from "qrcode.vue";
import NodeUnlock from "../components/NodeUnlock";
import { mapState, mapActions } from "vuex";
export default {
  name: "Pairing",
  components: { NodeUnlock, QrcodeVue },
  data: () => ({
    e1: 1,
    steps: 3,
    selectedConnector: "",
    keyPassphrase: "",
    deviceId: "",
    formValid: false,
    pairingInfo: null,
    error: null,
    pollInterval: null,
    loading: false,
    tableHeaders: [
      { text: "Node id", value: "primaryDeviceId" },
      { text: "Device Id", value: "secondaryDeviceId" },
      { text: "Device Fingerprint", value: "secondaryDeviceKeyId" },
      { text: "Pairing Type", value: "pairingType" },
      { text: "Pairing Status", value: "status" }
    ],
    tableSelectedDevice: null
  }),
  computed: {
    ...mapState([
      "token",
      "pairedDevices",
      "unlockedNodeDeviceId",
      "unlocked",
      "nodes"
    ]),
    valid() {
      return this.keyPassphrase.length > 6 && this.deviceId.length > 3;
    },
    deviceIdIsNowPaired() {
      if (
        !this.pairedDevices ||
        !this.pairedDevices.length ||
        !this.deviceId.length
      )
        return false;
      return this.pairedDevices.find(
        ({ deviceId }) => deviceId === this.deviceId
      );
    }
  },
  watch: {
    token(nv, ov) {
      const token = nv || undefined;
      const nodeDeviceId = this.unlockedNodeDeviceId || undefined;
      if (nv && !ov) this.getNodeStatus({ token, nodeDeviceId });
      if (nv.length) {
        if (this.pollInterval) clearInterval(this.pollInterval);
        this.pollInterval = setInterval(
          () => this.getNodeStatus({ token, nodeDeviceId }),
          3000
        );
      }
    }
  },
  beforeDestory() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  },
  beforeRouteLeave(to, from, next) {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    next();
  },
  methods: {
    ...mapActions(["getNodeStatus", "unlockNode"]),
    async togglePairingStatus() {
      this.loading = true;
      try {
        if (!this.tableSelectedDevice) return;
        const [{ pairingId, status }] = this.tableSelectedDevice;
        const newStatus = 1 - status;
        await superagent
          .post(`http://localhost:3009/setup/pairing/status`)
          .send({
            pairingId,
            status: newStatus
          });
      } catch (err) {
        this.error = err;
      } finally {
        this.loading = false;
      }
    },
    nextStep(n) {
      switch (n) {
        case 1:
          break;
        case 2:
          this.getPairingQr();
          break;
      }
      this.e1 = n;
    },
    // TODO move this to store
    selectConnector(connector) {
      this.selectedConnector = connector;
    },
    async getPairingQr() {
      this.loading = true;
      const {
        selectedConnector,
        keyPassphrase,
        unlockedNodeDeviceId,
        deviceId
      } = this;
      // register keys with sifir server
      if (selectedConnector == "matrix") {
        try {
          await superagent.post(`http://localhost:3009/setup/sifir/user`).send({
            keyPassphrase,
            nodeDeviceId: unlockedNodeDeviceId
          });
          // TODO hack job to give sifir node time to intiiliaze matrix client
          // make this into an event
          await new Promise((res, rej) => setTimeout(res, 1000));
        } catch (err) {
          // probably already setup, so just continue. it will error out on next step if someting worse
        }
      }
      try {
        this.error = null;
        const {
          body: { b64token }
        } = await superagent
          .post(`http://localhost:3009/pair/start/${selectedConnector}/json`)
          .send({
            keyPassphrase,
            nodeDeviceId: unlockedNodeDeviceId,
            deviceId
          });
        this.pairingInfo = b64token;
      } catch (error) {
        const {
          response: { body }
        } = error;
        const { err } = body;
        this.error = err || error;
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
