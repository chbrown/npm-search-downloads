'use strict'; /*jslint es5: true, node: true, indent: 2 */ /* globals setImmediate */
var redis = require('redis');

var _in_memory_store = {};
var seconds_in_a_day = 24*60*60;


// redis, when it's available
var RedisStore = function() {
  this.client = redis.createClient();
};
RedisStore.prototype.close = function() {
  return this.client.quit();
};
RedisStore.prototype.get = function(key, callback) {
  return this.client.get(key, callback);
};
RedisStore.prototype.set = function(key, value, callback) {
  // console.log('SETEX ' + cache_key + ' ' + ttl + ' ' + data.value);
  return this.client.setex(key, seconds_in_a_day, value, function(err) {
    if (err) console.error('RedisStore.set: SETEX error: %s', err);
    callback(err);
  });
};


// in-memory, for when redis fails
// the memory store is a process-wide singleton, effectually just like redis (except redis is persistent)
var MemoryStore = function() {};
MemoryStore.prototype.close = function() {
  // do nothing
};
MemoryStore.prototype.get = function(key, callback) {
  return setImmediate(function() {
    return callback(null, _in_memory_store[key]);
  });
};
MemoryStore.prototype.set = function(key, value, callback) {
  return setImmediate(function() {
    _in_memory_store[key] = value;
    return callback(null);
  });
};


var ActiveStore = RedisStore;
exports.createStore = function() {
  return new ActiveStore();
};

exports.initialize = function(callback) {
  // test if redis is available
  var client = redis.createClient();
  client.on('error', function(err) {
    client.end();

    console.error('%s. Defaulting to in-memory store.', err);
    console.log('N.b.:  The in-memory store queries the npm database each time you run this script.');
    console.log('       It will be very slow and might irritate the nice Iris Couch people.');
    ActiveStore = MemoryStore;

    callback();
  });
  // make a simple request to test the connection
  client.info();
};
