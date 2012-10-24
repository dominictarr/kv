

var rm = require('rimraf')
var assert = require('assert')
var es = require('event-stream')
var passed = false

process.on('exit', function () {
  assert(passed)
})

rm('/tmp/kv_test', function () {

  var kv = require('..')('/tmp/kv_test/' + Math.random())
  var es = require('event-stream')

  var p = kv.put('hello')
  var r = Math.random()

  p.write({hello: r})
  p.end()

  p.on('close', function () {
    var g = kv.get('hello')
    g.on('data', function (data) {
      assert.equal(data.hello, r)
      passed = true
    })
  })

  kv.list()
    .pipe(es.writeArray(function (err, ary) {
      assert.deepEqual(ary, ['hello'])
    }))
})

