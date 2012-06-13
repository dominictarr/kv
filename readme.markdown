# kv-stream

super simple key-value store, intended for keeping appendable files.

keeps the files in prefixed subdirectories, so that the directories do not get too large.

(see ls .git/objects/\* for a similar example)

## examples

###create an instance

`setup` is optional. `setup` is passed the stream created by `put` and `get`, may replace the stream passed to put/get
by default, the stream is handled as newline seperated json.

```
var kv = require('kv')('/tmp/kv')

```
### put a stream

`opts` is optional. see [fs.createWriteStream](http://nodejs.org/api/fs.html#fs_fs_createreadstream_path_options)

``` js
stream.pipe(kv.put(key, opts))
```

### get a stream

`opts` is optional. see [fs.createReadStream](http://nodejs.org/api/fs.html#fs_fs_createwritestream_path_options)

``` js
kv.get(key, opts).pipe(stream) 
```

### del a stream

``` js
kv.del(key, callback)
```

### list of keys

``` js
kv.list() //yes, it's sync

```

### has

check if db has a key

``` js
  kv.has(key, function (err, stat) {
    //return the stat of the stream, if it exists.
  })

```

### customization

to handle other types of streams than newline separated json, pass in a stream setup function to kv.

``` js
var rawKV = require('kv')(dir, function (stream, key) {
  return stream //just use raw streams, do not parse!
})
```

# cli

there is also a cli tool!

```
npm install kv -g

echo hello | kv put hello --base /tmp/kv
kv get hello --base /tmp/k

```
