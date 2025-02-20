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
    let stations = [];
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
  
    map.on('load', () => { 
        map.addSource('boston_route', {
            type: 'geojson',
            data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson?...'
        });
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

        // Load the nested JSON file once map is loaded
        const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json'
        d3.json(jsonurl).then(jsonData => { // load in json data
          console.log('Loaded JSON Data:', jsonData);  // Log to verify structure
          
          stations = jsonData.data.stations;
          console.log('Stations Array:', stations);

                  // step 4
          trips = d3.csv('https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv')
            .then(trips => {
                const departures = d3.rollup(
                    trips,
                    (v) => v.length,
                    (d) => d.start_station_id,
                );
                const arrivals = d3.rollup(
                    trips,
                    (v) => v.length,
                    (d) => d.end_station_id,
                );
                console.log('Departures:', departures);
                console.log('Arrivals:', arrivals);
                
                stations = stations.map((station) => {
                    let id = station.short_name;
                    station.arrivals = arrivals.get(id) ?? 0;
                    // TODO departures
                    station.departures = departures.get(id) ?? 0;
                    // TODO totalTraffic
                    station.totalTraffic = station.arrivals + station.departures;
                    return station;
                    
                });

                const radiusScale = d3
                    .scaleSqrt()
                    .domain([0, d3.max(stations, (d) => d.totalTraffic)])
                    .range([0, 25]);
                
            //   // Append circles to the SVG for each station
            //   circles = svg.selectAll('circle')
            //         .data(stations)
            //         .enter()
            //         .append('circle')
            //         .attr('r',d => radiusScale(d.totalTraffic))               // Radius of the circle
            //         .attr('fill', 'steelblue')  // Circle fill color
            //         .attr('stroke', 'white')    // Circle border color
            //         .attr('stroke-width', 1)    // Circle border thickness
            //         .attr('opacity', 0.8)      // Circle opacity
            //         .each(function(d) { // iterates over each circle
            //             // Add <title> for browser tooltips
            //             d3.select(this)
            //               .append('title') //appends a title elements
            //               .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
            //           }); 
            circles = svg.selectAll('circle')
                .data(stations)
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
                });
    
                // Initial position update when map loads
                updatePositions();
    
                // Reposition markers on map interactions
                map.on('move', updatePositions);     // Update during map movement
                map.on('zoom', updatePositions);     // Update during zooming
                map.on('resize', updatePositions);   // Update on window resize
                map.on('moveend', updatePositions);  // Final adjustment after movement ends

            })
            .catch(error => {
                console.error('Error loading CSV:', error);  // Handle errors if CSV loading fails
            });

        }).catch(error => {
          console.error('Error loading JSON:', error);  // Handle errors if JSON loading fails
        });


    // end of map.on('load')    
    });
