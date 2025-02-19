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
    });