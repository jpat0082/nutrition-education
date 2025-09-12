<template>
  <div class="events-page">
    <section class="p-3 p-md-4 border rounded-3 bg-body mb-3">
      <h1 class="h4 mb-2">Events & Locations</h1>
      <p class="text-muted mb-0">
        Find local markets and workshops. Filter by date or type, view on map, and export to your
        calendar.
      </p>
    </section>

    <section class="p-3 p-md-4 border rounded-3 bg-body mb-3">
      <div class="row gy-3 align-items-end">
        <div class="col-12 col-md-4">
          <label class="form-label small text-muted">Search</label>
          <input
            v-model.trim="q"
            class="form-control"
            placeholder="e.g., farmers, cooking, label reading…"
            aria-label="Search events"
          />
        </div>

        <div class="col-6 col-md-3">
          <label class="form-label small text-muted">From</label>
          <input v-model="from" class="form-control" type="date" aria-label="Start date filter" />
        </div>

        <div class="col-6 col-md-3">
          <label class="form-label small text-muted">To</label>
          <input v-model="to" class="form-control" type="date" aria-label="End date filter" />
        </div>

        <div class="col-12 col-md-2">
          <label class="form-label small text-muted">Type</label>
          <select v-model="kind" class="form-select" aria-label="Event type filter">
            <option value="">Any</option>
            <option value="market">Market</option>
            <option value="workshop">Workshop</option>
          </select>
        </div>

        <div class="col-12 d-flex gap-2">
          <button
            class="btn btn-primary"
            type="button"
            @click="exportICS"
            :disabled="!filtered.length"
          >
            Export visible to .ics
          </button>
          <button class="btn btn-outline-secondary" type="button" @click="resetFilters">
            Reset
          </button>
        </div>
      </div>
    </section>

    <div class="row g-3">
      <div class="col-12 col-lg-6">
        <div class="border rounded-3 overflow-hidden map-surface">
          <div
            v-if="canShowMap"
            ref="mapEl"
            class="mapbox-host"
            role="img"
            aria-label="Map showing event locations"
          ></div>
          <div v-else class="p-3">
            <h2 class="h6">Map unavailable</h2>
            <p class="small text-muted mb-0">
              No Mapbox token configured. Set <code>VITE_MAPBOX_TOKEN</code> in your
              <code>.env</code> to enable the map.
            </p>
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-6">
        <div class="border rounded-3 p-3 bg-body">
          <h2 class="h6 d-flex align-items-center gap-2">
            Events
            <span class="badge text-bg-secondary">{{ filtered.length }}</span>
          </h2>

          <ul class="list-group">
            <li class="list-group-item" v-for="ev in filtered" :key="ev.id">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <strong class="d-block">{{ ev.title }}</strong>
                  <div class="small text-muted">
                    {{ humanDate(ev) }} • {{ ev.city }}
                    <span
                      class="badge ms-1"
                      :class="ev.type === 'market' ? 'text-bg-success' : 'text-bg-info'"
                    >
                      {{ ev.type }}
                    </span>
                  </div>
                </div>
                <div class="d-flex gap-2">
                  <a
                    class="btn btn-sm btn-outline-primary"
                    :href="directionsUrl(ev)"
                    target="_blank"
                    rel="noopener"
                    >Directions</a
                  >
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    type="button"
                    @click="focusOn(ev)"
                  >
                    Focus map
                  </button>
                </div>
              </div>

              <p class="mb-1 small">{{ ev.desc }}</p>
              <div class="small text-muted">Venue: {{ ev.venue }}</div>
            </li>

            <li v-if="!filtered.length" class="list-group-item text-muted">No matching events.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
//import { ref, computed, onMounted } from 'vue'

import { ref, computed, onMounted, watchEffect } from 'vue'

let mapboxgl
const token = import.meta.env.VITE_MAPBOX_TOKEN || ''
const canShowMap = !!token
const mapEl = ref(null)
let mapInstance = null
let markers = []

const events = ref([
  {
    id: 1,
    title: 'Saturday Farmers Market',
    type: 'market',
    date: '2025-10-05T08:00:00',
    venue: 'Riverside Park',
    city: 'Melbourne',
    desc: 'Fresh produce, nutrition booth, and label-reading demo.',
    lat: -37.818,
    lng: 144.967,
  },
  {
    id: 2,
    title: 'Healthy Lunch Workshop',
    type: 'workshop',
    date: '2025-10-12T12:30:00',
    venue: 'Community Hall',
    city: 'Melbourne',
    desc: 'Hands-on prep of low-sugar, high-fibre meals.',
    lat: -37.815,
    lng: 144.973,
  },
  {
    id: 3,
    title: 'Spring Market',
    type: 'market',
    date: '2025-11-01T09:00:00',
    venue: 'Seaside Square',
    city: 'Geelong',
    desc: 'Seasonal fruits and dietitian Q&A corner.',
    lat: -38.149,
    lng: 144.36,
  },
])

