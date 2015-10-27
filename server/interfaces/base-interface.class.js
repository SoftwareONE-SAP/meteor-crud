
BaseInterface = class BaseInterface {

	/**
	 * BaseInterface
	 * @param  {CRUD} context Crud context.
	 */
	constructor (context) {
		/**
		 * Set the context if inserted
		 */
		if(context)
			this.setContext(context);
	}

	/**
	 * Bind
	 * @return {[type]}
	 */
	bind() {
		throw new Meteor.Error("rpc.interface", "Bind is not implemented");
	}

	/**
	 * Unbind
	 * @return {[type]} [description]
	 */
	unbind() {
		throw new Meteor.Error("rpc.interface", "Bind is not implemented");
	}

	/**
	 * Setting the Crud context
	 * @param {CRUD} context Crud instance
	 */
	setContext(context) {
		this._context = context;
	}

	/**
	 * Getting the Crud context
	 * @return {CRUD}
	 */
	getContext() {
		return this._context;
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
	 * Fetch a result set if the value is a cursor
	 * @return {Object}
	 */
	_fetch(val) {
		if(_.isObject(val) && 'fetch' in val && _.isFunction(val.fetch)) {
			/**
			 * @todo Paginate here ??
			 */
			val = val.fetch();
		}

		/**
		 * If we are using astronomy then call the astronomy objects raw method
		 */
		if (_.isArray(val) && val.length && _.isFunction(val[0].raw)) {
			val = val.map(doc => doc.raw());
		}

		return val;
	}
}