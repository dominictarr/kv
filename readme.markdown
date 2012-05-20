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

`opts` is optional. see [http://nodejs.org/api/fs.html#fs_fs_createreadstream_path_options ](fs.createWriteStream)

``` js
stream.pipe(kv.put(key, opts))
```

### get a stream

`opts` is optional. see [http://nodejs.org/api/fs.html#fs_fs_createwritestream_path_options ](fs.createReadStream)

``` js
kv.get(key, opts).pipe(stream) 
```

### del a stream

``` js
kv.del(key, callback)
```

### list

all changes are logged to a special document, `'\_\_list'`. 

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
