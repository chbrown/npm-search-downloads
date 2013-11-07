#!/usr/bin/env node
'use strict'; /*jslint es5: true, node: true, indent: 2 */
var downloads = require('..');

var optimist = require('optimist');
var argv = optimist.default({
  loglevel: 'warn',
  sort: 'downloads',
}).argv;

downloads.search(argv, function(err, pkgs) {
  if (err) {
    return console.error('downloads.search failed:', err);
  }

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
    var tabulate = require('../tabulate');
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
