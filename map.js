// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1Ijoia2V2aW5zb3VkZXIiLCJhIjoiY203OXZ1MHcxMDh0bjJscTA0ZXE4czV6dyJ9.z0RoH3eUFV1hG_eTLRdKng';

// Initialize the map
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-71.09415, 42.36027],
    zoom: 12,
    minZoom: 5,
    maxZoom: 18
});

const svg = d3.select('#map').select('svg');
let stations = [];
let circles; 

function getCoords(station) { 
    const point = new mapboxgl.LngLat(+station.lon, +station.lat);
    const { x, y } = map.project(point);
    return { cx: x, cy: y };
}

// Function to update circle positions when the map moves/zooms
function updatePositions() {
    circles
        .attr('cx', d => getCoords(d).cx)
        .attr('cy', d => getCoords(d).cy);
}

// Initialize filtered data structures
// let filteredTrips = [];
let filteredArrivals = new Map();
let filteredDepartures = new Map();
let filteredStations = [];

let departuresByMinute = Array.from({ length: 1440 }, () => []);
let arrivalsByMinute = Array.from({ length: 1440 }, () => []);

function minutesSinceMidnight(date) {
    return date.getHours() * 60 + date.getMinutes();
}

let timeFilter = -1; 
let globalMaxTraffic = 1; // Store global max traffic for full dataset

function filterByMinute(tripsByMinute, minute) {
    // Normalize both to the [0, 1439] range
    // % is the remainder operator: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Remainder
    let minMinute = (minute - 60 + 1440) % 1440;
    let maxMinute = (minute + 60) % 1440;
  
    if (minMinute > maxMinute) {
      let beforeMidnight = tripsByMinute.slice(minMinute);
      let afterMidnight = tripsByMinute.slice(0, maxMinute);
      return beforeMidnight.concat(afterMidnight).flat();
    } else {
      return tripsByMinute.slice(minMinute, maxMinute).flat();
    }
  }

  function filterTripsbyTime() {
    if (timeFilter === -1) {
        filteredDepartures = departuresByMinute.flat();
        filteredArrivals = arrivalsByMinute.flat();
    } else {
        filteredDepartures = filterByMinute(departuresByMinute, timeFilter);
        filteredArrivals = filterByMinute(arrivalsByMinute, timeFilter);
    }

    // Compute arrivals and departures for filtered trips
    const departuresCount = d3.rollup(filteredDepartures, (v) => v.length, (d) => d.start_station_id);
    const arrivalsCount = d3.rollup(filteredArrivals, (v) => v.length, (d) => d.end_station_id);

    filteredStations = stations.map((station) => {
        station = { ...station }; //clone
        let id = station.short_name;
        station.arrivals = arrivalsCount.get(id) ?? 0;
        station.departures = departuresCount.get(id) ?? 0;
        station.totalTraffic = station.arrivals + station.departures;
        return station;
    });

    // **Ensure globalMaxTraffic is computed once using full dataset**
    if (timeFilter === -1) {
        globalMaxTraffic = d3.max(filteredStations, d => d.totalTraffic) || 1;
    }

    // **Use different range when filtering**
    const radiusScale = d3.scaleSqrt()
        .domain([0, globalMaxTraffic]) 
        .range(timeFilter === -1 ? [0, 25] : [4, 52]);

    // **Update circles dynamically**
    circles = svg.selectAll('circle')
        .data(filteredStations, d => d.short_name)
        .join(
            enter => enter.append('circle')
                .attr('r', d => radiusScale(d.totalTraffic))
                .attr('fill', 'steelblue')
                .attr('stroke', 'white')
                .attr('stroke-width', 1)
                .attr('opacity', 0.8)
                .on('mouseover', function(event, d) {
                    const tooltip = d3.select('#tooltip');
                    tooltip.classed('hidden', false)
                        .classed('visible', true)
                        .html(`${d.totalTraffic} trips<br>(${d.departures} departures, ${d.arrivals} arrivals)`);
                })
                .on('mousemove', function(event) {
                    const tooltip = d3.select('#tooltip');
                    tooltip.style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY - 10) + 'px');
                })
                .on('mouseout', function() {
                    d3.select('#tooltip').classed('hidden', true).classed('visible', false);
                }),
            update => update.transition().duration(500)
                .attr('r', d => radiusScale(d.totalTraffic))
        );

    updatePositions();
}

map.on('load', () => {
    // boston
    map.addSource('boston_route', {
        type: 'geojson',
        data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson?...'
    });
    map.addLayer({
        id: 'boston-bike-lanes',
        type: 'line',
        source: 'boston_route',
        paint: {
            'line-color': '#32D400',
            'line-width': 3,
            'line-opacity': 0.5
        }
    });
    // cambridge
    map.addSource('cambridge_route', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson'
    });
    map.addLayer({
        id: 'cambridge-bike-lanes',
        type: 'line',
        source: 'cambridge_route',
        paint: {
            'line-color': 'green',
            'line-width': 3,
            'line-opacity': 0.5
        }
    });

    d3.json('https://dsc106.com/labs/lab07/data/bluebikes-stations.json')
    .then(jsonData => {
        stations = jsonData.data.stations;

        d3.csv('https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv')
        .then(tripData => {
            trips = tripData;
            for (let trip of trips) {
                trip.started_at = new Date(trip.started_at);
                trip.ended_at = new Date(trip.ended_at);

                let startedMinutes = minutesSinceMidnight(trip.started_at);
                departuresByMinute[startedMinutes].push(trip);

                let endedMinutes = minutesSinceMidnight(trip.ended_at);
                arrivalsByMinute[endedMinutes].push(trip);
            }

            // Initial filtering and visualization setup
            filterTripsbyTime();

            // Reposition markers on map interactions
            map.on('move', updatePositions);
            map.on('zoom', updatePositions);
            map.on('resize', updatePositions);
            map.on('moveend', updatePositions);
        })
        .catch(error => console.error('Error loading CSV:', error));
    })
    .catch(error => console.error('Error loading JSON:', error));

// end of map.on('load')
});


document.addEventListener('DOMContentLoaded', () => {
    const timeSlider = document.getElementById('timeSlider');
    const selectedTime = document.getElementById('selectedTime');
    const anyTimeLabel = document.getElementById('anyTime');

    function formatTime(minutes) {
        const date = new Date(0, 0, 0, 0, minutes);
        return date.toLocaleString('en-US', { timeStyle: 'short' });
    }

    function updateTimeDisplay() {
        timeFilter = Number(timeSlider.value);
      
        if (timeFilter === -1) {
            selectedTime.textContent = '';
            anyTimeLabel.style.display = 'block';
        } else {
            selectedTime.textContent = formatTime(timeFilter);
            anyTimeLabel.style.display = 'none';
        }
        filterTripsbyTime();   
    }

    timeSlider.addEventListener('input', updateTimeDisplay);
    updateTimeDisplay();

// end of DOM
});
