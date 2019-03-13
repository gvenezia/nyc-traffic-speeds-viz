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
d3.csv("data/DOT_Traffic_Speeds_NBE_limit_1000_f1.csv", function(error, data) {
  if (error) throw error;

  var overlay = new google.maps.OverlayView();

  data.forEach( d => {
    d.lat = d.link_points.match(/[.\d]+/)[0];
    d.lng = d.link_points.match( /(?<=,)[,\-.\d]+/ )[0];

    console.log(d.lat);
  })

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

      // Add a circle.
      marker.append("circle")
          .attr("r", 4.5)
          .attr("cx", padding)
          .attr("cy", padding);

      // Add a label.
      marker.append("text")
          .attr("x", padding + 7)
          .attr("y", padding)
          .attr("dy", ".31em")
          .text(function(d) { return d.key; });

      function transform(d) {
        d = new google.maps.LatLng( d.lat, d.lng );
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