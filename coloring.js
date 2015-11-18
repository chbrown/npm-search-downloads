var colors = [31, 33, 32, 36, 34, 35];
var cl = colors.length;

function expandColorMarkers(str) {
  for (var i = 0; i < cl; i++) {
    var m = i + 1;
    var color = '\033[' + colors[i] + 'm';
    str = str.split(String.fromCharCode(m)).join(color);
  }
  var uncolor = '\033[0m';
  return str.split('\u0000').join(uncolor);
}

function addColorMarker(str, term, i) {
  var m = i % cl + 1;
  var markStart = String.fromCharCode(m);
  var markEnd = String.fromCharCode(0);

  if (term.charAt(0) === '/') {
    //term = term.replace(/\/$/, '')
    return str.replace(new RegExp(term.substr(1, term.length - 1), 'gi'), function(bit) {
      return markStart + bit + markEnd;
    });
  }

  // just a normal string, do the split/map thing
  var pieces = str.toLowerCase().split(term.toLowerCase());
  var p = 0;

  return pieces.map(function(piece, i) {
    piece = str.substr(p, piece.length);
    var mark = markStart + str.substr(p + piece.length, term.length) + markEnd;
    p += piece.length + term.length;
    return piece + mark;
  }).join('');
}

exports.colorTerms = function(str, terms) {
  terms.forEach(function(term, i) {
    str = addColorMarker(str, term, i);
  });
  return expandColorMarkers(str).trim();
};
