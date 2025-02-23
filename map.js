// 5.3 SAFTEY
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.14.1/+esm';


// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1Ijoia2V2aW5zb3VkZXIiLCJhIjoiY203OXZ1MHcxMDh0bjJscTA0ZXE4czV6dyJ9.z0RoH3eUFV1hG_eTLRdKng';

// Initialize the map
const map = new mapboxgl.Map({
    container: 'map', // ID of the div where the map will render
    style: 'mapbox://styles/mapbox/streets-v12', // Map style
    // style: 'mapbox://styles/mapbox/navigation-day-v1', // alternative map style
    center: [-71.09415, 42.36027], // [longitude, latitude]
    zoom: 12, // Initial zoom level
    minZoom: 5, // Minimum allowed zoom
    maxZoom: 18 // Maximum allowed zoom
});

const svg = d3.select('#map').select('svg');
let circles; // Declare circles in a higher scope from step 3.3

function getCoords(station) { // map.project is built into mapboxgl
    const point = new mapboxgl.LngLat(+station.lon, +station.lat);  // Convert lon/lat to Mapbox LngLat
    const { x, y } = map.project(point);  // Project to pixel coordinates
    return { cx: x, cy: y };  // Return as object for use in SVG attributes
}

// Function to update circle positions when the map moves/zooms
function updatePositions() {
    circles
        .attr('cx', d => getCoords(d).cx)  // Set the x-position using projected coordinates
        .attr('cy', d => getCoords(d).cy); // Set the y-position using projected coordinates
}

function computeStationTraffic(stations, timeFilter = -1) {
    const departures = d3.rollup(
        filterByMinute(departuresByMinute, timeFilter),
        (v) => v.length,
        (d) => d.start_station_id);

    const arrivals = d3.rollup(
        filterByMinute(arrivalsByMinute, timeFilter),
        (v) => v.length,
        (d) => d.end_station_id);

    return stations.map((station) => {
        let id = station.short_name;
        station.arrivals = arrivals.get(id) ?? 0;
        station.departures = departures.get(id) ?? 0;
        station.totalTraffic = station.arrivals + station.departures;
        return station;
    });
}
function formatTime(minutes) {
    const date = new Date(0, 0, 0, 0, minutes);  // Set hours & minutes
    return date.toLocaleString('en-US', { timeStyle: 'short' }); // Format as HH:MM AM/PM
}

function minutesSinceMidnight(date) {
    return date.getHours() * 60 + date.getMinutes();
}

// function filterTripsbyTime(trips, timeFilter) {
// return timeFilter === -1 
//     ? trips // If no filter is applied (-1), return all trips
//     : trips.filter((trip) => {
//         // Convert trip start and end times to minutes since midnight
//         const startedMinutes = minutesSinceMidnight(trip.started_at);
//         const endedMinutes = minutesSinceMidnight(trip.ended_at);
        
//         // Include trips that started or ended within 60 minutes of the selected time
//         return (
//         Math.abs(startedMinutes - timeFilter) <= 60 ||
//         Math.abs(endedMinutes - timeFilter) <= 60
//         );
//     });
// }
function filterByMinute(tripsByMinute, minute) {
    if (minute === -1) {
      return tripsByMinute.flat(); // No filtering, return all trips
    }
  
    // Normalize both min and max minutes to the valid range [0, 1439]
    let minMinute = (minute - 60 + 1440) % 1440;
    let maxMinute = (minute + 60) % 1440;
  
    // Handle time filtering across midnight
    if (minMinute > maxMinute) {
      let beforeMidnight = tripsByMinute.slice(minMinute);
      let afterMidnight = tripsByMinute.slice(0, maxMinute);
      return beforeMidnight.concat(afterMidnight).flat();
    } else {
      return tripsByMinute.slice(minMinute, maxMinute).flat();
    }
  }

let departuresByMinute = Array.from({ length: 1440 }, () => []);
let arrivalsByMinute = Array.from({ length: 1440 }, () => []);

