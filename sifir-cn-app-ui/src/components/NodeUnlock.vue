<template>
  <v-card v-if="!hasSetupNodes">
    <v-card-title>No devices have been setup!</v-card-title>
    <v-card-text>
      <v-btn to="/setup" class="primary" large>Go To Setup</v-btn>
    </v-card-text>
  </v-card>
  <v-card v-else>
    <v-card-title>Unlock and Activate your node</v-card-title>
    <v-card-subtitle>
      Sifir requires that you 'unlock' your node to modify settings and to start
      processing incoming requests.
    </v-card-subtitle>
    <v-alert
      v-if="
        () =>
          this.nodeDeviceId &&
          this.unlocked &&
          this.unlockedNodeDeviceId !== this.nodeDeviceId
      "
      color="yellow"
    >
      <b>Attention</b>: Node `{{ unlockedNodeDeviceId }}` is currently active
      and processing requests. <br />
      Sifir can only process requests for one unlocked node at a time, thus If
      you unlock another node, any requests coming devices paired to `{{
        unlockedNodeDeviceId
      }}` will stop processing.
    </v-alert>
    <v-alert v-if="error" color="red">
      Error unlocking {{ nodeDeviceId }}
      {{ error }}
    </v-alert>
    <v-form :valid="formValid" ref="form">
      <v-select
        :items="nodes"
        label="Select the node you want to unlock"
        item-text="deviceId"
        item-value="deviceId"
        v-model="nodeDeviceId"
      ></v-select>
      <v-text-field
        v-model="keyPassphrase"
        label="Enter key password for this node"
        :disabled="!nodeDeviceId"
        type="password"
        required
      ></v-text-field>
    </v-form>
    <v-card-actions>
      <v-btn :disabled="!nodeDeviceId" @click="unlockNode">
        Activate Node
      </v-btn>
      <slot
        name="actions"
        :token="token"
        :unlocked="unlocked"
        :nodeDeviceId="nodeDeviceId"
      >
        <v-alert color="green" v-if="unlocked && token">
          Node {{ nodeDeviceId }} is now unlocked and ready to use!
        </v-alert>
      </slot>
    </v-card-actions>
  </v-card>
</template>

<script>
import { mapState, mapActions, mapGetters } from "vuex";
export default {
  name: "NodeUnlock",
  data: () => ({
    formValid: false,
    keyPassphrase: "",
    nodeDeviceId: "",
    error: null
  }),
  computed: {
    ...mapState(["token", "unlockedNodeDeviceId", "unlocked", "nodes"]),
    ...mapGetters(["hasSetupNodes"]),
    valid() {
      return this.keyPassphrase.length > 6 && this.nodeDeviceId.length > 3;
    }
  },
  methods: {
    ...mapActions({
      async unlockNode(dispatch) {
        try {
          await dispatch("unlockNode", {
            keyPassphrase: this.keyPassphrase,
            nodeDeviceId: this.nodeDeviceId
          });
        } catch (err) {
          this.error =
            "Error unlocking node most likley password or connectivity issue";
        }
      }
    })
  }
};
</script>
