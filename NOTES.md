## Using CouchDB and [nano](https://github.com/dscape/nano)

Prerequisite: load nano and connect to a database. We'll be playing with the [npmjs.org](https://npmjs.org/) repository.

    var nano = require('nano')('http://isaacs.iriscouch.com:5984');

CouchDB does everything through http, and there's a shallow UI called Futon that you can use at `/_utils`, e.g.:

> [isaacs.iriscouch.com/_utils/](http://isaacs.iriscouch.com/_utils/)

(Apparently, IrisCouch has CouchDB listening on `:80` as well as the default `:5984`).

Useful CouchDB documentation:

* http://kxepal.iriscouch.com/docs/1.3/references/structures.html
* http://wiki.apache.org/couchdb/HTTP_view_API#Querying_Options

### Handy CouchDB commands for exploring with nano

List all the databases:

    nano.db.list(function(err, dbs) {
      console.log('Found databases:');
      dbs.forEach(function(db) {
        console.log('- ' + db);
      });
    });

Shortcut to run queries on the "downloads" database:

    var downloads = nano.use('downloads');

Call a view with some parameters ("app" is just a name, like "pkg", that the database designers chose):

    // db.view(designname, viewname, [params], [callback])
    downloads.view('app', 'pkg', {group_level: 1}, function(err, body) {
      // one viewname is pkg, apparently.
      if (err) {
        console.error(err);
      }
      else {
        body.rows.forEach(function(doc) {
          console.log(doc.value);
        });
      }
    });

But this doesn't stream (see `/index.js` for the JSONStream solution).

### Other commands for toying with CouchDB on the command line

First, install a http getter and json beautifier:

    pip install httpie
    npm install json

`curl` works just fine, but with curl I have to escape the square brackets inside my urls for some reason. So I'll use a variety of these, where needed.

Quickstart `http` usage:

    http -jbS 'http://url.com'

* `-j` sets the `Accept:` to json, which makes CouchDB send back a `Content-Type:` of json, even though it usually sends back json anyway, but with a `Content-Type: text/plain` (which httpie will not format). But since these json responses aren't the same as the raw responses, I'll generally reformat with `json` instead of with `-j`.
* `-b` shows only the body of the response. (Like `curl -s`.)
* `-S` (or `--stream`) streams the response. This is the default in `curl`.

Show all the views that are available:

    http -b 'isaacs.iriscouch.com:5984/downloads/_all_docs?startkey="_design/"&endkey="_design0"&include_docs=true' | json

Get all downloads:

    curl -s 'isaacs.iriscouch.com:5984/downloads/_design/app/_view/pkg?group_level=1'

Get all downloads of package `amulet`:

    http -b 'http://isaacs.iriscouch.com:5984/downloads/_design/app/_view/pkg?group_level=1&startkey=["amulet"]&endkey=["amulet0"]' | json

Get all downloads of package `amulet` in 2012:

    http -b 'isaacs.iriscouch.com/downloads/_design/app/_view/pkg?group_level=1&startkey=["amulet","2012-01-01"]&endkey=["amulet","2013-01-01"]' | json

Get downloads per day of package `amulet` in 2011:

    curl -s 'isaacs.iriscouch.com/downloads/_design/app/_view/pkg?group_level=2&startkey=\["amulet","2012-01-01"\]&endkey=\["amulet","2013-01-01"\]'

Get total downloads from npmjs:

    curl -s 'isaacs.iriscouch.com/downloads/_design/app/_view/pkg'
