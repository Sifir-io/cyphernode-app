<template>
  <v-container>
    <v-layout text-left wrap>
      <v-flex xs12>
        <h2>Sifir Setup</h2>
      </v-flex>
      <v-flex xs12>
        <v-stepper v-model="e1">
          <v-stepper-header>
            <v-stepper-step step="1">
              Encryption and Keys
            </v-stepper-step>
            <v-stepper-step step="2">Done!</v-stepper-step>
          </v-stepper-header>

          <v-stepper-items>
            <v-stepper-content step="1">
              <node-key-settings>
                <template v-slot:actions="keySlot">
                  <v-btn
                    v-if="keySlot.publicKeyArmored"
                    class="primary"
                    to="pairing/"
                    :disabled="!keySlot.unlocked"
                  >
                    Keys generated. Click to continue to pairing!
                  </v-btn>
                </template>
              </node-key-settings>
            </v-stepper-content>
            <v-stepper-content step="2">
              <v-alert type="success">
                Setup is done!
                <router-link to="pairing/" class="subheading mx-3">
                  Pair your phone now!
                </router-link>
              </v-alert>
            </v-stepper-content>
          </v-stepper-items>
        </v-stepper>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import NodeKeySettings from "../components/NodeKeySettings";
export default {
  name: "Setup",
  components: { NodeKeySettings },
  data: () => ({
    e1: 1,
    steps: 3
  }),
  watch: {
    steps(val) {
      if (this.e1 > val) {
        this.e1 = val;
      }
    }
  },
  computed: {},
  methods: {
    nextStep(n) {
      switch (n) {
        case 1:
          if (!this.hasKeysAndNodeId) return;
          break;
      }
      this.e1 = n;
    }
  }
};
</script>
