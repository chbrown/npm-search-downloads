# npm-search-downloads

Layer on top of `npm search` that joins download counts (over last month) with packages.

**v0.3.0**: Fixed to use the npmjs.org download count [API](https://api.npmjs.org) instead of the CouchDB database that was removed in February 2014.

This is useful for helping the rich get richer. Also, for developing your Node.js app faster, because you'll spend less time trying to evaluate, from a list of `npm search some_api` results, which are well documented, functional, etc.


**Install:**

    npm install -g npm-search-downloads

**Example search:**

    npm-search-downloads xml --sort downloads


As of `v0.2.0`, does not require Redis, though it is much faster with Redis.


## License

Copyright © 2013 Christopher Brown. [MIT Licensed](LICENSE).
