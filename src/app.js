import * as d3 from 'd3';

import { mapStyles } from './google-map-styles.js';

// How long should each 5m period last in the viz?
// let animationCycle = 1500;

// Interpolater variables
const numSteps = 10; //Change this to set animation resolution
const timePerStep = 15; //Change this to alter animation speed
const periodDuration = 800;

// ===== format with padded zeros for matching against dataset date strings
function zeroPad(number){
  return number < 10 ? '0' + number.toString() : number.toString();
}

// Starting date and time
let startHour = 5,
    startMin = 13,
    startTime = `${zeroPad(startHour)}:${zeroPad(startMin)}`,
    endHour = 11,
    endMin = 18,
    endTime = `${endHour}:${endMin}`;

// Create the Google Map…
var map = new google.maps.Map(d3.select("#map").node(), {
  zoom: 11,
  minZoom: 10,
  maxZoom: 16,
  gestureHandling: 'greedy',
  center: new google.maps.LatLng(40.7224364,-73.9609218),
  mapTypeId: google.maps.MapTypeId.ROADMAP,
  disableDefaultUI: true,
  styles: mapStyles.nightModeUncluttered
});

// Load the station data. When the data comes back, create an overlay.
d3.csv("data/DOT_Traffic_Speeds_NBE_limit_10000_3-21_f.csv", function(error, data) {
  if (error) throw error;

  // format data 
  data.forEach( d => {
    d.speed = +d.speed;
  });

  // Find minimum and maximum traffic speeds for use in color scale
  let minSpeed = d3.min(data, d => d.speed),
      maxSpeed = d3.max(data, d => d.speed);

  // Color Scheme for displayed data
  let customRed = '#b20035',
      customYellow = "#ffef19",
      customGreen = "#00cc7a";


  // Color Scale for traffic speed
  let color = d3.scaleLinear()
    .domain([minSpeed, maxSpeed/2, maxSpeed])
    .range([customRed, customYellow, customGreen]);

  let height = window.innerHeight; 
  let width = window.innerWidth;

  let svg = d3.select('svg')
                .attr('width', width)
                .attr('height', height);

  let keyH = 30;
  let keyW = 200;

  // ========= CLOCK ==========
  let clock = svg.append('text')
      .attr('x', width - 20)
      .attr('y', 40)
      .attr('dy', '.31em')
      .attr('text-anchor', 'end')
      .attr('font-size', 40)
      .text(`${zeroPad(startHour)}:${zeroPad(startMin)}`)

  var clockControl = svg.append('text')
      .attr('id', 'pause-text')
      .attr('x', width - 20)
      .attr('y', 60)
      .attr('dy', '.31em')
      .attr('text-anchor', 'end')
      .attr('font-size', 12)
      .text(`Pause Animation`)
      
  clockControl.on('click', function(){
        d3.select(this).text( () => {
          if (d3.select(this).text() === 'Pause Animation')
            return 'Resume Animation';
          else 
            return 'Pause Animation';
        })
        console.log('clicked', this );
        // clearInterval( opacityInterpolaterId)
        clearInterval(colorInterpolatorId)
        return
      });

  console.log(clockControl);

  // ========= KEY ==========
  // append gradient bar
  let gradient = svg.select('defs')
     .append('linearGradient')
     .attr('id', 'legendColorGradient')
     .attr('width', keyW)
     .attr('height', keyH)
     .attr('x1', '0%') // left
     .attr('y1', '0%')
     .attr('x2', '100%') // right
     .attr('y2', '0%')
     .attr('spreadMethod', 'pad'); // final color fills shape beyond end of gradient
     
  // Stops need to be added separately otherwise they'll append to one another instead of the linearGradient
  gradient.append('stop')
       .attr('offset', '5%')
       .attr('stop-color', customRed)
       .attr('stop-opacity', 1);
  
  gradient.append('stop')
       .attr('offset', '50%')
       .attr('stop-color', customYellow)
       .attr('stop-opacity', 1);
  
  gradient.append('stop')
       .attr('offset', '95%')
       .attr('stop-color', customGreen)
       .attr('stop-opacity', 1); 

  svg.select('rect')
    .attr('x', width - keyW - 20)
    .attr('y', height - keyH*3)
    .attr('width', keyW)
    .attr('height', keyH)
    // .style('fill', 'orange');
    .style('fill', 'url(#legendColorGradient)');

  var legendScale = d3.scaleLinear()
        .domain([minSpeed, maxSpeed/2, maxSpeed])
          .nice()
        .range([0, keyW/2, keyW-1]);
        
  var yAxis = d3.axisBottom()
    .scale(legendScale)
    .ticks(5);

  svg.append("g")
        // .attr('x', width - keyW - 20)
        // .attr('y', height - keyH*3)
        .attr("class", "axis")
        .attr("transform", `translate(${width - keyW - 20},${height - keyH*2})`)
        .call(yAxis);

  // ====== Polyline ======
  let filteredData = [];
  let polylinesObj = {};
  let updatedPolylineCount = 0;

  console.log('SETUP');

  filteredData = data.filter( d => d.data_as_of.indexOf( `T${startTime}` ) !== -1  )

  google.maps.event.addListener(map, 'tilesloaded', 
    setTimeout( () => {
      console.log('start opacity interpolation');

      filteredData.forEach( (d,i) => {
        // Interpolation variables      
        let step = 0;

        // Decode the given polyline with geometry library
        let decodedPath = google.maps.geometry.encoding.decodePath(d.encoded_poly_line);

        // Set the polyline
        let customPath = new google.maps.Polyline({
                path: decodedPath,
                geodesic: true,
                strokeColor: color(d.speed),
                strokeOpacity: 0,
                strokeWeight: 5,
                map
              }); 

        // Set tooltip
        let infowindow = new google.maps.InfoWindow({
          content: `<div class="infowindow">
              <p>${d.link_name}</p>
              <p>${d.link_id}</p>
            </div>`
        });

        // Add event listener for tooltip
        customPath.addListener('click', function(){
          infowindow.setPosition(decodedPath[0]);
          infowindow.open(map);

          // Thanks to @geocodezip for the explanation of why setPosition is necessary
          // link: https://stackoverflow.com/a/42331525/8585320
        });

        // Push polyline to array
        polylinesObj[d.link_id] = customPath;

        // Set opacity interpolator
        let interpolateOpacity = d3.interpolate(1e-6,1);
        
        // let opacityInterpolaterId = setInterval( () => {
        //     if (step++ > numSteps && ++updatedPolylineCount === filteredData.length) {
        //       console.log('END OPACITY INTERVALS');
        //       requestAnimationFrame( timestamp => {
        //         moveToNextPeriod(startHour, startMin, filteredData)
        //       });
        //       return clearInterval(opacityInterpolaterId);
        //     } 
        //     polylinesObj[d.link_id].setOptions({
        //       strokeOpacity: interpolateOpacity(step/numSteps)
        //     });
        // }, timePerStep);

        let start = performance.now();

        let frameTick = timestamp => {
          let progress = timestamp - start;

          if (progress > periodDuration && 
              ++updatedPolylineCount === filteredData.length){
            console.log('END OPACITY INTERVALS');
            return requestAnimationFrame( timestamp => {
              moveToNextPeriod(timestamp, startHour, startMin, filteredData)
            });
          }
          // check that setOptions is batch setting
          polylinesObj[d.link_id].setOptions({
              strokeOpacity: interpolateOpacity(progress/periodDuration)
            });
          requestAnimationFrame(frameTick);
        }
        requestAnimationFrame(frameTick);

      }); // End filteredData.forEach()
    }, 1000)
  );



  // setTimeout( moveToNextPeriodBrute, 5000);

  function moveToNextPeriod(timestamp, prevHour, prevMin, prevData){
    let start = timestamp;

    console.log(start);
    let filteredData = [],
        addMin = 0,
        currHour = prevHour,
        currMin = 0;

    // batch the next 5 mins for one filteredData call after `while` loop
    while (++addMin <= 5){
      if (prevMin + addMin === 60){
        if (prevHour + 1 === 24){
          currHour = 0;
        } else {
          currHour++
        } 
      }

      currMin = ((prevMin + addMin) % 60);

      let newTime = `${zeroPad(currHour)}:${zeroPad(currMin)}`;
      // Set the clock with the current batch numbers
      clock.text(`${newTime}`);

      let currFilter = data.filter( d => d.data_as_of.indexOf( `T${newTime}` ) !== -1  )
      if (currFilter.length > 0){
        filteredData = [...filteredData, ...currFilter ];
      }
    } // End while

    // Check usable time variable
    if ( currHour >= endHour && currMin >= endMin){
      // Then stop the animation
      console.log('End Animation');
      return 0;
    } 

    console.log('start animation for: ' + `${zeroPad(currHour)}:${zeroPad(currMin)}`)

    filteredData.forEach( (d,i) => {
      let pd = prevData.find( pd => pd.link_id === d.link_id );
      let prevColor = color( pd ? pd.speed : d.speed );
      let nextColor = color(d.speed)
      let interpolateRGB = d3.interpolateRgb( prevColor, nextColor );
      let step = 0;

      // Must be declared with `let` in order to properly assign consecutive intervalId's (which are then referenced by clearInterval() in order to stop the function calls)
      // setInterval is called for each of the datapoints in the filteredData
      // let colorInterpolatorId = setInterval( () => {
      //   if (typeof polylinesObj[d.link_id] === 'undefined' || 
      //       step++ > numSteps) {
      //     console.log('END color interpolation');

      //     // Check for last datum in current period
      //     if (i + 1 === filteredData.length)
      //       requestAnimationFrame( timestamp => {
      //         moveToNextPeriod(timestamp, currHour, currMin, filteredData);
      //       });

      //     return clearInterval(colorInterpolatorId);
          
      //   } else {
      //     polylinesObj[d.link_id].setOptions({strokeColor: interpolateRGB(step/numSteps)});
      //   }
      // }, timePerStep); // End setIntervals

      let colorInterpolatorFrame = timestamp => {
        let progress = timestamp - start;

        if (typeof polylinesObj[d.link_id] === 'undefined' || progress > periodDuration){
          console.log('END color interpolation');

          if (i + 1 === filteredData.length){
            requestAnimationFrame( timestamp => {
              moveToNextPeriod(timestamp, currHour, currMin, filteredData);
            });
          }

          // return cancelAnimationFrame(reqID);
        }

        polylinesObj[d.link_id].setOptions({strokeColor: interpolateRGB(progress/periodDuration)});

        reqID = requestAnimationFrame(colorInterpolatorFrame);
      } // End colorInterpolatorFrame
      let reqID = requestAnimationFrame(colorInterpolatorFrame);

    }); // End filteredData.forEach()
    
  } // End moveToNextPeriod()



  // =========== HELPER BRUTE FUNCTIONS FOR TROUBLESHOOTING ===========

  //   function moveToNextPeriodBrute(){
  //   console.log('start BRUTE');
  //   filteredData = data.filter( d => d.data_as_of.indexOf( 'T11:08' ) !== -1  )

  //   console.log(filteredData);

  //   let updatedPolylineCount = 0;

  //   filteredData.forEach( (d,i) => {

  //     // console.log(data.filter(df => df.data_as_of.indexOf( `T${currHour}:${currMin + 5}` ) !== -1  && df.link_id === d.link_id));
  //     let nextFilteredData = data.filter(df => df.data_as_of.indexOf( `T11:13` ) !== -1  && df.link_id === d.link_id);  
  //     let nextSpeed = nextFilteredData.length > 0 ? nextFilteredData[0].speed : d.speed;

  //     let step = 0;

  //     // Must be delcared with `let` in order to properly assign consecutive intervalId's (which are then referenced by clearInterval() in order to stop the function calls)
  //     // setInterval is called for each of the datapoints in the filteredData
  //     let colorInterpolatorId = setInterval( () => {
  //       if (step++ > numSteps) {
  //         console.log('END color interpolation');

  //         if (++updatedPolylineCount === filteredData.length)
  //           setTimeout( moveToNextPeriodBrute2(), 2000);

  //         return clearInterval(colorInterpolatorId);
          
  //       } else {
  //         let interpolatedColor = d3.interpolateRgb( color(d.speed), color(nextSpeed) )(step/numSteps);
  //         // polylinesArr[i].setOptions({strokeColor: interpolatedColor})
  //         polylinesObj[d.link_id].setOptions({strokeColor: interpolatedColor});
  //       }
  //     }, timePerStep);  
  //   });
  // }

  // function moveToNextPeriodBrute2(){
  //   console.log('start BRUTE2');
  //   filteredData = data.filter( d => d.data_as_of.indexOf( 'T11:13' ) !== -1  )

  //   console.log(filteredData);

  //   filteredData.forEach( (d,i) => {

  //     // console.log(data.filter(df => df.data_as_of.indexOf( `T${currHour}:${currMin + 5}` ) !== -1  && df.link_id === d.link_id));
  //     let nextFilteredData = data.filter(df => df.data_as_of.indexOf( `T11:18` ) !== -1  && df.link_id === d.link_id);  
  //     let nextSpeed = nextFilteredData.length > 0 ? nextFilteredData[0].speed : d.speed;

  //     let step = 0;
  //     // Must be delcared with `let` in order to properly assign consecutive intervalId's (which are then referenced by clearInterval() in order to stop the function calls)
  //     // setInterval is called for each of the datapoints in the filteredData
  //     let colorInterpolatorId = setInterval( () => {
  //       if (step++ > numSteps) {
  //         console.log('END color interpolation');

  //         // if (++updatedPolylineCount === filteredData.length)
  //         //   moveToNextPeriodBrute2(startHour, startMin)

  //         return clearInterval(colorInterpolatorId);
          
  //       } else {
  //         let interpolatedColor = d3.interpolateRgb( color(d.speed), color(nextSpeed) )(step/numSteps);
  //         // polylinesArr[i].setOptions({strokeColor: interpolatedColor})
  //         polylinesObj[d.link_id].setOptions({strokeColor: interpolatedColor});
  //       }
  //     }, timePerStep);  
  //   });
  // }
  
}); // End d3.json  