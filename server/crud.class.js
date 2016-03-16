/**
 *
 */
CRUD = class CRUD {
	/**
	 * CRUD Constructor
	 */
	constructor () {
		/**
		 * Interface container
		 * @type {Array}
		 */
		this._interfaces = [];

		this._routes = [];
	}

	/**
	 * Converts an error message/object to a string
	 */
	normalizeError(err) {
		if(err instanceof Meteor.Error) return err.error;
		if(err instanceof Error)        return err.message;
		if(typeof err === 'string')     return err;
		return 'Internal Server Error';
	}

	/**
	 * Add an interface to the CRUD router
	 * @param {[type]} interface [description]
	 */
	addInterface(interface) {
		/**
		 * @todo Validate interface correctly
		 */
		if(interface in this._interfaces)
			throw new Meteor.Error("CRUD", 'Interface already added');

		/**
		 * Give the interface some context
		 */
		interface.setContext(this);

		/**
		 * Add the itnerface to the interface lists
		 */
		this._interfaces.push(interface);
	}

	/**
	 * Register a route.
	 * @param {[string]}   name    Optional name to match against
	 * @param {[number]}   type    Optional crud type
	 * @param {[function]} handler Handler to be called
	 *
	 * 1. crud.use("notifications", CRUD.TYPE_READ, function (req, res, next){});
	 * 2. crud.use("notifications", function (req, res, next){});
	 * 3. crud.use(CRUD.TYPE_READ, function (req, res, next){});
	 * 4. crud.use(function (req, res, next){});
	 *
	 * 1. The handler is called for any READ "notifications" requests
	 * 2. The handler is called for any type of "notification" requests
	 * 3. The handler is called for any READ requests
	 * 4. The handler is called for all requests
	 */

	use (...args) {
		const handler = args.pop();

		let name, type;
		if (args.length === 2) {
			name = args[0];
			type = args[1];
		} else if (args.length === 1) {
			if (typeof args[0] === 'string') name = args[0];
			if (typeof args[0] === 'number') type = args[1];
		}

		let error = handler.length === 4;

		this._routes.push({ name, type, handler, error });
		this._interfaces.forEach(interface => {
			try {
				interface.use(name, type);
			} catch (err) {
				// @todo - Die here
			}
		});
	}

	create (...args) {
		let pass = [];
		pass.push(args.pop());
		pass.unshift(CRUD.TYPE_CREATE);
		if (args.length) pass.unshift(args.pop());
		return this.use(...pass);
	}

	read (...args) {
		let pass = [];
		pass.push(args.pop());
		pass.unshift(CRUD.TYPE_READ);
		if (args.length) pass.unshift(args.pop());
		return this.use(...pass);
	}

	update (...args) {
		let pass = [];
		pass.push(args.pop());
		pass.unshift(CRUD.TYPE_UPDATE);
		if (args.length) pass.unshift(args.pop());
		return this.use(...pass);
	}

	del (...args) {
		let pass = [];
		pass.push(args.pop());
		pass.unshift(CRUD.TYPE_DELETE);
		if (args.length) pass.unshift(args.pop());
		return this.use(...pass);
	}

	handle (context, req, done) {

		let error;
		let toSend;
		let onStop;
		let sendResponse = false;

		let filename;
		let content_type = 'application/json';

		let res = {
			sendBinary: (data, opt={}) => {
				res.send(data);
				this._done	 = true;
				sendResponse = true;
				if (opt.filename) filename = opt.filename;
				if (opt.type)     content_type = opt.type;
			},
			send: (data) => {
				if (typeof toSend !== 'undefined') {
					throw "Already specified data to send";
				}
				toSend = data;
			},
			end: (data) => {
				if (typeof data !== 'undefined') res.send(data);
				this._done	 = true;
				sendResponse = true;
			},
			added: (id, doc) => {
				if (typeof toSend === 'undefined') toSend = [];
				doc._id = id;
				toSend.push(doc);
			},
			ready: (opt={}) => {
				if (typeof toSend === 'undefined') toSend = [];

				if (opt.single) toSend = toSend[0];

				if (opt.counter && toSend.length === 1) {
					toSend = toSend[0].count;
				}

				res.end();
			},
			onStop: (callback) => {
				onStop = callback.bind(context);
			},
			counter: (cur) => {
				var ready = false;
				var count = 0;

				var handle = cur.observeChanges({
					added: () => {
						++count;
						if (ready) res.changed('count', { count: count });
					},
					removed: () => {
						res.changed('count', { count: --count });
					},
				});
				res.added('count', { count: count });
				ready = true;
				res.ready({ counter: true });

				res.onStop(function(){
					handle.stop();
				});
			},
		};

		if (['added', 'removed', 'changed', 'ready', 'onStop'].every(
			name => context[name])) {

			['added', 'removed', 'changed'].forEach(name => {
				if (context[ name ])
					res[ name ] = context[ name ].bind(context, req.name);
			});

			['onStop'].forEach(name => {
				if (context[ name ])
					res[ name ] = context[ name ].bind(context);
			});

			res.ready = function () {
				context.ready();
				res.end();
			};
		}

		const run = (i=0) => {
			if (res._done) {
				throw "Can not call next after finishing response";
			}

			if (i >= this._routes.length) {
				return done(error||404);
			}

			const route = this._routes[i];
			if (route.name && route.name !== req.name) return run(i+1);
			if (route.type && route.type !== req.type) return run(i+1);
			if (route.error !== !!error) return run(i+1);
			route.handler.call(context, req, res, err => {
				if (typeof err !== 'undefined') {
					error = err;
				}
				run(i+1)
			});

			if (sendResponse) {
				sendResponse = false;
				done(null, {
					data: toSend,
					onStop,
					filename,
					content_type,
				});
			}

		};
		run();
	}

	/**
	 * Create a unique namespace for the rpc name and call type
	 * @param  {String} name RPC Name
	 * @param  {String} type RPC Type
	 * @return {String} Namespaced name
	 */
	_namespace(name, type) {
		return name.toLowerCase();
		/**
		 * We'll leave it down to the interface to namespace
		 * as we dont want to enforce a type on the namespace for some
		 * interfaces such as HTTP.
		 */
		// return [name.toLowerCase(), RPC.TYPES[type]].join('.');
	}
}

/**
 * Export the default interfaces
 * @type {Object}
 */
CRUD.Interfaces = {
	Method: MeteorMethodInterface,
	Publication: MeteorPublishInterface,
	HTTP: MeteorHTTPInterface
};

/**
 * Create Type
 * @type {Number}
 */
CRUD.TYPE_CREATE = 0x1;

/**
 * Create Type
 * @type {Number}
 */
CRUD.TYPE_READ = 0x2;

/**
 * Create Type
 * @type {Number}
 */
CRUD.TYPE_UPDATE = 0x3;

/**
 * Create Type
 * @type {Number}
 */
CRUD.TYPE_DELETE = 0x4;

/**
 * CRUD.TYPES
 * @type {Object}
 */
CRUD.TYPES = {
	0x1: 'create',
	0x2: 'read',
	0x3: 'update',
	0x4: 'delete',
};
