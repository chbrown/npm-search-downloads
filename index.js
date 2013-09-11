#!/usr/bin/env node
'use strict'; /*jslint es5: true, node: true, indent: 2 */
var async = require('async');
var JSONStream = require('JSONStream');
var nano = require('nano')('http://isaacs.iriscouch.com:5984');
var npm = require('npm');

var stores = require('./stores');


function fillCache(callback) {
  var store = stores.createStore();

  console.info('Requesting download counts from the npm database. This can take a couple of minutes.');
  var json_parser = JSONStream.parse('rows.*');
  json_parser.on('data', function(data) {
    // if group_level = 1:
    //   data = { key: [ 'amulet' ], value: 174 }
    // if group_level = 2:
    //   data = { key: [ 'amulet', '2012-07-24' ], value: 9 }
    var cache_key = 'npmjs:' + data.key[0] + '/downloads';
    store.set(cache_key, data.value, function(err) {
      if (err) console.error('store.set error: %s', err);
    });
  });
  json_parser.on('root', function(root, count) {
    // root will be {rows: new Array(count)}
    // apparently you have to quit the client before Node.js will exit.
    console.info('Updated %d download counts.', count);
    store.close();

    callback();
  });

  // the view 'app/pkg' with group_level=1 returns: {rows: [..., {key: ['amulet'], value: 380}, ...]}
  // var pkg_args = {group_level: 1, startkey: ['amulet', "2012-01-01"], endkey: ['amulet', "2013-01-01"]};
  nano.use('downloads').view('app', 'pkg', {group_level: 1}).pipe(json_parser);
}

function addDownloads(pkgs, callback) {
  /** addDownloads: extend each item in pkgs with download data

  `pkgs`: [Object]
  `callback`: function(Error | null)
  */
  var store = stores.createStore();

  console.log('Found %d pkgs.', pkgs.length);
  async.each(pkgs, function(pkg, callback) {
    var cache_key = 'npmjs:' + pkg.name + '/downloads';
    store.get(cache_key, function(err, count) {
      if (err) return callback(err);

      pkg.downloads = count || 0;
      callback();
    });
  }, function(err) {
    store.close();

    if (err) return callback(err);

    var sum = 0;
    pkgs.forEach(function(pkg) {
      sum += pkg.downloads;
    });

    if ((sum / pkgs.length) < 1) {
      callback(new Error('Cache missing. Total downloads = ' + sum));
    }
    else {
      callback(err, pkgs);
    }
  });
}

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

// drop the redundant keys. and since package is a reserved word. we'll go with pkgs

var searchWithDownloads = function(keywords, callback) {
  // `npm` should already be loaded and `stores` should already be initialized
  npm.commands.search(keywords, true, function(err, packages) {
    if (err) return callback(err);

    var pkgs = Object.keys(packages).map(function(key) { return packages[key]; });
    addDownloads(pkgs, function(err, pkgs_with_downloads) {
      if (err) {
        // it's normal to get an error here, which means the cache is empty
        // so we try to fill the cache once. (don't try twice.)
        fillCache(function() {
          addDownloads(pkgs, callback);
        });
      }
      else {
        callback(null, pkgs_with_downloads);
      }
    });
  });
};

exports.search = function(argv, callback) {
  /** search: like npm search
  npm.commands.search(searchTerms, [silent,] [staleness,] callback)

  callback: function(Error | null, [Object] | null)
  */
  npm.load(argv, function(err) {
    if (err) return callback(err);

    stores.initialize(function(err) {
      if (err) return callback(err);

      searchWithDownloads(argv._, callback);
    });
  });
};
