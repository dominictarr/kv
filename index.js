#! /usr/bin/env node
/*
  very simple kv store setup for to be able to append to each document.
  each value is stored in a separate file,
  put, get, return streams
*/

var fs     = require('fs')
var mkdirP = require('mkdirp')
var es     = require('event-stream')
var crypto = require('crypto')
var EventEmitter = require('events').EventEmitter
var join   = require('path').join

function hash (key) {
  return crypto.createHash('sha1').update(key).digest('hex')
}

module.exports = kvdb

function id (i) { return i }

function kvdb (basedir, streamer) {
  //by default, use newline seperated json.
  streamer = streamer || function (stream) {
    var s
    if(stream.writable) {
      s = es.stringify()
      s.pipe(stream)
    } else
      s = stream.pipe(es.split()).pipe(es.parse())
    return s 
  }

  var emitter = new EventEmitter()

  function put (key, opts) {
    var _key = hash(key)
    var dir  = _key.substring(0, 2)
    var file = key
    var stream = es.gate(true)
    mkdirP(join(basedir, dir), function (err) {
      if(err)
        return stream.emit('error', err)
      stream.pipe(fs.createWriteStream(join(basedir, dir, file), opts))
      stream.open()
    })
    emitter.emit('put', key, Date.now(), stream, opts)
    return streamer(stream, key)
  }

  function get(key, opts) {
    var _key = hash(key)
    var dir  = _key.substring(0, 2)
    return streamer(fs.createReadStream(join(basedir, dir, key), opts), key)
  }

  function has(key, callback) {
    var _key = hash(key)
    var dir  = _key.substring(0, 2)
    fs.stat(join(basedir, dir, key), callback) 
  }
 
  function del(key, cb) {
    var _key = hash(key)
    var dir  = _key.substring(0, 2)
    var file = _key.substring(2)    
    emitter.emit('del', key, Date.now())
  }

  var ls = put('__list', {flags: 'a'})
  emitter.on('put', function (key, time) {
    ls.write(JSON.stringify(['put', key, time]) + '\n')
  })
  emitter.on('del', function (key, time) {
    ls.write(JSON.stringify(['del', key, time]) + '\n')
  })

  emitter.put = put
  emitter.get = get
  emitter.del = del
  emitter.has = has

  return emitter
}


if(!module.parent) {
  var argv = require('optimist').argv
  var op = (argv._[0] || '').toLowerCase()
  var key = argv._[1]
  var base = argv.base || argv.b || process.env.KV_BASE

  if(!~['put', 'get', 'del', 'has'].indexOf(op)
    || (!key || key.length < 1) || !base) {
    var e = console.error
    e('USAGE: kv put|get|del|has $KEY --base $BASEDIR')
    e('')
    e('  source | kv put $KEY   # write a record')
    e('')
    e('  kv get $KEY | sink     # read a record')
    e('')
    e('  kv del $KEY            # delete a record')
     e('')
    e('  kv get __list          # get list of changes')
    e('')
    e('  kv has $KEY            # test wether $KEY is in db')
    process.exit(1)
  }

  var kv = kvdb(base, id) //do not convert to json

  if(op == 'get') 
    kv.get(key).pipe(process.stdout)
  else if (op == 'put')
    process.stdin.pipe(kv.put(key))
  else if (op == 'del')
    kv.del(key, function () {})
  else if (op == 'has')
    kv.has(key, function (err, has) {
      if(err) console.error(err.message)
      process.exit(has ? 0 : 1)
    })
}
