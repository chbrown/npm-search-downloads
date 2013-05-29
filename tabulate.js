var _ = require('underscore');

var colors = [31, 33, 32, 36, 34, 35];
var cl = colors.length;
var npm_color = true;

function maxWidth() {
  var cols = 0;
  try {
    var tty = require("tty");
    if (tty.isatty(process.stdout.fd)) {
      if (process.stdout._handle) {
        cols = process.stdout._handle.getWindowSize()[0];
      }
      else {
        cols = process.stdout.getWindowSize()[0];
      }
    }
  } catch (ex) {}
  return cols || Infinity;
}

function indexWhere(array, iterator) {
  for (var i in array) {
    if (iterator(array[i]))
      return i;
  }
  return -1;
}

// function unzipMap(array, iterator) {
//   return _.map(array, function(value) {
//     // i.e., if value.length == 3, iterator should be function(a, b, c) { }
//     return iterator.apply(null, value);
//   });
// }

function mapObject(list, object) {
  return list.map(function(key) { return object[key]; });
}

var cmp = {};
cmp[Number] = function(a, b) {
  a = parseInt(a, 10);
  b = parseInt(b, 10);
  if (a < b)
    return -1;
  if (a > b)
    return 1;
  return 0;
};
cmp[String] = function(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  if (a < b)
    return -1;
  if (a > b)
    return 1;
  return 0;
};

function colorizer(terms) {
  return function(line) {
    terms.forEach(function (term, i) {
      line = addColorMarker(line, term, i);
    });
    return colorize(line).trim();
  };
}

function prettify(objs, opts) {
  if (objs.length === 0)
    return 'No match found for "' + (opts.terms.join(' ')) + '"';

  // opts = { columns, highlight, sort, reverse }
  var columns_parts = _.zip.apply(null, opts.columns);
  var column_names = columns_parts[0];
  var column_types = columns_parts[1];
  var column_maxlens = columns_parts[2];
  var cols = maxWidth();

  var longest = [];
  var rows = [];
  for (var obj, obj_i = 0; (obj = objs[obj_i]); obj_i++) {
    var row = mapObject(column_names, obj);
    row._undent = [];

    for (var cell, col_i = 0; (cell = row[col_i]); col_i++) {
      var len = cell.length;
      longest[col_i] = Math.min(column_maxlens[col_i], Math.max(longest[col_i] || 0, len));
      if (len > longest[col_i]) {
        row._undent[col_i] = len - longest[col_i];
      }
      row[col_i] = cell.replace(/\s+/g, ' ');
    }
    rows.push(row);
  }

  if (opts.sort) {
    var sort_i = column_names.indexOf(opts.sort);
    var compareFunction = cmp[column_types[sort_i]];
    rows.sort(function(row_a, row_b) {
      return compareFunction(row_a[sort_i], row_b[sort_i]);
    });
  }
  if (opts.reverse) {
    rows.reverse();
  }

  var spaces = longest.map(function (n) {
    return new Array(n + 2).join(' ');
  });

  var lines = [];
  for (var row, row_i = 0; (row = rows[row_i]); row_i++) {
    var cells = [];
    for (var cell, col_i = 0; (cell = row[col_i]); col_i++) {
      var len = cell.length;
      if (row._undent && row._undent[col_i - 1]) {
        len += row._undent[col_i - 1] - 1;
      }
      cells.push(cell + spaces[col_i].substr(len));
    }
    lines.push(cells.join(' ').substr(0, cols).trim());
  }

  lines = lines.map(colorizer(opts.terms));

  // build the heading padded to the longest in each field
  var header_line = column_names.map(function (column_name, col_i) {
    var space = Math.max(2, 3 + (longest[col_i] || 0) - column_name.length);
    return column_name + (new Array(space).join(' '));
  }).join('').substr(0, cols).trim();
  lines.unshift(header_line);

  return lines.join('\n');
}

function addColorMarker(str, term, i) {
  var m = i % cl + 1;
  var markStart = String.fromCharCode(m);
  var markEnd = String.fromCharCode(0);

  if (term.charAt(0) === '/') {
    //term = term.replace(/\/$/, '')
    return str.replace(new RegExp(term.substr(1, term.length - 1), 'gi'), function (bit) {
      return markStart + bit + markEnd;
    });
  }

  // just a normal string, do the split/map thing
  var pieces = str.toLowerCase().split(term.toLowerCase());
  var p = 0;

  return pieces.map(function (piece, i) {
    piece = str.substr(p, piece.length);
    var mark = markStart + str.substr(p + piece.length, term.length) + markEnd;
    p += piece.length + term.length;
    return piece + mark;
  }).join('');
}

function colorize(line) {
  for (var i = 0; i < cl; i++) {
    var m = i + 1;
    var color = '\033[' + colors[i] + 'm';
    line = line.split(String.fromCharCode(m)).join(color);
  }
  var uncolor = '\033[0m';
  return line.split('\u0000').join(uncolor);
}

module.exports = prettify;
