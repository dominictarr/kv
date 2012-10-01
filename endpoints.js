
var fs     = require('fs')
var mkdirP = require('mkdirp')
var fs     = require('fs')
var crypto = require('crypto')
var es     = require('event-stream')
var join   = require('path').join

function hash (key) {
  return crypto.createHash('sha1').update(key).digest('hex')
}

module.exports = function (basedir, exports) {
  exports = exports || {}

  /*
  okay, so this is gonna run in the browser, attached to localStorage also.


*/
  exports.put = function (key, opts) {
    var _key = hash(key)
    var dir  = _key.substring(0, 2)
    var file = key
    var stream = es.gate(true), inner
    mkdirP(join(basedir, dir), function (err) {
      if(err)
        return stream.emit('error', err)
      stream.pipe(
        fs.createWriteStream(join(basedir, dir, file), opts)
        .on('close', function () {
          stream.emit('close')
        })
      )
      stream.open()
    })
    return stream
  }

  exports.get = function (key, opts) {
    var _key = hash(key)
    var dir  = _key.substring(0, 2)
    var stream = es.gate(true)
    exports.has(key, function (err, stat) {
      if (err)
        return stream.end()

      stream.open()

      fs.createReadStream(join(basedir, dir, key), opts)
        .pipe(stream)
    })
    return stream
  }

  exports.has = function (key, callback) {
    var _key = hash(key)
    var dir  = _key.substring(0, 2)
    fs.stat(join(basedir, dir, key), callback)
  }

  function del(key, cb) {
    var _key = hash(key)
    var dir  = _key.substring(0, 2)
    var file = _key.substring(2)
  }

  return exports
}

