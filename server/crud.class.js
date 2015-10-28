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

		/**
		 * CRUD Container
		 * @type {Object}
		 */
		this._cruds = {};

		/**
		 * Handlers to run on all requests
		 * before they hit the main bound handler
		 */
		this._before = [];
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
	 * Add handlers to run on all requests, before the bound one
	 */
	before(handler) {
		this._before.push(handler);
	}

	/**
	 * Wraps a request handler in a function which runs all of the
	 * "before" functions in order to fix-up the request, before
	 * running the main request handler. Parameters are passed
	 * through to each before handler.
	 * 
	 * @param  {object}   context The "this" object in handlers
	 * @param  {string}   name    Name of the binding
	 * @param  {number}   type    CRUD type
	 * @param  {object}   options Options for the binding
	 * @param  {function} handler Main handler
	 * @return {function}         The wrapper function
	 */
	_wrapBefore(context, name, type, options, handler) {
		return (...args) => {
			let beforeHandler;
			for (beforeHandler of this._before) {
				try {
					let syncBeforeHandler = Meteor.wrapAsync(beforeHandler.bind(context));
					syncBeforeHandler(name, type, options, args);
				} catch (err) {
					throw new Meteor.Error(this.normalizeError(err));
				}
			}
			return handler.call(context, ...args);
		};
	}

	/**
	 * Bind a method
	 * @param {String} name CRUD Name
	 * @param {String} type The CRUD Operation
	 * @param {Object} options options for setting up the CRUD Bindings
	 * @param {Function} handler CRUD function to call when required
	 * @return {Boolean} if the CRUD was setup
	 */
	bind(name, type, options, handler) {
		check(name, String);
		check(type, Match.OneOf(CRUD.TYPE_CREATE, CRUD.TYPE_READ, CRUD.TYPE_UPDATE, CRUD.TYPE_DELETE));
		check(options, Object);
		check(handler, Function);

		/**
		 * Setup the namespace index
		 * @type {String}
		 */
		name = this._namespace(name, type);

		/**
		 * Make sure the name hasnt already been registered
		 */
		if(name in this._cruds)
			throw new Meteor.Error("rpc", "Unable to register ({name}), already regsitered");

		/**
		 * Let all the itnerfaces know about our methods
		 */
		_.each(this._interfaces, (interface) => {
			interface.bind(name, type, options, handler);
		})
	}

	/**
	 * Unbind a RPC
	 * @param  {String} name CRUD Name
	 * @param  {String} type Crud operation
	 * @return {Boolean}     if the RPC was removed
	 */
	unbind(name, type) {}

	/**
	 * Create a unique namespace for the rpc name and call type
	 * @param  {String} name RPC Name
	 * @param  {String} type RPC Type
	 * @return {String}      Namespaced name
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