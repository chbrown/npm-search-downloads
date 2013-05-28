#!/usr/bin/env node
'use strict'; /*jslint node: true, es5: true, indent: 2 */
var JSONStream = require('JSONStream');
var redis = require('redis');
var async = require('async');
var npm = require('npm');
var nano = require('nano')('http://isaacs.iriscouch.com:5984');
var optimist = require('optimist');

function maybe(err) { if (err) console.error(err); }


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

function addDownloads(pkgs, callback) {
  // add download data to each package in pkgs.
  // callback signature: function(err, pkgs)
  var client = redis.createClient();
  console.log('Found ' + pkgs.length + ' pkgs.');
  async.map(pkgs, function(pkg, callback) {
    var cache_key = 'npmjs:' + pkg.name + '/downloads';
    client.get(cache_key, function(err, count) {
      if (err || count === null) {
        callback(err || 'cache miss');
      }
      else {
        pkg.downloads = count;
        callback(null, pkg);
      }
    });
  }, function(err, pkgs) {
    client.quit();
    callback(err, pkgs);
  });
}

function search(argv) {
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
      // drop the redundant keys:
      // package is a reserved word. we'll go with pkgs
      var pkgs = Object.keys(packages).map(function(key) { return packages[key]; });
      addDownloads(pkgs, function(err, pkgs) {
        if (err) {
          console.error(err);
        }
        else {
          pkgs.forEach(function(pkg) {
            console.log(JSON.stringify(pkg));
          });
        }
      });
    });
  });
}

if (require.main === module) {
  var argv = optimist.default({loglevel: 'warn'}).argv;
  search(argv);
}
