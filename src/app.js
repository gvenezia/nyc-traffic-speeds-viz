import * as d3 from 'd3';

import { mapStyles } from './google-map-styles.js';

// Create the Google Map…
var map = new google.maps.Map(d3.select("#map").node(), {
  zoom: 11,
  center: new google.maps.LatLng(40.7224364,-73.9909218),
  mapTypeId: google.maps.MapTypeId.ROADMAP,
  disableDefaultUI: true,
  styles: mapStyles.darkFaded
});

// Load the station data. When the data comes back, create an overlay.
d3.csv("data/DOT_Traffic_Speeds_NBE_limit_1000_f2.csv", function(error, data) {
  if (error) throw error;

  var overlay = new google.maps.OverlayView();

  data.forEach( d => {
    // Extract the "lat,lng" and put into array
    d.latLng = d.link_points.match( /\d+\.\d+,-\d+.\d+/g );

    // Separate the "lat" and "lng" and replace array
    d.latLng.forEach( (ll, i) => {
      let lat = ll.match(/[.\d]+/)[0] || false;
      let lng = ll.match( /(?<=,)[,\-.\d]+/ )[0] || false;
      // Replace the latLng strings with arrays
      if (d.latLng[i] && lat && lng)
        d.latLng[i] = [ lat, lng ];
    });

  });

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

      // Add a line for the road segment
      marker.append("path")
          .attr("stroke-width", 1)
          .attr('stroke', 'white')
          .attr('fill', 'none')
          .attr('d', d => {
            let pathStr = '';
            let temp = {};
            let latPad = d.latLng[0][0];
            let lngPad = d.latLng[0][1];

            d.latLng.forEach( (ll,i) => {
              temp = new google.maps.LatLng( +ll[0], +ll[1] );
              temp = projection.fromLatLngToDivPixel(temp);
              
              pathStr += (i === 0) ? `M ${padding} ${padding} ` : ` L `;
              pathStr += (temp.x + padding) + ' ' + (temp.y + padding);
            });

            return pathStr;
          });

      // Add a label
      marker.append("text")
          .attr("x", padding + 20)
          .attr("y", padding)
          .attr("dy", ".31em")
          .text(d => d.link_name );

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