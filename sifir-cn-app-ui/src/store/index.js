import Vue from "vue";
import Vuex from "vuex";
import agent from "superagent";
Vue.use(Vuex);
const defaultState = () => ({
  token: "",
  nodes: [],
  sifirApiUrl: "http://localhost:3009",
  unlocked: false,
  unlockedNodeDeviceId: "",
  pairedDevices: []
});
export default new Vuex.Store({
  state: defaultState(),
  mutations: {
    setPairedDevices(state, pairedDevices) {
      state.pairedDevices = pairedDevices;
    },
    setSifirApiUrl(state, url) {
      console.log("called with", url);
      Object.assign(state, {
        ...defaultState(),
        sifirApiUrl: url
      });
    },
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
      { commit, state: { sifirApiUrl } },
      { token = null, nodeDeviceId = null } = {}
    ) {
      const {
        body: { pairedDevices, devices, unlockedNodeDeviceId }
      } = await agent.post(`${sifirApiUrl}/setup/status/`).send({
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

      if (pairedDevices) {
        commit("setPairedDevices", pairedDevices);
      }
    },
    async unlockNode(
      { commit, state: { sifirApiUrl } },
      { keyPassphrase, nodeDeviceId }
    ) {
      const {
        body: { unlocked, token }
      } = await agent.post(`${sifirApiUrl}/setup/keys/unlock`).send({
        keyPassphrase,
        nodeDeviceId
      });
      if (unlocked !== true) throw "Error unlocking keys";
      commit("setUnlocked", {
        unlockedStatus: true,
        unlockedNodeDeviceId: nodeDeviceId
      });
      commit("setToken", token);
    }
  },
  getters: {
    hasSetupNodes(state) {
      return state.nodes && state.nodes.length;
    }
  }
});
