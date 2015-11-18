var path = require('path');
var fs = require('fs');
var npm = require('npm');

var github = require('../github');
var downloads = require('../downloads');
// var mapToRegistry = require("./utils/map-to-registry.js")

module.exports = function(argv, callback) {
  /** search: like npm search
  npm.commands.search(searchTerms, [silent,] [staleness,] callback)

  callback: function(Error | null, [Object] | null)
  */
  npm.load(argv, function(err) {
    if (err) return callback(err);

    var search_terms = argv._;
    // var staleness = 600;
    // console.error('search_terms: %j', search_terms);

    // npm.commands.search(argv._, true, function(err, packages) {
    // npm.registry.get('/-/all', staleness, false, true, function(err, data) {
    var registry_path = path.join(process.env.HOME, '.npm/registry.npmjs.org/-/all/.cache.json');
    fs.readFile(registry_path, function(err, data) {
      if (err) return callback(err);
      data = JSON.parse(data);

      var all_packages = Object.keys(data).map(function(key) {
        return data[key];
      });

      // all_packages.filter(function(pkg) {
      //   // some packages have missing names?
      //   return pkg.name;
      // })
      var packages = all_packages.filter(function(pkg) {
        var haystack = [pkg.name, pkg.description, pkg.keywords].join(' ');

        return search_terms.every(function(needle) {
          return haystack.indexOf(needle) > -1;
        });
      });

      console.info('Matched %d / %d packages', packages.length, all_packages.length);

      downloads.addMetadata(packages, callback);
      // github.addMetadata(packages, callback);
    });
  });
};
