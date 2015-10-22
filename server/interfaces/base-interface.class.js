
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
	 * Fetch a result set if the value is a cursor
	 * @return {Object}
	 */
	_fetch(val) {
		if(_.isObject(val) && 'fetch' in val && _.isFunction(val.fetch)) {
			/**
			 * @todo Paginate here ??
			 */
			return val.fetch();
		}

		return val;
	}
}