/*
  very simple kv store setup for to be able to append to each document.
  each value is stored in a separate file,
  put, get, return streams
*/

var es     = require('event-stream')
var EventEmitter = require('events').EventEmitter

module.exports = kv

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
    return format(fn.apply(this, arguments))
  }
}

function addFormats(fn) {
  var f = mkFormat(fn, formats.json)
  for(k in formats) 
    f[k] = mkFormat(fn, formats[k])
  return f
}

function kv (basedir) {
  //by default, use newline seperated json.
  var emitter = new EventEmitter()
  var ends = require('./endpoints')(basedir)
  var keys = {}

  function list() {
    var _keys = []
    for (var k in keys)
      _keys.push(k)
    return _keys
  }

  function addToKeys (data) {
    if(data[0] = 'put')
      keys[data[1]] = true
    else
      delete keys[data[1]] 
  }
  //wrap formats arount get and put, so you can go get.json(key) or get.raw(key)

  emitter.put = addFormats(function (key, opts) {
    var s = ends.put(key, opts)
    emitter.emit('put', key, Date.now(), s, opts)
    return s
  })
  emitter.get = addFormats(ends.get)
  emitter.del = function (key, cb) {
    emitter.emit('del', key, Date.now())
    ends.del(key, cb)
  }
  emitter.has = ends.has
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

