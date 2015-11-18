#!/usr/bin/env node
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
