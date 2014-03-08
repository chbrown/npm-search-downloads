/*jslint node: true */
var async = require('async');
var request = require('request');
var stores = require('./stores');

var lookup = function(name, store, callback) {
  // callback signature: function(err | null, downloads: Number)
  var cache_key = 'npmjs:' + name;
  store.get(cache_key, function(err, cache_value) {
    if (err) return callback(err);

    if (cache_value) {
      callback(null, parseInt(cache_value, 10));
    }
    else {
      // e.g., https://api.npmjs.org/downloads/point/last-month/flickr-with-uploads
      // {
      //   downloads: 47,
      //   start: "2014-02-06",
      //   end: "2014-03-07",
      //   package: "flickr-with-uploads"
      // }
      var url = 'https://api.npmjs.org/downloads/point/last-month/' + name;
      console.log('GET', url);
      request.get({
        json: true,
        url: url,
      }, function (err, response, body) {
        if (err) return callback(err);

        store.set(cache_key, body.downloads);
        callback(null, body.downloads);
      });
    }
  });
};

exports.addMetadata = function(packages, callback) {
  var limit = 20;

  stores.initialize(function(err) {
    var store = stores.createStore();

    async.mapLimit(packages, limit, function(pkg, callback) {
      lookup(pkg.name, store, function(err, downloads) {
        pkg.downloads = downloads;
        callback(null, pkg);
      });
    }, function(err, packages) {
      // cleanup
      store.close();
      callback(err, packages);
    });
  });
};
