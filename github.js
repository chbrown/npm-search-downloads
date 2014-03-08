/*jslint node: true */
var async = require('async');
var request = require('request');

var stores = require('./stores');

var github = function(path, callback) {
  request.get({
    url: 'https://api.github.com/' + path,
    json: true,
    headers: {
      'User-Agent': 'npmjs.org/request',
      Authorization: 'token ' + process.env.GITHUB_TOKEN,
    }
  }, function (err, response, body) {
    if (err) return callback(err);

    callback(null, body);
  });
};

var lookup = function(owner, repo, store, callback) {
  // callback signature: function(err | null, stars: Number, watchers: Number)
  var cache_key = 'github:' + [owner, repo].join('/');
  store.get(cache_key, function(err, cache_value) {
    if (err) return callback(err);

    if (cache_value) {
      var parts = cache_value.split(',');
      callback(null, parseInt(parts[0], 10), parseInt(parts[1], 10));
    }
    else {
      var path = ['repos', owner, repo].join('/');
      github(path, function(err, res) {
        if (err) return callback(err);

        cache_value = [res.stargazers_count, res.watchers_count].join(',');
        store.set(cache_key, cache_value);

        callback(null, res.stargazers_count, res.watchers_count);
      });
    }
  });
};


// packages = {
//   ...,
//   csv: {
//     name: 'csv',
//     description: 'CSV parser with simple api, full of options and tested against large datasets.',
//     maintainers: [Object],
//     url: null,
//     keywords: [Object],
//     version: '0.0.2',
//     time: '2013-04-10 21:59',
//     words: 'csv csv parser with simple api... large datasets. =david node parser csv'
//   },
//   ...
// }

/* example raw registry item:
   { name: 'wd-capture',
     description: 'Capture some data from a page via wd.',
     'dist-tags': { latest: '0.0.1' },
     maintainers: [ [Object] ],
     readmeFilename: 'README.md',
     keywords: [ 'wd' ],
     author: { name: 'joshwnj' },
     license: 'MIT',
     time: { modified: '2014-03-06T01:43:57.694Z' },
     versions: { '0.0.1': 'latest' } },
*/

exports.addMetadata = function(packages, callback) {
  var limit = 20;

  stores.initialize(function(err) {
    var store = stores.createStore();

    async.mapLimit(packages, limit, function(pkg, callback) {
      // console.log('pkg', JSON.stringify(pkg, null, ' '));
      if (pkg.repository && pkg.repository.url && pkg.repository.url.indexOf('github.com') > -1) {

        var owner_repo = pkg.repository.url.split(/:|\//).slice(-2);
        lookup(owner_repo[0], owner_repo[1].replace(/\.git$/, ''), store, function(err, stars, watchers) {
          if (err) return callback(err);

          pkg.stars = stars;
          pkg.watchers = watchers;
          callback(null, pkg);
        });
      }
      else {
        pkg.stars = -1;
        pkg.watchers = -1;
        callback(null, pkg);
      }
    }, function(err, packages) {
      // cleanup
      store.close();

      callback(err, packages);
    });
  });
};