const q = ref('')
const from = ref('')
const to = ref('')
const kind = ref('')

const filtered = computed(() => {
  const query = q.value.toLowerCase()
  const start = from.value ? new Date(from.value) : null
  const end = to.value ? new Date(to.value) : null

  return events.value.filter((ev) => {
    if (query) {
      const hay = `${ev.title} ${ev.desc} ${ev.city} ${ev.venue}`.toLowerCase()
      if (!hay.includes(query)) return false
    }

    if (kind.value && ev.type !== kind.value) return false

    const when = new Date(ev.date)
    if (start && when < start) return false
    if (end && when > new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59))
      return false
    return true
  })
})

function resetFilters() {
  q.value = ''
  from.value = ''
  to.value = ''
  kind.value = ''
}

function humanDate(ev) {
  const d = new Date(ev.date)
  return d.toLocaleString()
}
function directionsUrl(ev) {
  const q = encodeURIComponent(`${ev.venue}, ${ev.city}`)
  return `https://www.google.com/maps/dir/?api=1&destination=${q}`
}

onMounted(async () => {
  if (!canShowMap) return
  mapboxgl = (await import('mapbox-gl')).default
  mapboxgl.accessToken = token

  mapInstance = new mapboxgl.Map({
    container: mapEl.value,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [144.9631, -37.8136],
    zoom: 9,
  })
  mapInstance.addControl(new mapboxgl.NavigationControl({ showZoom: true }), 'top-right')

  renderMarkers()
})

function renderMarkers() {
  if (!mapInstance) return

  markers.forEach((m) => m.remove())
  markers = []

  const list = filtered.value
  if (!list.length) return

  const bounds = new mapboxgl.LngLatBounds()
  list.forEach((ev) => {
    const m = new mapboxgl.Marker()
      .setLngLat([ev.lng, ev.lat])
      .setPopup(
        new mapboxgl.Popup().setHTML(`
        <strong>${ev.title}</strong><br/>
        ${humanDate(ev)}<br/>
        ${ev.venue}, ${ev.city}
      `),
      )
      .addTo(mapInstance)
    markers.push(m)
    bounds.extend([ev.lng, ev.lat])
  })

  if (list.length > 1) mapInstance.fitBounds(bounds, { padding: 40 })
  else mapInstance.flyTo({ center: [list[0].lng, list[0].lat], zoom: 12 })
}

function focusOn(ev) {
  if (!mapInstance || !canShowMap) return
  mapInstance.flyTo({ center: [ev.lng, ev.lat], zoom: 13 })
}

watchEffect(() => {
  renderMarkers()
})

function pad(n) {
  return String(n).padStart(2, '0')
}
function dtToICS(d) {
  const yy = d.getUTCFullYear()
  const mm = pad(d.getUTCMonth() + 1)
  const dd = pad(d.getUTCDate())
  const hh = pad(d.getUTCHours())
  const mi = pad(d.getUTCMinutes())
  const ss = pad(d.getUTCSeconds())
  return `${yy}${mm}${dd}T${hh}${mi}${ss}Z`
}
function exportICS() {
  if (!filtered.value.length) return
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PUBLIC-HEALTH//Events//EN']
  filtered.value.forEach((ev) => {
    const start = new Date(ev.date)

    const end = new Date(start.getTime() + 90 * 60000)
    lines.push(
      'BEGIN:VEVENT',
      `UID:${ev.id}@public-health`,
      `DTSTAMP:${dtToICS(new Date())}`,
      `DTSTART:${dtToICS(start)}`,
      `DTEND:${dtToICS(end)}`,
      `SUMMARY:${ev.title.replace(/\n/g, ' ')}`,
      `LOCATION:${(ev.venue + ', ' + ev.city).replace(/\n/g, ' ')}`,
      `DESCRIPTION:${(ev.desc || '').replace(/\n/g, ' ')}`,
      'END:VEVENT',
    )
  })
  lines.push('END:VCALENDAR')
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'public-health-events.ics'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.map-surface {
  background: var(--bs-body-bg);
}
.mapbox-host {
  width: 100%;
  height: 420px;
}
.card,
.list-group-item {
  background-color: var(--bs-body-bg);
}
</style>
