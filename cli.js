#! /usr/bin/env node

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

  var kv = require('./')(base)

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
