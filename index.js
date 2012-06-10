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

var formats = {
  raw: function (stream) {
    return stream
  },
  json: function (stream, key) {
    /*
      if anyone ever wants to use this for something other than
      new line seperated json, this will need to be modified.
      because the __list record will still be a stream of arrays.

      either handle it differently, by it's key,
      or make it possible to by-pass the streamer, or add a header or something.
      hmm. or a way to force it to write a raw stream.

      or maybe just have a separate set of records for headers?
      or the first line?

      I know:

        you go: get[format](key) //and can add more formats. json, raw, etc.
    */
    var s
    if(stream.writable) {      
      s = es.stringify()
      s.pipe(stream)
    } else
      s = stream.pipe(es.split()).pipe(es.parse())
    return s 
  }
}

function mkFormat(fn, format) {
  return function () {
    return format(fn.apply(null, arguments))
  }
}

function addFormats(fn) {
  var f = mkFormat(fn, formats.json)
  for(k in formats) 
    f[k] = mkFormat(fn, formats[k])
  return f
}

function kvdb (basedir) {
  //by default, use newline seperated json.
  var emitter = new EventEmitter()
  var keys = []
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
    return stream
  }

  function get(key, opts) {
    var _key = hash(key)
    var dir  = _key.substring(0, 2)
    return fs.createReadStream(join(basedir, dir, key), opts)
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

  function list() {
    return Object.keys(keys)
  }

  function addToKeys (data) {
    if(data[0] = 'put')
      keys[data[1]] = true
    else
      delete keys[data[1]] 
  }
  //wrap formats arount get and put, so you can go get.json(key) or get.raw(key)
  emitter.put = addFormats(put)
  emitter.get = addFormats(get)
  emitter.del = del
  emitter.has = has
  emitter.list = list

  //TODO smarter way to compact the __list, so that can have last update.
  var ls = emitter.put.json('__list', {flags: 'a'})
  emitter
    .on('put', function (key, time) {
      if(!keys[key])
        ls.write(['put', key, time])
    })
    .on('del', function (key, time) {
      if(keys[key])
        ls.write(['del', key, time]) 
    })
    .on('put', addToKeys)
    .on('del', addToKeys)
  
  emitter.has('__list', function (err) {
    if(err)
      emitter.emit('sync')
    else
      emitter.get.json('__list').on('data', addToKeys).on('end', function () {
        emitter.emit('sync')
      })
  })

 return emitter
}


if(!module.parent) {
  var argv = require('optimist').argv
  var op = (argv._[0] || '').toLowerCase()
  var key = argv._[1]
  var base = argv.base || argv.b || process.env.KV_BASE

  if (!~['put', 'get', 'del', 'has'].indexOf(op) && 
     (!key || key.length < 1) && op !== 'list' || !base) {
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

  var kv = kvdb(base)

  if(op == 'get') 
    kv.get.raw(key).pipe(process.stdout)
  else if (op == 'put')
    process.stdin.pipe(kv.put.raw(key))
  else if (op == 'del')
    kv.del(key, function () {})
  else if (op == 'has')
    kv.has(key, function (err, has) {
      if(err) console.error(err.message)
      process.exit(has ? 0 : 1)
    })
  else if (op == 'list') {
    kv.on('sync', function () {
      console.log(kv.list().join('\n'))
    })
  }
}
