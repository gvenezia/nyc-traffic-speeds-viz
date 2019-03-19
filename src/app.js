import * as d3 from 'd3';

import { mapStyles } from './google-map-styles.js';

// How long should each 5m period last in the viz?
let animationCycle = 1500;

// Starting date and time
let date = '2/16',
    endDate = '2/16',
    startHour = 11,
    startMin = 8,
    startTime = `${startHour}:${startMin < 10 ? '0' + startMin.toString() : startMin}`,
    endHour = 11,
    endMin = 38,
    endTime = `${endHour}:${endMin}`;

// Create the Google Map…
var map = new google.maps.Map(d3.select("#map").node(), {
  zoom: 11,
  minZoom: 10,
  maxZoom: 16,
  center: new google.maps.LatLng(40.7224364,-73.9609218),
  mapTypeId: google.maps.MapTypeId.ROADMAP,
  disableDefaultUI: true,
  styles: mapStyles.nightModeUncluttered
});

// Load the station data. When the data comes back, create an overlay.
d3.csv("data/DOT_Traffic_Speeds_NBE_limit_1000_08-38-f.csv", function(error, data) {
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

  // ====== Polyline ======
  let filteredData = [];
  let count = 0;
  let currHour = startHour;
  let currMin = startMin;
  let time = startTime;
  let polylinesArr = [];

  drawPolylines()

  function drawPolylines(){
    // Check usable time variable
    if ( time === endTime ){
      // Then stop the animation
      return 0;
    } 

    console.log('DRAW');

    filteredData = data.filter( d => d.data_as_of.indexOf( time ) !== -1  )

    console.log(filteredData);

    filteredData.forEach( (d,i) => {
      // Interpolation variables      
      var step = 0;
      var numSteps = 100; //Change this to set animation resolution
      var timePerStep = 10; //Change this to alter animation speed
      let interpolatedColor = '';
      let interpolatedOpacity = 0;
      console.log(data.filter(df => df.data_as_of.indexOf( `T${currHour}:${currMin + 5}` ) !== -1  && df.link_id === d.link_id));
      let nextTimePeriod = data.filter(df => df.data_as_of.indexOf( `T${currHour}:${currMin + 5}` ) !== -1  && df.link_id === d.link_id);  
      let nextSpeed = nextTimePeriod.length > 0 ? nextTimePeriod[0].speed : d.speed;


      console.log('start opacity interpolation');

      // If at beginning of cycle, then declare the polyline paths, fade them in, and then call colorInterpolater()
      if (time === startTime ){
        // Decode the given polyline with geometry library
        let decodedPath = google.maps.geometry.encoding.decodePath(d.encoded_poly_line);

        // set the polyline
        let customPath = new google.maps.Polyline({
                path: decodedPath,
                geodesic: true,
                strokeColor: color(d.speed),
                strokeOpacity: 0,
                strokeWeight: 5,
                map
              }); 
        // push polyline to array
        polylinesArr.push(customPath);

        let opacityInterpolaterId = setInterval( () => {
           if (step++ > numSteps) {
              console.log('start color interpolation');
              step = 0;
              // colorInterpolater()
              
              return clearInterval(opacityInterpolaterId);
           } else {
              interpolatedOpacity = d3.interpolate(0,1)(step/numSteps);
              polylinesArr[i].setOptions({strokeOpacity: interpolatedOpacity});
           }
        }, timePerStep);
      } else {
        console.log('start color interpolation2');
        colorInterpolater()
      }

      function colorInterpolater() {
        // Must be delcared with `let` in order to properly assign consecutive intervalId's (which are then referenced by clearInterval() in order to stop the function calls)
        // setInterval is called for each of the datapoints in the filteredData
        let colorInterpolaterId = setInterval( () => {
          if (step++ > numSteps) {
            console.log('END color interpolation');
            return clearInterval(colorInterpolaterId);
            
          } else {
            interpolatedColor = d3.interpolateRgb( color(d.speed), color(nextSpeed) )(step/numSteps);
            polylinesArr[i].setOptions({strokeColor: interpolatedColor})
          }
        }, timePerStep);  
      }

    }); // End filteredData.forEach()

    if (currMin + 5 >= 60){
      if (currHour + 1 >= 24){
        // Add to date
        currHour = 0;
        currMin = ((currMin + 5) % 60);  
      } else {
        currHour++;
        currMin = ((currMin + 5) % 60);  
      }
    } else {
      currMin += 5;
    }

    time = `${currHour}:${currMin < 10 ? '0' + currMin.toString() : currMin}`

    drawPolylines();
  } // End drawPolylines()
  
}); // End d3.json  