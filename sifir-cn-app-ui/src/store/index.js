import Vue from "vue";
import Vuex from "vuex";
import agent from "superagent";
Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    token: "",
    nodes: [],
    unlocked: false,
    unlockedNodeDeviceId: ""
  },
  mutations: {
    setToken(state, token) {
      state.token = token;
    },
    setNodes(state, nodes) {
      state.nodes = nodes;
    },
    setUnlocked(state, { unlockedStatus, unlockedNodeDeviceId = null }) {
      state.unlocked = unlockedStatus;
      if (unlockedNodeDeviceId)
        state.unlockedNodeDeviceId = unlockedNodeDeviceId;
    }
  },
  actions: {
    async getNodeStatus(
      { commit },
      { token = null, nodeDeviceId = null } = {}
    ) {
      const {
        body: { devices, unlockedNodeDeviceId }
      } = await agent.post(`http://localhost:3009/setup/status/`).send({
        nodeDeviceId: nodeDeviceId || undefined,
        token: token || undefined
      });

      if (devices) {
        commit("setNodes", devices);
      }

      if (unlockedNodeDeviceId) {
        commit("setUnlocked", {
          unlockedStatus: true,
          unlockedNodeDeviceId
        });
      }
    },
    async unlockNode({ commit }, { keyPassphrase, nodeDeviceId }) {
      const {
        body: { unlocked, token }
      } = await agent.post(`http://localhost:3009/setup/keys/unlock`).send({
        keyPassphrase,
        nodeDeviceId
      });
      if (unlocked !== true) throw "Error unlocking keys";
      commit("setUnlocked", {
        unlocked: true,
        unlockedNodeDeviceId: nodeDeviceId
      });
      commit("setToken", token);
    }
  },
  getters: {
    hasSetupNodes() {
      return this.nodes && this.nodes.length;
    }
  }
});
