var es = require('event-stream')

module.exports = function (prefix, exports) {

  exports = exports || {}

  //put, get, del, has

  exports.put = function (key, opts) {
    var _key = prefix+':'+key
    opts = opts || {flags: 'w'}
    if(opts.flags !== 'a' || !localStorage[_key])
      localStorage[_key] = ''
    //assume write if not explicit append.

    var ws = es.through(function (data) {
      localStorage[_key] += data + '\n'
    })

    //remove readable api.
    ws.readable = false
    delete ws.pause
    delete ws.resume

    return ws
  }

  exports.get = function (key, opts) { 
    var _key = prefix+':'+key
    var array = localStorage[_key].split(/(\n)/)
    if(!array[array.length - 1])
      array.pop() //expecting an empty '' at the end.
    return es.readArray(array) 
  }

  exports.del = function (key, cb) {
    var _key = prefix+':'+key
    process.nextTick(function () {
      if(!localStorage[_key])
        return cb(new Error ('no record: ' + key))

      delete localStorage[prefix+':'+key]
      cb()
    })
  }

  exports.has = function (key, cb) {
    var _key = prefix+':'+key
    process.nextTick(function () {
      if(!localStorage[_key])
        return cb(new Error ('no record: ' + key))
      cb()
    })
  }

  return exports
}
