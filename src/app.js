import * as d3 from 'd3';

import { mapStyles } from './google-map-styles.js';

// How long should each 5m period last in the viz?
let animationCycle = 1500;

// Interpolater variables
const numSteps = 100; //Change this to set animation resolution
const timePerStep = 10; //Change this to alter animation speed

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
  let polylinesArr = [];
  let polylinesObj = {};
  let intervalCount = 0;

  console.log('SETUP');

  filteredData = data.filter( d => d.data_as_of.indexOf( startTime ) !== -1  )

  filteredData.forEach( (d,i) => {
    // Interpolation variables      
    let step = 0;

    console.log('start opacity interpolation');

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
    // polylinesArr.push(customPath);
    polylinesObj[d.link_id] = customPath;

    let opacityInterpolaterId = setInterval( () => {
       if (step++ > numSteps) {
          console.log('END OPACITY INTERVALS');
          
          if (++intervalCount === filteredData.length)
            moveToNextPeriod(startHour, startMin)
          
          return clearInterval(opacityInterpolaterId);
       } else {
          let interpolatedOpacity = d3.interpolate(0,1)(step/numSteps);
          // polylinesArr[i].setOptions({strokeOpacity: interpolatedOpacity});
          polylinesObj[d.link_id].setOptions({strokeOpacity: interpolatedOpacity});
       }
    }, timePerStep);
  }); // End filteredData.forEach()

  // setTimeout( moveToNextPeriodBrute, 5000);

  function moveToNextPeriodBrute(){
    console.log('start BRUTE');
    filteredData = data.filter( d => d.data_as_of.indexOf( 'T11:08' ) !== -1  )

    console.log(filteredData);

    let intervalCount = 0;

    filteredData.forEach( (d,i) => {

      // console.log(data.filter(df => df.data_as_of.indexOf( `T${currHour}:${currMin + 5}` ) !== -1  && df.link_id === d.link_id));
      let nextFilteredData = data.filter(df => df.data_as_of.indexOf( `T11:13` ) !== -1  && df.link_id === d.link_id);  
      let nextSpeed = nextFilteredData.length > 0 ? nextFilteredData[0].speed : d.speed;

      let step = 0;

      // Must be delcared with `let` in order to properly assign consecutive intervalId's (which are then referenced by clearInterval() in order to stop the function calls)
      // setInterval is called for each of the datapoints in the filteredData
      let colorInterpolaterId = setInterval( () => {
        if (step++ > numSteps) {
          console.log('END color interpolation');

          if (++intervalCount === filteredData.length)
            setTimeout( moveToNextPeriodBrute2(), 2000);

          return clearInterval(colorInterpolaterId);
          
        } else {
          let interpolatedColor = d3.interpolateRgb( color(d.speed), color(nextSpeed) )(step/numSteps);
          // polylinesArr[i].setOptions({strokeColor: interpolatedColor})
          polylinesObj[d.link_id].setOptions({strokeColor: interpolatedColor});
        }
      }, timePerStep);  
    });
  }

  function moveToNextPeriodBrute2(){
    console.log('start BRUTE2');
    filteredData = data.filter( d => d.data_as_of.indexOf( 'T11:13' ) !== -1  )

    console.log(filteredData);

    filteredData.forEach( (d,i) => {

      // console.log(data.filter(df => df.data_as_of.indexOf( `T${currHour}:${currMin + 5}` ) !== -1  && df.link_id === d.link_id));
      let nextFilteredData = data.filter(df => df.data_as_of.indexOf( `T11:18` ) !== -1  && df.link_id === d.link_id);  
      let nextSpeed = nextFilteredData.length > 0 ? nextFilteredData[0].speed : d.speed;

      let step = 0;
      // Must be delcared with `let` in order to properly assign consecutive intervalId's (which are then referenced by clearInterval() in order to stop the function calls)
      // setInterval is called for each of the datapoints in the filteredData
      let colorInterpolaterId = setInterval( () => {
        if (step++ > numSteps) {
          console.log('END color interpolation');

          // if (++intervalCount === filteredData.length)
          //   moveToNextPeriodBrute2(startHour, startMin)

          return clearInterval(colorInterpolaterId);
          
        } else {
          let interpolatedColor = d3.interpolateRgb( color(d.speed), color(nextSpeed) )(step/numSteps);
          // polylinesArr[i].setOptions({strokeColor: interpolatedColor})
          polylinesObj[d.link_id].setOptions({strokeColor: interpolatedColor});
        }
      }, timePerStep);  
    });
  }


  function moveToNextPeriod(prevHour, prevMin){
    console.log('prevMin is ' + prevMin);
    console.log('start DYNAMIC NEXT PERIOD');
    let currHour = 0,
        currMin = 0;

    if (prevMin + 5 >= 60){
      if (prevHour + 1 >= 24){
        // Add to date
        currHour = 0;
        currMin = ((prevMin + 5) % 60);  
      } else {
        currHour++;
        currMin = ((prevMin + 5) % 60);  
      }
    } else {
      currHour = prevHour;
      currMin = prevMin + 5;
    }

    let newTime = `${currHour}:${currMin < 10 ? '0' + currMin.toString() : currMin}`;

    console.log('newTime is ' + newTime)

    // Check usable time variable
    if ( newTime === endTime ){
      // Then stop the animation
      console.log('End Animation');
      return 0;
    } 

    let filteredData = data.filter( d => d.data_as_of.indexOf( newTime ) !== -1  )
    let intervalCount = 0;

    filteredData.forEach( (d,i) => {
      // console.log(data.filter(df => df.data_as_of.indexOf( `T${currHour}:${currMin + 5}` ) !== -1  && df.link_id === d.link_id));
      let nextFilteredData = data.filter(df => df.data_as_of.indexOf( `T${currHour}:${currMin + 5}` ) !== -1  && df.link_id === d.link_id);  
      let nextSpeed = nextFilteredData.length > 0 ? nextFilteredData[0].speed : d.speed;

      let step = 0;
      // Must be delcared with `let` in order to properly assign consecutive intervalId's (which are then referenced by clearInterval() in order to stop the function calls)
      // setInterval is called for each of the datapoints in the filteredData
      let colorInterpolaterId = setInterval( () => {
        if (step++ > numSteps) {
          console.log('END color interpolation');
          if (++intervalCount === filteredData.length)
            moveToNextPeriod(currHour, currMin)
          return clearInterval(colorInterpolaterId);
          
        } else {
          let interpolatedColor = d3.interpolateRgb( color(d.speed), color(nextSpeed) )(step/numSteps);
          // polylinesArr[i].setOptions({strokeColor: interpolatedColor})
          polylinesObj[d.link_id].setOptions({strokeColor: interpolatedColor});
        }
      }, timePerStep);  
    })

    
    
  } // End moveToNextPeriod()
  
}); // End d3.json  