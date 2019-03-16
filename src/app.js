import * as d3 from 'd3';

import { mapStyles } from './google-map-styles.js';

// Create the Google Map…
var map = new google.maps.Map(d3.select("#map").node(), {
  zoom: 10,
  minZoom: 11,
  maxZoom: 16,
  center: new google.maps.LatLng(40.7224364,-73.9909218),
  mapTypeId: google.maps.MapTypeId.ROADMAP,
  disableDefaultUI: true,
  styles: mapStyles.nightModeUncluttered
});

// Load the station data. When the data comes back, create an overlay.
d3.csv("data/DOT_Traffic_Speeds_NBE_limit_1000_f3.csv", function(error, data) {
  if (error) throw error;

  // format data 
  data.forEach( d => {
    d.speed = +d.speed;
  });

  // Find minimum and maximum traffic speeds for use in color scale
  let minSpeed = d3.min(data, d => d.speed),
      maxSpeed = d3.max(data, d => d.speed);

  // Color Scale for traffic speed
  let color = d3.scaleLinear()
    .domain([minSpeed, maxSpeed/2, maxSpeed])
    .range(["#b20035", "yellow", "#00cc7a"]);

  // ====== Polyline ======
  let decodedPath = '';
  let customPath = {};

  data.forEach(d => {
    // Decode the given polyline with google maps geometry library
    decodedPath = google.maps.geometry.encoding.decodePath(d.encoded_poly_line);

    // set the polyline
    customPath = new google.maps.Polyline({
            path: decodedPath,
            geodesic: true,
            strokeColor: color(d.speed),
            strokeOpacity: 1.0,
            strokeWeight: 5
          });

    // Draw the path
    customPath.setMap(map)
  });
  
}); // End d3.json  