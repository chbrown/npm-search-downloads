# npm-search-downloads

This tool primarily replicates `npm search` but also joins the `registry` and `downloads` databases in the [npmjs.org](http://npmjs.org) registry to provide total download counts.

This is quite useful for helping the rich get richer. Also, for developing your Node.js app faster, because you'll spend less time trying to evaluate, from a list of `npm search some_api` results, which are well documented, functional, etc.

**Install:**

    npm install -g npm-search-downloads

**Example search:**

    npm-search-downloads csv


## Development

* [NOTES.md](NOTES.md): A quick intro to the structure of the npm CouchDB database (`isaacs.iriscouch.com`).
  These are mostly notes-to-self, but potentially useful to others hacking on or extending `npm` functionality.


## License

Copyright © 2013 Christopher Brown. [MIT Licensed](LICENSE).
