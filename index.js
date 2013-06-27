#!/usr/bin/env node
'use strict'; /*jslint node: true, es5: true, indent: 2 */
var JSONStream = require('JSONStream');
var redis = require('redis');
var async = require('async');
var npm = require('npm');
var nano = require('nano')('http://isaacs.iriscouch.com:5984');
var optimist = require('optimist');

function maybe(err) { if (err) console.error(err); }


function fillCache(callback) {
  var client = redis.createClient();

  console.info('Updating cache of download counts.');
  console.info('This can take a couple of minutes.');
  var ttl = 60*60*24; // 1 day in seconds
  var json_parser = JSONStream.parse('rows.*');
  json_parser.on('data', function(data) {
    // if group_level = 1:
    //   data = { key: [ 'amulet' ], value: 174 }
    // if group_level = 2:
    //   data = { key: [ 'amulet', '2012-07-24' ], value: 9 }
    var cache_key = 'npmjs:' + data.key[0] + '/downloads';
    // console.log('SETEX ' + cache_key + ' ' + ttl + ' ' + data.value);
    client.setex(cache_key, ttl, data.value, maybe);
  });
  json_parser.on('root', function(root, count) {
    // root will be {rows: new Array(count)}
    // apparently you have to quit the client before Node.js will exit.
    console.info('Updated ' + count + ' download counts.');
    client.quit();
    // hopefully redis is done.
    if (callback) callback();
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
      if (err) {
        callback(err);
      }
      else {
        pkg.downloads = count || 0;
        callback(null, pkg);
      }
    });
  }, function(err, pkgs) {
    client.quit();
    if (err)
      return callback(err);
    var sum = 0;
    pkgs.forEach(function(pkg) {
      sum += pkg.downloads;
    });
    if ((sum / pkgs.length) < 1) {
      callback('Cache missing. Total downloads = ' + sum);
    }
    else {
      callback(err, pkgs);
    }
  });
}

function search(argv, callback) {
  // callback signature: function(err, pkgs)
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
      // drop the redundant keys. and since package is a reserved word. we'll go with pkgs
      var pkgs = Object.keys(packages).map(function(key) { return packages[key]; });
      addDownloads(pkgs, function(err, pkgs_with_downloads) {
        if (err) {
          console.error(err);
          // try to fill the cache once. (don't try twice.)
          fillCache(function() {
            addDownloads(pkgs, callback);
          });
        }
        else {
          callback(null, pkgs_with_downloads);
        }
      });
    });
  });
}

if (require.main === module) {
  var argv = optimist.default({loglevel: 'warn', sort: 'downloads'}).argv;
  search(argv, function(err, pkgs) {
    maybe(err);

    if (argv.json) {
      pkgs.forEach(function(pkg) {
        console.log(JSON.stringify(pkg));
      });
    }
    else {
      pkgs.forEach(function(pkg) {
        // parseInt(10)
        pkg.downloads = pkg.downloads.toString();
        pkg.author = pkg.maintainers.join(' ');
        pkg.date = pkg.time.slice(0, 10);
        if (Array.isArray(pkg.keywords)) {
          pkg.keywords = pkg.keywords.join(' ');
        }
      });
      var tabulate = require('./tabulate');
      var output = tabulate(pkgs, {
        columns: [
          ['downloads', Number, 8],
          ['name', String, 20],
          ['description', String, 60],
          ['author', String, 20],
          ['date', String, 20],
          ['keywords', String, Infinity],
        ],
        terms: argv._,
        sort: argv.sort,
        reverse: argv.reverse,
      });
      console.log(output);
    }
  });
}
