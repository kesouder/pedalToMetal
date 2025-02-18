   // Set your Mapbox access token here
   mapboxgl.accessToken = 'pk.eyJ1Ijoia2V2aW5zb3VkZXIiLCJhIjoiY203OXZ1MHcxMDh0bjJscTA0ZXE4czV6dyJ9.z0RoH3eUFV1hG_eTLRdKng';

   // Initialize the map
    const map = new mapboxgl.Map({
        container: 'map', // ID of the div where the map will render
        // style: 'mapbox://styles/mapbox/streets-v12', // Map style
        style: 'mapbox://styles/mapbox/navigation-day-v1', // alternative map style
        center: [-71.09415, 42.36027], // [longitude, latitude]
        zoom: 12, // Initial zoom level
        minZoom: 5, // Minimum allowed zoom
        maxZoom: 18 // Maximum allowed zoom
   });