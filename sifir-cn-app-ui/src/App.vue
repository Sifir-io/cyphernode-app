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
      <v-btn href="https://chat.sifir.io" target="_blank" text>
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
      <router-view></router-view>
    </v-content>
  </v-app>
</template>

<script>
import { mapState, mapActions } from "vuex";

export default {
  name: "App",
  mounted() {
    this.getNodeStatus();
  },
  computed: {
    ...mapState(["token", "unlockedNodeDeviceId", "unlocked"])
  },
  methods: { ...mapActions(["unlockNode", "getNodeStatus"]) },
  data: () => ({})
};
</script>
