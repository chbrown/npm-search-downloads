#!/usr/bin/env node
'use strict'; /*jslint node: true, es5: true, indent: 2 */
var JSONStream = require('JSONStream');
var redis = require('redis');
var async = require('async');
var npm = require('npm');
var nano = require('nano')('http://isaacs.iriscouch.com:5984');
var optimist = require('optimist');

function maybe(err) { if (err) console.error(err); }

function add_pkg_count() {
  // Error: You are not a db or server admin.
  var downloads = nano.use('downloads');
  downloads.insert({
    _rev: '5-26cb7e3e9a02fe31ebaee05238727155',
    language: 'javascript',
    views: {
      "broken": {
        "map": "function (doc) {\n  if (typeof doc.count !== 'number')\n    emit(doc._id, doc._id)\n}"
      },
      "pkg": {
        "map": "function (doc) {\n  if (typeof doc.count === 'number')\n    emit([doc.pkg, doc.day], doc.count)\n}",
        "reduce": "_sum"
      },
      "day": {
        "map": "function (doc) {\n  if (typeof doc.count === 'number')\n    emit([doc.day, doc.pkg], doc.count)\n}",
        "reduce": "_sum"
      },
      "count": {
        "map": "function (doc) {\n  if (typeof doc.count === 'number')\n    emit([doc.count, doc.pkg, doc.day], doc.count)\n}",
        "reduce": "_sum"
      },
      "pkg_count": {
        "map": "function (doc) {\n  if (typeof doc.count === 'number')\n    emit(doc.pkg, doc._id)\n}",
        "reduce": "_count"
      }
    }
  }, '_design/app', function (error, response) {
    console.log('inserted "count" view', error, response);
  });
  // alternatively, try to run it at the command line:
  // http -jv isaacs.iriscouch.com:5984/downloads/_temp_view \
  //   map="function (doc) {  if (typeof doc.count === 'number')    emit(doc.pkg, doc._id)}" \
  //   reduce="_count"
  // same error, dammit.
}

function refresh() {
  var client = redis.createClient();

  var ttl = 60*60*24; // 1 day in seconds
  var json_parser = JSONStream.parse('rows.*');
  json_parser.on('data', function(data) {
    // if group_level = 1:
    //   data = { key: [ 'amulet' ], value: 174 }
    // if group_level = 2:
    //   data = { key: [ 'amulet', '2012-07-24' ], value: 9 }
    var cache_key = 'npmjs:' + data.key[0] + '/downloads';
    console.log('SETEX ' + cache_key + ' ' + ttl + ' ' + data.value);
    client.setex(cache_key, ttl, data.value, maybe);
  });
  json_parser.on('root', function(root, count) {
    // root will be {rows: new Array(count)}
    // console.log('root', root, 'count', count);
    // apparently you have to quit the client before Node.js will exit.
    console.log('Updated ' + count + ' download counts.');
    client.quit();
  });

  // the view 'app/pkg' with group_level=1 returns: {rows: [..., {key: ['amulet'], value: 380}, ...]}
  // var pkg_args = {group_level: 1, startkey: ['amulet', "2012-01-01"], endkey: ['amulet', "2013-01-01"]};
  nano.use('downloads').view('app', 'pkg', {group_level: 1}).pipe(json_parser);
}

function search(argv) {
  var client = redis.createClient();

  // npm.commands.search(searchTerms, [silent,] [staleness,] callback)
  npm.load(argv, function(err) {
    maybe(err);
    npm.commands.search(argv._, true, function(err, packages) {
      maybe(err);
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
      var names = Object.keys(packages);
      console.log('Found ' + names.length + ' packages.');
      async.map(names, function(name, callback) {
        var cache_key = 'npmjs:' + name + '/downloads';
        client.get(cache_key, function(err, count) {
          maybe(err);
          packages[name].downloads = count || -1;
          callback(err, packages[name]);
        });
      }, function(err, packages) {
        maybe(err);
        packages.forEach(function(pkg) {
          console.log(JSON.stringify(pkg));
        });
        client.quit();
      });
    });
  });
}

if (require.main === module) {
  var argv = optimist.default({loglevel: 'warn'}).argv;
  search(argv);
}
