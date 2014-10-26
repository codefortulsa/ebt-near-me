function Location() {
  var dfd = new $.Deferred(),
    _pos = {
      coords: {
        latitude: 36.1587336,
        longitude: -95.9940543
      }
    },
    _onMove = function(pos) {},
    options = {
      enableHighAccuracy: false
    }, // save device battery
    fail = function(err) {
      if (err) {
        console.warn('ERROR(' + err.code + '): ' + err.message);
      }
      dfd.reject(err)
    };
  //set default location
  Object.defineProperty(this, "lat", {
    get: function() {
      return _pos.coords.latitude
    }
  })
  Object.defineProperty(this, "lng", {
    get: function() {
      return _pos.coords.longitude
    }
  })
  Object.defineProperty(this, "pos", {
    get: function() {
      return {
        lng: _pos.coords.longitude,
        lat: _pos.coords.latitude
      };
    },
    set: function(new_pos) {
      _pos = new_pos
      if (_onMove) {
        _onMove(pos_desc.get())
      }
      dfd.resolve(this)
    }
  })
  this.on = {}
  this.on.move = function(fn) {
    _onMove = fn;
  }
  pos_desc = Object.getOwnPropertyDescriptor(this, 'pos');
  WatchID = navigator.geolocation.watchPosition(pos_desc.set, fail, options);
  this.ready = dfd.promise()
}


nearme = {
  map: null,
  user: null,
  'location': new Location(),
  options: {
    total: 20,
    layerUrl: 'http://cfa.cartodb.com/api/v2/viz/41b8ed52-23e4-11e4-9bed-0edbca4b5057/viz.json',
    logo: 'https://dnv9my2eseobd.cloudfront.net/v3/cartodb.map-4xtxp73f/{z}/{x}/{y}.png',
    attribution: 'Mapbox <a href="http://mapbox.com/about/maps" target="_blank">Terms &amp; Feedback</a>',
  },
  sublayers: [],
  subLayerOptions: {
    sql: "SELECT * FROM ebt_locations_usa LIMIT 10",
    cartocss: "#ebt_locations_usa{marker-fill: #F84F40; marker-width: 8; marker-line-color: white; marker-line-width: 2; marker-clip: false; marker-allow-overlap: true;}"
  },
  updateQuery: function(newCenter) {
    nearme.sublayers[0].set({
      sql: "SELECT cartodb_id, the_geom, the_geom_webmercator, store_name, address FROM ebt_locations_usa ORDER BY the_geom <-> ST_SetSRID(ST_MakePoint(" + newCenter.lng + "," + newCenter.lat + "),4326) ASC LIMIT " + nearme.options.total + "",
      cartocss: "#ebt_locations_usa{[mapnik-geometry-type = point]{marker-fill: #009d28; marker-line-color: #fff; marker-allow-overlap: true;}}"
    });
  },
  newPos: function() {
    nearme.user.setLatLng(nearme.location.pos)
  }
}

$(document).ready(function() {

  nearme.map = new L.Map('map', {
    center: nearme.location.pos,
    zoom: 15
  })

  L.tileLayer(nearme.options.logo, {
    attribution: nearme.options.attribution
  }).addTo(nearme.map);

  nearme.user = new L.CircleMarker(nearme.location.pos, {
    radius: 4
  }).addTo(nearme.map);

  cartodb.createLayer(nearme.map, nearme.options.layerUrl)
    .addTo(nearme.map)
    .on('done', function(layer) {
      // change the query for the first layer
      var sublayer = layer.getSubLayer(0);
      sublayer.set(nearme.subLayerOptions);
      sublayer.infowindow.set('template', $('#infowindow_template').html());
      nearme.sublayers.push(sublayer);

      //start tracking map moves
      nearme.map.on('moveend', function() {
        nearme.updateQuery(nearme.map.getCenter());
      })

      //start tracking user location
      nearme.location.ready
        .done(function() {
          nearme.newPos()
          // runs query only on the first location
          nearme.updateQuery(nearme.map.getCenter()); 
          nearme.map.setView(nearme.location.pos, 15);
          // reposition user mark on location watch but does not query ebt locations -- this avoids conflict with map move event
          nearme.location.on.move(nearme.newPos)
        })
        .fail(function(err) {
          //log the navigator error
        })

    })
    .on('error', function() {
      //log the cartodb error
    });
})
