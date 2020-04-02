<template>
  <v-container>
    <v-layout text-center wrap>
      <v-flex xs12>
        <v-img
          :src="require('../assets/logo_onDarkBG_notext.png')"
          class="my-3"
          contain
          height="200"
        ></v-img>
      </v-flex>

      <v-flex mb-4>
        <h2 class="display-2 font-weight-bold mb-3">
          Welcome to Sifir
        </h2>
        <p>
          Thank you for downloading Sifir, if you need help just hit up the chat
          button on the top left and i'll be happy to help you :)
        </p>
      </v-flex>

      <!-- nothing setup -->
      <template v-if="!nodes.length">
        <v-flex mb-5 xs12>
          Looks like you're on fresh install!
        </v-flex>
        <v-flex xs12>
          <v-btn class="primary" to="/setup" large>Go to Setup</v-btn>
        </v-flex>
      </template>
      <!-- Some nodes are setup but non are active-->
      <template v-if="nodes.length && !unlockedNodeDeviceId">
        <node-unlock>
          <template v-slot:actions="unlockSlot">
            <v-alert
              type="success"
              v-if="unlockSlot.token && unlockSlot.unlockedNodeDeviceId"
            >
              {{ unlockSlot.unlockedNodeDeviceId }} unlocked and ready for
              pairing
              <v-btn
                @click="
                  setUnlockedPayload(
                    unlockSlot.unlockedNodeDeviceId,
                    unlockSlot.token
                  )
                "
                >Continue</v-btn
              >
            </v-alert>
          </template>
        </node-unlock>
      </template>
      <template v-if="nodes.length">
        <v-flex mb-5 xs12>
          <h2 class="headline font-weight-bold mb-3">
            What's next?
          </h2>
          <v-layout justify-center>
            <router-link
              v-for="(next, i) in appLinks"
              :key="i"
              :to="next.href"
              class="subheading mx-3"
            >
              {{ next.text }}
            </router-link>
          </v-layout>
        </v-flex>
        <v-flex mb-5 xs12>
          <h2 class="headline font-weight-bold mb-3">Imporant links</h2>

          <v-layout justify-center>
            <a
              v-for="(link, i) in importantLinks"
              :key="i"
              :href="link.href"
              class="subheading mx-3"
              target="_blank"
            >
              {{ link.text }}
            </a>
          </v-layout>
        </v-flex>
      </template>
    </v-layout>
  </v-container>
</template>

<script>
import NodeUnlock from "../components/NodeUnlock";
import { mapState, mapActions } from "vuex";
export default {
  name: "HelloWorld",
  components: { NodeUnlock },
  computed: {
    ...mapState([
      "nodes",
      "token",
      "unlockedNodeDeviceId",
      "unlocked",
      "sifirApiUrl"
    ])
  },
  methods: {
    ...mapActions(["setCyphernodeUrl"])
  },
  data: () => ({
    appLinks: [
      {
        text: "Setup new Keys",
        href: "/setup"
      },
      {
        text: "Pair a new Phone !",
        href: "/pairing"
      }
    ],
    importantLinks: [
      {
        text: "Sifir.io Chat and Support",
        href:
          "https://join.slack.com/t/sifirio/shared_invite/zt-b2rm2s5c-IGEo6_5hDPAhBHZIs~I9RQ"
      },
      {
        text: "Cyphernode Github",
        href: "https://github.com/SatoshiPortal/cyphernode"
      }
    ]
  })
};
</script>
