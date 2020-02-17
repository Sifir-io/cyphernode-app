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
          Thank you for downloading Sifir, if you need help just hit up the
          Slack button on the top left and i'll be happy to help you :)
        </p>
      </v-flex>

      <v-flex mb-5 xs12>
        <h2 class="headline font-weight-bold mb-3">What's next?</h2>

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
    </v-layout>
  </v-container>
</template>

<script>
import { mapState } from "vuex";
export default {
  name: "HelloWorld",

  computed: {
    ...mapState({
      token: "token",
      unlockdeNodeDeviceId: "unlockedNodeDeviceId",
      unlocked: "unlocked",
      appLinks: state => { 
	const links = [];
      }
    })
  },
  data: () => ({
    appLinks: [
      {
        text: "Setup Sifir",
        href: "/setup"
      },
      {
        text: "Pair my Phone !",
        href: "/pairing"
      }
    ],
    importantLinks: [
      {
        text: "Cyphernode",
        href: "https://github.com/SatoshiPortal/cyphernode"
      },
      {
        text: "Sifir Slack",
        href:
          "https://join.slack.com/t/sifirio/shared_invite/enQtODY4MDI5MDM3ODI0LTIwNjEyOGViZmU2MTBjZjAyMTA0NzY0OGIzZTIzZDQ1Y2E5YzY0MzcyYmU3ODU0Y2YwNzU2Njc4M2JmZmJhMmI"
      }
    ]
  })
};
</script>
