'use strict'; /*jslint es5: true, node: true, indent: 2 */
// Error: You are not a db or server admin.
var nano = require('nano')('http://isaacs.iriscouch.com:5984');

// @isaacs!
// I would like to be able to count the number of repositories that I have download information for.
// I just need that single pkg_count view in place, but I don't have the ability to add it.

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
  console.log('inserted "pkg_count" view', error, response);
});

// alternatively, try to run it at the command line:
// http -jv isaacs.iriscouch.com:5984/downloads/_temp_view \
//   map="function (doc) {  if (typeof doc.count === 'number')    emit(doc.pkg, doc._id)}" \
//   reduce="_count"
// same error, dammit.