map.on('load',async () => { 
    map.addSource('boston_route', {
        type: 'geojson',
        data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson?...'
    });
    // boston
    map.addLayer({
        id: 'boston-bike-lanes', // unique identifier for the layer
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
        id: 'cambridge-bike-lanes', // unique identifier for the layer
        type: 'line',
        source: 'cambridge_route',
        paint: {
            'line-color': 'green',
            'line-width': 3,
            'line-opacity': 0.5
        }
    });

    // Load the trips data and parse date strings into Date objects
    let trips = await d3.csv(
        'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv',
        (trip) => {
            trip.started_at = new Date(trip.started_at);
            trip.ended_at = new Date(trip.ended_at);


            let startedMinutes = minutesSinceMidnight(trip.started_at); 
            //This function returns how many minutes have passed since `00:00` (midnight).
            departuresByMinute[startedMinutes].push(trip); 

            let endedMinutes = minutesSinceMidnight(trip.ended_at); 
            //This function returns how many minutes have passed since `00:00` (midnight).
            arrivalsByMinute[endedMinutes].push(trip); 
            return trip;
        }
    );

    // Load the nested JSON file once map is loaded
    let jsonData;

    try {
        const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
        jsonData = await d3.json(jsonurl);
        console.log('Loaded JSON Data:', jsonData);  // Log to verify structure

        // const stations = computeStationTraffic(jsonData.data.stations, trips);
        const stations = computeStationTraffic(jsonData.data.stations);

        console.log('Stations Array:', stations);

        const radiusScale = d3
        .scaleSqrt()
        .domain([0, d3.max(stations, (d) => d.totalTraffic)])
        .range([0, 25]);

        let stationFlow = d3.scaleQuantize().domain([0, 1]).range([0, 0.5, 1]);

        // Make the circles
        circles = svg.selectAll('circle')
            .data(stations, (d) => d.short_name)
            .enter()
            .append('circle')
            .attr('r', d => radiusScale(d.totalTraffic))  // Radius of the circle
            .attr('fill', 'steelblue')  // Circle fill color
            .attr('stroke', 'white')    // Circle border color
            .attr('stroke-width', 1)    // Circle border thickness
            .attr('opacity', 0.8)       // Circle opacity
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
            })
            .style('--departure-ratio', d => stationFlow(d.departures / d.totalTraffic));

        // Initial position update when map loads
        updatePositions();

        // Reposition markers on map interactions
        map.on('move', updatePositions);     // Update during map movement
        map.on('zoom', updatePositions);     // Update during zooming
        map.on('resize', updatePositions);   // Update on window resize
        map.on('moveend', updatePositions);  // Final adjustment after movement ends

        const timeSlider = document.getElementById('timeSlider');
        const selectedTime = document.getElementById('selectedTime');
        const anyTimeLabel = document.getElementById('anyTime');


        function updateTimeDisplay() {
            let timeFilter = Number(timeSlider.value); // Get slider value
        
            if (timeFilter === -1) {
              selectedTime.textContent = ''; // Clear time display
              anyTimeLabel.style.display = 'block'; // Show "(any time)"
            } else {
              selectedTime.textContent = formatTime(timeFilter); // Display formatted time
              anyTimeLabel.style.display = 'none'; // Hide "(any time)"
            }
            
            // Call updateScatterPlot to reflect the changes on the map
            updateScatterPlot(timeFilter);
        }

        function updateScatterPlot(timeFilter) {
            // // Get only the trips that match the selected time filter
            // const filteredTrips = filterTripsbyTime(trips, timeFilter);
            // // Recompute station traffic based on the filtered trips
            // const filteredStations = computeStationTraffic(stations, filteredTrips);

            const filteredStations = computeStationTraffic(stations, timeFilter);

            
            timeFilter === -1 ? radiusScale.range([0, 25]) : radiusScale.range([3, 50]);

            // Update the scatterplot by adjusting the radius of circles
            circles
              .data(filteredStations, (d) => d.short_name) // Bind the filtered data
              .join('circle') // Ensure the data is bound correctly
              .attr('r', (d) => radiusScale(d.totalTraffic)) // Update circle sizes
              .style('--departure-ratio', (d) =>
                stationFlow(d.departures / d.totalTraffic),
              ); // for color
        }

        timeSlider.addEventListener('input', updateTimeDisplay);
        updateTimeDisplay();


    } catch (error) {
        console.error('Error loading JSON:', error);  // Handle errors if JSON loading fails
    }

// end of map.on('load')    
});