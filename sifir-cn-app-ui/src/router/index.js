import Vue from "vue";
import VueRouter from "vue-router";
import HelloWord from "../views/HelloWorld";
import Pairing from "../views/Pairing";
import Setup from "../views/Setup";
Vue.use(VueRouter);

const routes = [
  {
    path: "/",
    name: "HelloWorld",
    component: HelloWord
  },
  {
    path: "/setup",
    name: "Setup",
    component: Setup
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    //component: () =>
    //  import(/* webpackChunkName: "about" */ "../views/Setup.vue")
  },
  {
    path: "/pairing",
    name: "Pairing",
    component: Pairing
  }
];

const router = new VueRouter({
  mode: "history",
  base: process.env.BASE_URL,
  routes
});

export default router;
