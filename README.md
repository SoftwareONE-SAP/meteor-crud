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

```javascript
1. Meteor.subscribe('products');
2. Meteor.call('products');
3. HTTP GET /rpc/products
```

Because `res.end()` was passed a Mongo cursor rather than array, the publication is reactive.

## CRUD Class (TODO)

### addInterface (TODO)

### use (TODO)

### create (TODO)

### read (TODO)

### update (TODO)

### del (TODO)

## Req Object (TODO)

## Res Object (TODO)

## Middleware (TODO)

## Custom Interfaces (TODO)

## Testing (TODO)
