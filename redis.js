var redis = require('kv-redis')
var kv = require('./kv')

module.exports = kv(redis)