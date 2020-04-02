<template>
  <v-app>
    <v-app-bar app dark>
      <div class="d-flex align-center">
        <router-link to="/">
          <v-img
            alt="Sifir.io logo"
            class="shrink mr-2"
            contain
            src="./assets/logo_onDarkBG.png"
            transition="scale-transition"
            width="200"
          />
        </router-link>
      </div>

      <v-spacer></v-spacer>
      <v-btn v-if="connectedSuccess" @click="toggleEndpointDialog" text>
        <span class="mr-2">Connected: {{ sifirApiUrl }} </span>
        <v-icon>mdi-acccount-box</v-icon>
      </v-btn>
      <v-btn
        href="https://join.slack.com/t/sifirio/shared_invite/zt-b2rm2s5c-IGEo6_5hDPAhBHZIs~I9RQ"
        target="_blank"
        text
      >
        <span class="mr-2">Chat and Support</span>
        <v-icon>mdi-open-in-new</v-icon>
      </v-btn>

      <v-btn
        href="https://github.com/Sifir-io/cyphernode-app"
        target="_blank"
        text
      >
        <span class="mr-2">Github</span>
        <v-icon>mdi-open-in-new</v-icon>
      </v-btn>
    </v-app-bar>
    <v-dialog v-model="endpointDialog" max-width="290">
      <v-card>
        <v-card-title class="headline">Change Sifir Endpoint?</v-card-title>

        <v-card-text>
          UI is currently commmunicating with Sifir APP located @
          {{ sifirApiUrl }}
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>

          <v-btn color="green darken-1" text @click="resetUI">
            Change API Instance
          </v-btn>

          <v-btn color="green darken-1" text @click="resetUI">
            Lock UI
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-content>
      <template v-if="!sifirApiUrlConfirmed">
        <v-container>
          <v-layout text-center wrap>
            <v-flex xs12>
              <v-text-field
                v-model="sifirApiUrlInput"
                label="URL where Sifir API is located"
                required
              ></v-text-field>
              <v-btn @click="setApiUrl">Connect</v-btn>
              <template v-if="pendingNodeReply">
                <v-progress-linear
                  indeterminate
                  color="yellow darken-2"
                ></v-progress-linear>
                Connecting to Sifir API @ {{ sifirApiUrl }}...
              </template>
              <template v-if="connectionErr">
                <v-alert type="error">
                  Error connecting to Sifir's API at {{ sifirApiUrl }} . Please
                  check your settings
                  {{ connectionErr }}
                </v-alert>
              </template>
            </v-flex>
          </v-layout>
        </v-container>
      </template>
      <template v-else>
        <router-view></router-view>
      </template>
    </v-content>
  </v-app>
</template>

<script>
import { mapState, mapActions, mapMutations } from "vuex";

export default {
  name: "App",
  async mounted() {},
  computed: {
    ...mapState(["token", "unlockedNodeDeviceId", "unlocked", "sifirApiUrl"])
  },
  methods: {
    ...mapMutations(["setSifirApiUrl", "resetState"]),
    ...mapActions(["unlockNode", "getNodeStatus"]),
    resetUI() {
      this.sifirApiUrlConfirmed = false;
      this.resetState();
    },
    async setApiUrl() {
      this.setSifirApiUrl(this.sifirApiUrlInput);
      try {
        this.pendingNodeReply = true;
        await this.getNodeStatus();
        this.sifirApiUrlConfirmed = true;
        this.connectedSuccess = true;
      } catch (err) {
        this.connectionErr = err;
      } finally {
        this.pendingNodeReply = false;
      }
    },
    toggleEndpointDialog() {
      this.endpointDialog = !this.endpointDialog;
    }
  },
  data: () => ({
    endpointDialog: false,
    pendingNodeReply: false,
    connectedSuccess: false,
    connectionErr: null,
    sifirApiUrlConfirmed: false,
    sifirApiUrlInput: "http://localhost:3009"
  })
};
</script>
