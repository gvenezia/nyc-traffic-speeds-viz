import * as d3 from 'd3';

import { mapStyles } from './google-map-styles.js';

// How long should each 5m period last in the viz?
let animationCycle = 1500;

// Starting date and time
let date = '2/16';
let endDate = '2/16';
let time = '11:33';
let endTime = '11:38';

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
d3.csv("data/DOT_Traffic_Speeds_NBE_limit_1000_33-38-f.csv", function(error, data) {
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
    .range(["#b20035", "#ffef19", "#00cc7a"]);

  console.log(color(40));

  // Filter data for the current time
  // data.filter

  // ====== Polyline ======
  let filteredData = [];
  let decodedPath = '';
  let customPath = {};
  let times = ['11:33', '11:38'];
  let count = 0;
  let interpolater = null;

  // ================== Cycle through data ==================
  // Start the hour cycler once the map has loaded (make sure the video can start on a loaded page)
  var fiveMinCycler = function(){};
  window.onload = function(e){ 
    setTimeout( () => {
      fiveMinCycler = setInterval(drawPolylines, animationCycle);
    }, 1000)
  }

  function drawPolylines(){
    time = times[count]

    filteredData = data.filter(d => d.data_as_of.indexOf( `${time}` ) !== -1  )

    console.log(filteredData);

    filteredData.forEach(d => {
      // Decode the given polyline with google maps geometry library
      decodedPath = google.maps.geometry.encoding.decodePath(d.encoded_poly_line);

      // set the polyline
      let customPath = new google.maps.Polyline({
              path: decodedPath,
              geodesic: true,
              strokeColor: color(d.speed),
              strokeOpacity: 0,
              strokeWeight: 5,
              map: map
            });  

      // Interpolation      
      var step = 0;
      var numSteps = 100; //Change this to set animation resolution
      var timePerStep = 50; //Change this to alter animation speed
      let interpolatedColor = '';
      let interpolatedOpacity = 0;
      let nextSpeed = data.filter(df => df.data_as_of.indexOf(times[1]) !== -1  && df.link_id === d.link_id)[0].speed;

      console.log(nextSpeed - d.speed);

      let opacityInterpolater = setInterval(function() {
         step += 1;
         if (step > numSteps) {
            step = 0;
            setInterval(colorInterpolater, timePerStep)
            
            return clearInterval(opacityInterpolater);
         } else {
            interpolatedOpacity = d3.interpolate(0,1)(step/numSteps);
            customPath.setOptions({strokeOpacity: interpolatedOpacity});
         }
      }, timePerStep);

      let colorInterpolater = function(){
         step += 1;
         if (step > numSteps) {
            clearInterval(interpolater);
         } else {
            if (count === 0){
              
            }
            interpolatedColor = d3.interpolateRgb( color(d.speed), color(nextSpeed - 50) )(step/numSteps);
            customPath.setOptions({strokeColor: interpolatedColor})
         }
      };
    });

    // TEMP CLEAR
    return clearInterval(fiveMinCycler); // Stop setInterval calls

    // Specific time for an event (like projected totals popping up)
    if ( time === endTime ){
      // Then stop the animation
      return clearInterval(fiveMinCycler); // Stop setInterval calls
    } 
  }
  
}); // End d3.json  