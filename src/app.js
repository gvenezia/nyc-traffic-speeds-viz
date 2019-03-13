import * as d3 from 'd3';

import { mapStyles } from './google-map-styles.js';

const latLng = [
  [40.762901, -74.009763],
  [40.727711, -74.022358],
  [40.700838, -74.015411],
  [40.745058, -73.963737],
  [40.796309, -73.928990]
]

// Create the Google Map…
var map = new google.maps.Map(d3.select("#map").node(), {
  zoom: 11,
  center: new google.maps.LatLng(40.7224364,-73.9909218),
  mapTypeId: google.maps.MapTypeId.ROADMAP,
  disableDefaultUI: true,
  styles: mapStyles.darkFaded
});

// Load the station data. When the data comes back, create an overlay.
d3.csv("data/top5redo-add-type-f.csv", function(error, data) {
  if (error) throw error;

  var overlay = new google.maps.OverlayView();

  // Add the container when the overlay is added to the map.
  overlay.onAdd = function() {
    var layer = d3.select( this.getPanes().overlayLayer )
                    .append("div")
                    .attr("class", "stations");

    // Draw each marker as a separate SVG element
    overlay.draw = function() {
      var projection = this.getProjection(),
          padding = 10;

      var marker = layer.selectAll("svg")
                          .data(d3.entries(data))
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

      function transform(d, i) {
        d = new google.maps.LatLng(latLng[1][0], latLng[1][1]);
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