/**
 * 
 */
Tinytest.add("Router", (test) => {
})

/**
 * Test method calls
 */

Tinytest.addAsync("Router - Methods - Auth - Missing", function (test, next) {
	Meteor.call("read-test-auth", function (err, one) {
		test.instanceOf(err, Error, "Expected missing auth error");
		next();
	});
});

Tinytest.addAsync("Router - Methods - Auth - Failure", function (test, next) {
	Meteor.call("read-test-auth", "INVALID", function (err, one) {
		test.instanceOf(err, Error, "Expected auth failure error");
		next();
	});
});

Tinytest.addAsync("Router - Methods - Auth - Success", function (test, next) {
	Meteor.call("read-test-auth", "VALID", function (err, one) {
		test.isUndefined(err, "Expected undefined err");
		test.equal(one, 1, `Expected 1. Got ${one}`);
		next();
	});
});

Tinytest.addAsync("Router - Methods - Create", function (test, next) {
	Meteor.call("create-test.create", {one: 2, two: 4},  function (err, six) {
		test.isUndefined(err, "Expected undefined err");
		test.equal(six, 6, `Expected 6. Got ${six}`);
		next();
	});
});

Tinytest.addAsync("Router - Methods - Update", function (test, next) {
	Meteor.call("update-test.update", {one: 4, two: 2}, function (err, eight) {
		test.isUndefined(err, "Expected undefined err");
		test.equal(eight, 8, `Expected 8. Got ${eight}`);
		next();
	});
});

/**
 * Test HTTP calls	
 */

Tinytest.addAsync("Router - HTTP - Auth - Missing", function (test, next) {
	HTTP.get('/rpc/read-test-no-auth', {}, function (err, res) {
		test.isNull(err, "Expected undefined err");
		test.equal(res.data, 1);
		next();
	});
});

Tinytest.addAsync("Router - HTTP - Auth - Failure", function (test, next) {
	HTTP.get('/rpc/read-test-auth', {headers: {Authorization: "INVALID"}}, function (err, res) {
		test.instanceOf(err, Error, "Expected auth failure error");
		next();
	});
});

Tinytest.addAsync("Router - HTTP - Auth - Success", function (test, next) {
	HTTP.get('/rpc/read-test-auth', {headers: {Authorization: "VALID"}}, function (err, res) {
		test.isNull(err, "Expected null err");
		test.equal(res.data, 1, `Expected 1. Got ${res.data}`);
		next();
	});
});

Tinytest.addAsync("Router - HTTP - Auth - Create", function (test, next) {
	HTTP.post('/rpc/create-test', {data: {one: 2, two: 4}}, function (err, res) {
		test.isNull(err, "Expected null err");
		test.equal(res.data, 6, `Expected 6. Got ${res.data}`);
		next();
	});
});

Tinytest.addAsync("Router - HTTP - Auth - Update", function (test, next) {
	HTTP.put('/rpc/update-test', {data: {one: 2, two: 4}}, function (err, res) {
		test.isNull(err, "Expected null err");
		test.equal(res.data, 8, `Expected 8. Got ${res.data}`);
		next();
	});
});

Tinytest.addAsync("Router - HTTP - Auth - Delete", function (test, next) {
	HTTP.del('/rpc/delete-test', {data: {one: 2, two: 4}}, function (err, res) {
		test.isNull(err, "Expected null err");
		test.equal(res.data, -2, `Expected -2. Got ${res.data}`);
		next();
	});
});

/* Test PubSub */

Tinytest.addAsync("Router - PubSub", function (test, next) {
	next = _.once(next);

	let testCol = new Meteor.Collection('test');
	Meteor.subscribe('pubsub-test', function(){
		let res = testCol.findOne();
		test.equal(res.test, 123);
		next();
	});
	setTimeout(next, 10000);
});