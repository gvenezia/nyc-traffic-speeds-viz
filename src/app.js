import * as d3 from 'd3';

import { mapStyles } from './google-map-styles.js';

// Create the Google Map…
var map = new google.maps.Map(d3.select("#map").node(), {
  zoom: 12,
  center: new google.maps.LatLng(40.7224364,-73.9909218),
  mapTypeId: google.maps.MapTypeId.ROADMAP,
  disableDefaultUI: true,
  styles: mapStyles.nightModeUncluttered
});

// Load the station data. When the data comes back, create an overlay.
d3.csv("data/DOT_Traffic_Speeds_NBE_limit_1000_f3.csv", function(error, data) {
  if (error) throw error;

  data.forEach( d => {
    //format
    d.speed = +d.speed;


    // Extract the "lat,lng" and put into array
    d.latLng = d.link_points.match( /\d+\.\d{4,},-\d+.\d{4,}/g );

    // Separate the "lat" and "lng" and replace array
    d.latLng.forEach( (ll, i) => {
      let lat = ll.match( /[.\d]+/ )[0] || false;
      let lng = ll.match( /(?<=,)[,\-.\d]+/ )[0] || false;
      // Replace the latLng strings with arrays
      if (d.latLng[i] && lat && lng)
        d.latLng[i] = [ lat, lng ];
    });

  });

  let minSpeed = d3.min(data, d => d.speed);
  let maxSpeed = d3.max(data, d => d.speed);

  // Color Scale for traffic speed
  let color = d3.scaleLinear()
    .domain([minSpeed, maxSpeed/2, maxSpeed])
    .range(["#b20035", "yellow", "#00cc7a"]);

  var overlay = new google.maps.OverlayView();

  // Add the container when the overlay is added to the map.
  overlay.onAdd = function() {
    var layer = d3.select( this.getPanes().overlayLayer )
                    .append("div")
                    .attr("class", "stations");

    // Draw each marker as a separate SVG element
    overlay.draw = function() {
      var projection = this.getProjection(),
          padding = 100;

      var marker = layer.selectAll("svg")
                          .data(data)
                          .each(transform) // update existing markers
                        .enter().append("svg")
                          .each(transform)
                          .attr("class", "marker");

      // Define marker ends
      marker.append("svg:defs").selectAll("marker")
            .data(data)
          .enter().append("svg:marker")
            .attr('id', (d,i) => `marker-${i}` ) 
            .attr('markerHeight', 3)
            .attr('markerWidth', 3)
            .attr('markerUnits', 'strokeWidth')
            .attr('orient', 'auto')
            .attr('refX', 0)
            .attr('refY', 0)
            .attr('viewBox', '-6 -6 12 12')
            .append('svg:path')
              .attr('d', 'M 0, 0  m -5, 0  a 5,5 0 1,0 10,0  a 5,5 0 1,0 -10,0')
              .attr('fill', d => color(d.speed) );

      // Add a line for the road segment
      marker.append("path")
          .attr("stroke-width", 5)
          .attr('stroke', d => color(d.speed) )
          .attr('fill', 'none')
          .attr('d', d => {
            let pathStr = '';
            let temp = {};
            let latPad = 0;
            let lngPad = 0;

            d.latLng.forEach( (ll,i) => {
              temp = new google.maps.LatLng( +ll[0], +ll[1] );
              temp = projection.fromLatLngToDivPixel(temp);

              if (i === 0){
                latPad = temp.x
                lngPad = temp.y
              }
              
              pathStr += (i === 0) ? `M ${padding} ${padding} ` : ` L `;
              pathStr += (temp.x - latPad + padding) + ' ' + (temp.y - lngPad + padding);
            });

            return pathStr;
          })
          .attr("marker-start", (d,i) => `url(#marker-${i})`) // Use unique arrowhead for proper color
          .attr("marker-end", (d,i) => `url(#marker-${i})`) // Use unique arrowhead for proper color

      // Add a label
      // marker.append("text")
      //     .attr("x", padding + 20)
      //     .attr("y", padding)
      //     .attr("dy", ".31em")
      //     .text(d => d.link_name );

      // For each on d.latLng to get a new map latlng for each point?
      function transform(d) {
        // let pathStr = '';
        // let temp = '';

        // d.latLng.forEach( (ll,i) => {
        //   temp = new google.maps.LatLng( ll[0], ll[1] );
        //   temp = projection.fromLatLngToDivPixel(temp);
          
        //   pathStr += (i === 0) ? `M ` : ` L `;
        //   pathStr += temp.x + ' ' + temp.y;
        // });

        // return d3.select(this)
        //       .attr('d', pathStr)
        //       .style("left", (d.x - padding) + "px")
        //       .style("top", (d.y - padding) + "px");

          d = new google.maps.LatLng( d.latLng[0][0], d.latLng[0][1]);
          d = projection.fromLatLngToDivPixel(d);

          return d3.select(this)
              .style("left", (d.x - padding) + "px")
              .style("top", (d.y - padding) + "px");   
      }


    };
  };

  // Bind our overlay to the map…
  overlay.setMap(map);
}); // End d3.json  