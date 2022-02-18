import Vue from 'vue'
import App from './App.vue'

import { library } from '@fortawesome/fontawesome-svg-core'
import {
  faPlay,
  faPause
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
library.add(
  faPlay,
  faPause
)
Vue.component('font-awesome-icon', FontAwesomeIcon)

import 'leaflet/dist/leaflet.css'

new Vue({
  render: h => h(App)
}).$mount('#app')
