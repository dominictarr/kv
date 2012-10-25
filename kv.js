/*
  very simple kv store setup for to be able to append to each document.
  each value is stored in a separate file,
  put, get, return streams
*/

var es     = require('event-stream')
var EventEmitter = require('events').EventEmitter
var timestamp    = require('monotonic-timestamp')
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
    stream.once('close', function () {
      s.emit('close')
    })
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
    var args = [].slice.call(arguments)
    args[0] = encodeURIComponent(args[0])
//    args[0].split('/').join('-')
//    console.log(args)
    return format(fn.apply(this, args))
  }
}

function addFormats(fn) {
  var f = mkFormat(fn, formats.json)
  for(k in formats) 
    f[k] = mkFormat(fn, formats[k])
  return f
}

module.exports = function (endpoints) {

  return function kv (basedir) {
    //by default, use newline seperated json.
    var emitter = new EventEmitter()
    var keys = {}
    var kary = []
    var ends = endpoints(basedir)

    function list() {
      return kary
      /*
      var _keys = []
      for (var k in keys)
        _keys.push(k)
      return _keys
      */
    }

    //that was a silly name.
    
    function addToKeys (key, time, stream) {
      key = decodeURIComponent(key)
      if(stream) {
        keys[key] = true
        kary.push(key)
        ls.write(['put', key, time])
      } else {
        delete keys[key]
        var i = kary.indexOf(key)
        if(~i) kary.splice(i, 1)
        ls.write(['del', key, time]) 
      }
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
    emitter.list = function () {
      return es.from(kary)
    }

    //TODO smarter way to compact the __list, so that can have last update.
    var ls = emitter.put.json('__list', {flags: 'a'})
    emitter
      .on('put', addToKeys)
      .on('del', addToKeys)
    emitter.has('__list', function (err) {
      if(err) //there arn't any documents stored yet.
        emitter.emit('sync')
      else
        emitter.get.json('__list').on('data', addToKeys).on('end', function () {
          emitter.emit('sync')
        })
    })

   return emitter
  }
}

