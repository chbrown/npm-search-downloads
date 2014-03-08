#!/usr/bin/env node
'use strict'; /*jslint es5: true, node: true, indent: 2 */
var commands = require('../commands');

var argv = require('optimist')
  .describe({
    json: 'output one json document per search result',
    sort: 'ordering',
  })
  .default({
    port: 6501,
  })
  .argv;



commands.search(argv, function(err, pkgs) {
  if (err) return console.error('commands.search failed:', err);

  if (argv.json) {
    pkgs.forEach(function(pkg) {
      console.log(JSON.stringify(pkg));
    });
  }
  else {
    pkgs.forEach(function(pkg) {

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

      ['downloads', 'stars', 'watchers'].forEach(function(key) {
        pkg[key] = (pkg[key] !== undefined && pkg[key] !== null) ? pkg[key].toString() : '';
      });

      pkg.author = (pkg.author && pkg.author.name) ? pkg.author.name : pkg.author;
      // pkg.date = pkg.time.slice(0, 10);
      if (Array.isArray(pkg.keywords)) {
        pkg.keywords = pkg.keywords.join(' ');
      }
    });

    var tabulate = require('../tabulate');
    var output = tabulate(pkgs, {
      columns: [
        ['downloads', Number, 7],
        // ['stars', Number, 5],
        // ['watchers', Number, 8],
        ['name', String, 20],
        ['description', String, 60],
        ['author', String, 20],
        // ['date', String, 20],
        ['keywords', String, Infinity],
      ],
      terms: argv._,
      sort: argv.sort,
      reverse: argv.reverse,
    });
    console.log(output);
  }
});
