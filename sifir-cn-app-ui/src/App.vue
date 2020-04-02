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
              <template v-if="errorConnecting">
                <v-alert>
                  Error connecting to Sifir's API at {{ sifirApiUrl }} . Please
                  check your settings
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
    ...mapMutations(["setSifirApiUrl"]),
    ...mapActions(["unlockNode", "getNodeStatus"]),
    async setApiUrl() {
      this.setSifirApiUrl(this.sifirApiUrlInput);
      try {
        this.pendingNodeReply = true;
        await this.getNodeStatus();
        this.sifirApiUrlConfirmed = true;
      } catch (err) {
        this.errorConnecting = true;
      } finally {
        this.pendingNodeReply = false;
      }
    }
  },
  data: () => ({
    pendingNodeReply: false,
    errorConnecting: false,
    sifirApiUrlConfirmed: false,
    sifirApiUrlInput: "http://localhost:3009"
  })
};
</script>
