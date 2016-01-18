# Meteor CRUD

A framework for exposing CRUD (Create/Read/Update/Delete) operations from a Meteor application, via Meteor publications, Meteor methods and simple HTTP calls. Abstracting the interface for accessing the data, away from the interface for exposing the data.

## Example usage

```javascript
var Crud = new CRUD();

Crud.addInterface(new CRUD.Interfaces.Publication());
Crud.addInterface(new CRUD.Interfaces.Method());
Crud.addInterface(new CRUD.Interfaces.HTTP());

var Products = new Mongo.Collection('products');

Crud.read('products', function (req, res, next) {
  res.end(Products.find({ active: true }));
});
```

Given the above code, it would be possible to retrieve the list of products in three separate ways:

```
1. Meteor.subscribe('products');
2. Meteor.call('products');
3. HTTP GET /rpc/products
```

Because `res.end()` was passed a Mongo cursor rather than array, the publication is reactive.

## CRUD Class

The CRUD class is the core of the application. It handles registering interfaces and request handlers, normalising incoming requests and routing them to their appropriate request handler. This class tries to operate in a manner similar to the well known [Connect](https://www.npmjs.com/package/connect) framework for Node. The CRUD class constructor takes no arguments:

```javascript
var Crud = new CRUD();
```

Throughout the rest of this documentation assume `Crud` is an instance of the `CRUD` class.

### addInterface(interface)

The first thing you need to do after creating an instance of the CRUD class is register some interfaces. An "interface" is a class which provides functionality to expose request handlers to clients. This library comes with three built in interfaces (HTTP, Method and Publication), but you can always [write your own](#custom-interfaces). To add interfaces:

```javascript
Crud.addInterface(new CRUD.Interfaces.Publication());
Crud.addInterface(new CRUD.Interfaces.Method());
Crud.addInterface(new CRUD.Interfaces.HTTP());
```

Once an interface has been added, your application will immediately start processing incoming requests.

### use(name, type, handler)

"use" is how you register a route/middleware.

|         | Type       | Required | Description                    |
|---------|------------|----------|--------------------------------|
| name    | `String`   | No       | Optional name to match against |
| type    | `Number`   | No       | Optional CRUD type             |
| handler | `Function` | Yes      | Request handler                |

So there are four ways to call use:

```
1. Crud.use("products", CRUD.TYPE_READ, function (req, res, next){});
2. Crud.use("products", function (req, res, next){});
3. Crud.use(CRUD.TYPE_READ, function (req, res, next){});
4. Crud.use(function (req, res, next){});
```

```
1. The handler is called for any READ "products" requests
2. The handler is called for any type of "products" requests
3. The handler is called for any READ requests
4. The handler is called for all requests
```

There are some helper methods named "create", "read", "update" and "del" which wrap around the "use" method and supply the "type" argument for you. So instead of:

```javascript
Crud.use("products", CRUD.TYPE_CREATE, function (req, res, next){});
Crud.use("products", CRUD.TYPE_READ,   function (req, res, next){});
Crud.use("products", CRUD.TYPE_UPDATE, function (req, res, next){});
Crud.use("products", CRUD.TYPE_DELETE, function (req, res, next){});
```

You can:

```javascript
Crud.create("products", function (req, res, next){});
Crud.read(  "products", function (req, res, next){});
Crud.update("products", function (req, res, next){});
Crud.del(   "products", function (req, res, next){});
```

Note the use of "crud.del" instead of "crud.delete". This is because "delete" is already used by JavaScript for removing items from Objects.

So how does CRUD know which handler to route a request to if you register both a CREATE and an UPDATE handler with the same name? It depends on the Interface:

For HTTP, it is based on the HTTP request method. Incoming GET requests are routed to READ handlers, POST requests to CREATE handlers, PUT requests to UPDATE handlers and DELETE requests to DELETE handlers.

For Methods, the CRUD type is appended to the method name (except for READ). So if you define all four handlers for "products" as in the last example, you would call them each by doing:

```javascript
Meteor.call('products.create');
Meteor.call('products');
Meteor.call('products.update');
Meteor.call('products.delete');
```

Publications only make sense in a READ context. So if you register a CREATE, UPDATE or DELETE handler, a publication wont be created.

One other thing to note, if you use full stops in your method name, they are converted to forward slashes for HTTP requests. So if you made a handler for adding "computers" to your products list:

```javascript
Crud.create('products.computer', request_handler);
```

It would be called any one of these three ways:

```
1. Meteor.call('products.computer.create');
2. Meteor.subscribe('products.computer.create');
3. HTTP POST /rpc/products/computer
```

## Request handlers

A request handler is a function which is called with three arguments:

| Name  | Type     | Description         |
|-------|----------|---------------------|
| req   | Object   | The request object  |
| res   | Object   | The response object |
| next  | Function | A function which can be run to trigger the next matching router |

When a request comes in, the CRUD library runs through the registered request handlers, in the order they were added. Once it finds a matching handler, it runs it and then doesn't run any more. If you *do* want to run the next matching request handler, you just run the "next" function which was passed as the third argument to the handler. This is particularly useful when writing [middleware](#middleware).

Note: All request handlers are run inside a Fiber.

There is a special case of request handlers called error request handlers. You register them as functions with four arguments. They are only run when an error has been triggered.

Normal request handler:

```javascript
Crud.read(function(req, res, next){  
})
```

Error request handler:

```javascript
Crud.read(function(req, res, next, error){
})
```

The library determines what type of request handler you're registering by inspecting the number of arguments which it takes, so only specify a fourth argument when you are creating an error handler. To trigger an error handler, you either `throw` inside your handler, or you call `next` with the error message as it's only argument.

The `this` Object inside request handlers is defined by the interface in use. For request handlers run by the Method and Publication interfaces, the `this` object is the same as it would be inside a Meteor method or publication. For the HTTP Interface, the `this` object is what you would normally find in the `req` Object in a [Connect](https://www.npmjs.com/package/connect) request handler.

### `req`

The `req` object is the same format regardless of the Interface in use. It contains four items:

| Name      | Type             |
|-----------|------------------|
| interface | Interface object |
| type      | `Number`         |
| name      | `String`         |
| args      | `Object`         |

The `req.interface` object has a `name` function which you can call to determine which interface you're running under. For example:

```javascript
Crud.read(function(req, res, next){
  switch(req.interface.name()) {
    case 'HTTP':
      console.log("A HTTP request triggered me");
      break;
    case 'Method':
      console.log("A Meteor.call triggered me");
      break;
    case 'Publish':
      console.log("A Meteor.subscribe triggered me");
      break;
    default:
      console.log(
        "Some other custom interface named",
        req.interface.name(),
        "triggered me"
      );
  }
});
```

`req.type` contains a number representing the type of request matching one of:

```javascript
CRUD.TYPE_CREATE
CRUD.TYPE_READ
CRUD.TYPE_UPDATE
CRUD.TYPE_DELETE
```

This is useful when you've registered a handler which doesn't explicitly specify what type of request it deals with. For example:

```javascript
Crud.use('products', function(req, res, next){
  switch (req.type) {
    case CRUD.TYPE_CREATE:
      console.log("This is a CREATE request");
      break;
    case CRUD.TYPE_READ:
      console.log("This is a READ request");
      break;
    case CRUD.TYPE_UPDATE:
      console.log("This is a UPDATE request");
      break;
    case CRUD.TYPE_DELETE:
      console.log("This is a DELETE request");
      break;
    default:
      console.log("This will never be reached");
  }
});
```

`req.name` contains the name of the request handler. If a name wasn't specified at register time, then it will be undefined. For example:

```javascript
Crud.use('products', function(req, res, next){
  // req.name will contain "products". Note, it will not contain
  // "products.create" or "products.update" or "products.delete". It will
  // always contain just "products"
});

Crud.use(function(req, res, next){
  // req.name will be undefined
});
```

`req.args` contains the argument that were passed. It is interface specific. For the Method and Publish interfaces it contains the the first argument to the Meteor.call or Meteor.subscribe. For example:

```javascript
Crud.read('products', function(req, res, next){
  // req.args contains { foo: 123, bar: 234 }
});

Meteor.call('products', { foo: 123, bar: 234 }, 'Unused arg');
```

The reason we only look at the first argument, is because in the HTTP interface it only makes sense to have a single Object containing all of the arg data (an Array doesn't make sense), and we wanted to keep it consistent. The args for a HTTP request are merged from the query string and the HTTP request body. It will handle all of the usual body encodings, including JSON, and uses the extended URL encoding format. So for example a HTTP request for:

```
/rpc/products?foo=123&bar[x]=234
```

would produce a `req.args` containing:

```json
{ "foo": "123", "bar": { "x": "234" } }
```

### `res`

The res object contains two main functions named "send" and "end". When you've decided what you would like to send the client in response to their request, you do the following:

```javascript
Crud.create('products', function(req, res, next){
  var product_id = Products.insert(req.args);
  res.send({
    success: 1,
    product_id: product_id
  });
  res.end();
});
```

`res.send` is where you register what data should be sent to the client. `res.end` triggers the sending of the data and end of the request. You can combine the two as follows:

```javascript
Crud.create('products', function(req, res, next){
  var product_id = Products.insert(req.args);
  res.end({
    success: 1,
    product_id: product_id
  });
});
```

The reason we have `res.send` is in case you want to specify what data to send in this handler, but you want a subsequent handler to do something else before the request ends.

You can also pass a Mongo cursor to res.send or res.end. When necessary (for HTTP requests and method calls), the library will resolve the data from that cursor before passing it back to the client. For publications however, it will treat the cursor as a reactive data source.

For more complicated scenarios the res object has `res.added`, `res.removed`, `res.changed`, `res.ready` and `res.onStop`. This is for when you want to respond with data from a reactive source, which can not be represented by a simple Mongo query. An example being, you want to observe how many documents are returned from a Mongo query without sending them all to the client. You *could* do this with a simple:

```javascript
Crud.read('productCount', function(req, res, next){
  res.end({
    count: Products.find().count(),
  });
});
```

The trouble is, ".count" is non reactive. The above is fine for method and http calls, but for subscriptions, the count would never update. The solution to this problem:

```javascript
Crud.read('productCount', function(req, res, next){
  var cur    = Products.find();

  var count = 0, ready = false;
  var handle = cur.observeChanges({
    added: function (id, doc) {
      ++count;
      if (ready) res.changed('count', { count: count });
    },
    removed: function (id) {
      res.changed('count', { count: --count });
    }
  });
  res.added('count', { count: count });
  ready = true;
  res.ready();
  res.onStop(function(){
    handle.stop();
  });
});
```

The above would provide an end-point which outputs a collection with a single document like this:

```javascript
[
  {
    "_id": "count",
    "count": 3
  }
]
```

It works very similarly to an example on docs.meteor.com, except the res.added/removed/changed functions miss the first argument (the collection name) as it is taken from the CRUD end-point name. In the above example, it would be "productCount".

You can fetch it via HTTP or using a Method call as usual and when you subscribe to it, the collection is actually updated reactively.

Because publishing counters is such a common requirement, there is a simple helper method on the res object called "counter", meaning the above example can simply be written as:

```javascript
Crud.read('productCount', function(req, res, next){
  var cur = Products.find();
  res.counter(cur);
});
```

The only difference is, for non-subscription calls, you get just the counter, rather than an array containing a single document containing a "count" field. E.g:

```javascript
Meteor.call('productCount', function(count){
  // When using res.counter, "count" is a number rather than an array
  // of documents like [{_id:"count","count":n}]
});
```

### `next`

`next` should be called if you want the next matching handler to be run. For example, if you just want to log every request, you might do:

```javascript
Crud.use(function(req, res, next){
  console.log("Incoming request", req);
  next();
});
```

Like when using Connect, `next` can optionally be called with a single argument if you've decided that the request should generate an error response. At that point, the next matching error handler is run instead. Throwing an error triggers the same behaviour.

## Middleware

Middleware is something you add to run common operations on requests, for example authentication. It just uses `Crud.use` and is more of a concept than a new operation to learn. For example:

```javascript
/*
 * Auth middleware
 */
Crud.use(function(req, res, next){
  if (req.args.username === 'mike' && req.args.password === 'wibble') {
    req.auth = 'mike';
    delete req.args.username;
    delete req.args.password;
    next();
  } else {
    throw "Not authenticated";
  }
});

Crud.use('products', function(req, res, next){
  /*
   This will only be reached if req.args.username contained "mike"
   and req.args.password contained "wibble". Note, req.args no longer
   contains those two arguments because they were deleted in the auth
   middleware, but the username can now be found in "req.auth" as the
   middleware added it there.
  */
  res.end({ message: "You are logged in as", req.auth });
});
```

## Custom Interfaces

There is a slim chance that you may want to add a new interface other than HTTP, Publish and Method (SMTP or XMPP for example). To do this, you should extend the "BaseInterface" class and implement "use" and "name" functions. Look at the source code of the existing three interfaces to see how it is done there.

## Transformers

You may decide that you want to call res.send/res.end with objects other than cursors/arrays and simple JSON'able Objects, and handle them differently depending on the Interface. To do this, you call `setTransformer` on an interface before calling `Crud.addInterface`.

setTransformer takes a single argument. A `Function` which takes the response object, and returns the modified response object. For example, if you want to make sure that a "secret" is never delivered over the HTTP interface:

```javascript
var httpInterface = new CRUD.Interfaces.HTTP();
httpInterface.setTransformer(function(res){
  if (Array.isArray(res)) {
    res = res.map(function(doc){
      delete doc.secret;
      return doc;
    });
  } else {
    delete res.secret;
  }
  return res;
});
Crud.addInterface(httpInterface);
```

We added this capability because we wanted to use [Astronomy](https://atmospherejs.com/jagi/astronomy) for our collections. Meteor.publish can handle serving an Astronomy object, but the Astronomy object needed to be converted into a plain key/value object before being delivered over HTTP or as a response to a method call. For this, we simply added the following transformer to the HTTP and Method interfaces:

```javascript
function astronomyTransformer (res) {
  if (Array.isArray(res) && res[0] && typeof res[0].raw === 'function') {
    res = res.map(function(doc){
      return doc.raw();
    });
  }
  return res;
}
```
