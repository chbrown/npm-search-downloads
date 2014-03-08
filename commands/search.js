/*jslint node: true */
var npm = require('npm');
var github = require('../github');
var downloads = require('../downloads');


module.exports = function(argv, callback) {
  /** search: like npm search
  npm.commands.search(searchTerms, [silent,] [staleness,] callback)

  callback: function(Error | null, [Object] | null)
  */
  npm.load(argv, function(err) {
    if (err) return callback(err);

    var search_terms = argv._;
    var staleness = 600;

    // npm.commands.search(argv._, true, function(err, packages) {
    npm.registry.get('/-/all', staleness, false, true, function(err, data) {
      if (err) return callback(err);
      /* These results look like this:
      'wd-capture':
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

      var all_packages = Object.keys(data).map(function(key) {
        return data[key];
      });

      var packages = all_packages.filter(function(pkg) {
        if (pkg.name) {
          var haystack = pkg.name;
          if (pkg.description) {
            haystack += pkg.description;
          }
          if (pkg.keywords) {
            haystack += pkg.keywords.toString();
          }

          return search_terms.every(function(needle) {
            return haystack.indexOf(needle) > -1;
          });
        }
        else {
          return false;
        }
      });

      console.info('Matched %d/%d packages', packages.length, all_packages.length);

      downloads.addMetadata(packages, callback);
      // github.addMetadata(packages, callback);
    });
  });
};
