
BaseInterface = class BaseInterface {
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
	 * Set the authenticator for reqesuts
	 * @param {[type]} authenticator [description]
	 */
	setAuthenticator (authenticator) {
		if(!_.isFunction(authenticator)) {
			throw new Error("Authenticator must be a function");
		}

		/**
		 * Authemnticator
		 */
		this._authenticator = authenticator;
	}

	/**
	 * Authenticate the token
	 * @param  {[type]} token [description]
	 * @return {[type]}       [description]
	 */
	authenticate(token, callback) {
		this._authenticator(token, callback);
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