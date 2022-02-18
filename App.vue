<template>
  <div>
    <div class="row">
      <div class="col-md-3">
        <h2>What is this?</h2>
        <p>This map shows average property values in Baltimore City over time. Each frame of the animation represents the average property values for the 12 months leading up to the month indicated</p>
        <p>Check out <a href="/blog/geocoded-property-sales-data-real-estate-investing">this article</a> to learn more about how this tool was created</p>
      </div>
      <div class="col-md">
        <div class="map-container">
          <div class="chart-mask" v-if="!loaded">
            <div v-if="!errorMessage" class="loading-icon">
              <div class="spinner-border" role="status">
              </div>
            </div>
            <div class="help-text">
              <h2 v-if="errorMessage">{{ errorMessage }}</h2>
              <h2 v-else>Loading Data</h2>
            </div>
          </div>
          <div class="row no-gutters">
            <div class="col-auto animation-control">
              <button :disabled="!loaded" @click="animationEnabled = !animationEnabled" class="btn btn-secondary">
                <font-awesome-icon v-if="!animationEnabled" icon="play" />
                <font-awesome-icon v-if="animationEnabled" icon="pause" />
              </button>
            </div>
            <div class="col">
              <div class="month-indicator">
                <div
                  class="month-progress"
                  :style="{
                    width: progressWidth,
                    transition: progressTransition,
                    '-webkit-transition': progressTransition /* Safari */
                  }"
                ></div>
                <div class="month-heading">
                  {{ currentFrameMonthUserFriendly }}
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="legend">
                <span class="left-label">Low</span>
                <span class="right-label">High</span>
              </div>
            </div>
          </div>
          <div id="property-heat-map" ref="property-heat-map"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import L from 'leaflet'
import 'leaflet.heat'
import * as d3 from 'd3-scale'

export default {

  data () {
    return {
      maxValue: 0,
      monthsToGet: 17,
      currentFrame: 0,
      animationEnabled: false,
      animationInterval: null,
      timeBetweenFrames: 800,
      loaded: false,
      salesAverages: {},
      salesByMonth: null,
      errorMessage: null,
      months: {
        1: 'January',
        2: 'February',
        3: 'March',
        4: 'April',
        5: 'May',
        6: 'June',
        7: 'July',
        8: 'August',
        9: 'September',
        10: 'October',
        11: 'November',
        12: 'December'
      }
    }
  },

  computed: {

    numberOfFrames () {
      return this.salesMonths.length
    },

    salesMonths () {
      return this.salesByMonth !== null ? Object.keys(this.salesByMonth).sort() : []
    },

    currentFrameData () {
      return this.salesByMonthScaled[this.salesMonths[this.currentFrame]]
    },

    progressPercent () {
      return parseInt(this.currentFrame / (this.numberOfFrames - 1) * 100)
    },

    progressWidth () {
      if (!this.animationEnabled || this.progressPercent === 0) {
        return this.progressPercent + '%'
      } else {
        return '100%'
      }
    },

    progressTransition () {
      let framesRemaining = this.numberOfFrames - (this.currentFrame + 1)
      let duration = this.timeBetweenFrames * framesRemaining
      if (!this.animationEnabled || this.currentFrame === 0) {
        return 'none'
      } else {
        return 'width ' + duration + 'ms linear'
      }
    },

    currentFrameMonthUserFriendly () {
      if (this.loaded) {
        let parts = this.salesMonths[this.currentFrame].split('-')
        return parts[0] + ' ' + this.months[parseInt(parts[1])]
      } else {
        return ''
      }
    },

    priceScale () {
      return d3.scaleLinear().domain([0, 1500000]).range([0, 1])
    },

    salesByMonthScaled () {
      let scaled = {}
      this.salesMonths.forEach(salesMonth => {
        if (!(salesMonth in scaled)) scaled[salesMonth] = []
        let averages = this.salesByMonth[salesMonth]
        averages.forEach(average => {
          scaled[salesMonth].push([
            average[0],
            average[1],
            this.priceScale(average[2])
          ])
        })
      })
      return scaled
    }
  },

  watch: {
    loaded () {
      this.initHeat()
      this.animationEnabled = true
    },

    animationEnabled (isEnabled, wasEnabled) {
      if (!wasEnabled && isEnabled) {
        this.startAnimation()
      }
    }
  },

  methods: {

    initMap () {
      var baseLayer = L.tileLayer(
        'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a>',
          maxZoom: 13
        }
      )

      this.propertyHeatMap = new L.Map('property-heat-map', {
        center: new L.LatLng(39.3, -76.612),
        zoom: 13,
        layers: [baseLayer]
      })
    },

    initHeat () {
      this.heatMapLayer = L.heatLayer([], {
        minOpacity: 0.3,
        radius: 15,
        blur: 20,
        gradient: {
          0.55: 'orange',
          0.7: 'purple'
        }
      })
        .addTo(this.propertyHeatMap)
    },

    getDateString (date) {
      let day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate()
      let month = date.getMonth() < 9 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1
      return date.getFullYear() + '-' + month + '-' + day
    },

    startAnimation () {
      this.drawNextFrame()
      this.animationInterval = setInterval(() => {
        if (!this.animationEnabled) {
          clearInterval(this.animationInterval)
        } else {
          this.currentFrame++
          if (this.currentFrame >= this.numberOfFrames) {
            this.currentFrame = 0
          }
          this.drawNextFrame()
        }
      }, this.timeBetweenFrames)
    },

    stopAnimation () {
      this.animationEnabled = false
    },

    drawNextFrame () {
      this.heatMapLayer.setLatLngs(this.currentFrameData)
    },

    loadSalesByMonth () {
      this.errorMessage = null
      this.loaded = false

      axios.get('/api/md_sales_averages')
        .then(response => {
          this.salesByMonth = response.data
          this.loaded = true
        })
        .catch(() => {
          this.errorMessage = "Failed to load data :("
          this.loaded = true
        })
    }
  },

  mounted () {
    this.initMap()
  },

  created () {
    this.loadSalesByMonth()
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
#property-heat-map {
  height: 80vh;
}

.map-container {
  position: relative;
  margin-bottom: 20px;
}

.animation-control {
  padding: 15px 10px 10px 0px;
}

.legend {
  background: linear-gradient(90deg, orange 0%, purple);
  color: white;
  min-width: 200px;
  margin-top: 1em;
  margin-bottom: 1em;
  padding: 5px 10px;
}

.legend .right-label{
  float: right;
}

.month-indicator {
  position: relative;
  margin-right: 10px;
}

.month-indicator .month-heading {
  margin-top: 18px;
  padding-bottom: 3px;
}

.month-heading {
  margin-bottom: 0px;
  font-size: 1.5rem;
}

.month-progress {
  position: absolute;
  bottom: 0;
  height: 2px;
  width: 0%;
  background: lightslategrey;
}

.chart-mask {
  background: #fafafacc;
  position: absolute;
  z-index: 500;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;

  .loading-icon {
    position: absolute;
    top: 45%;
    left: 50%;
  }

  .help-text {
    position: absolute;
    width: 100%;
    text-align: center;
    top: 50%;
  }
}
</style>
