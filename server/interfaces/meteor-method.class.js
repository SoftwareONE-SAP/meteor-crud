/**
 * 
 */
MeteorMethodInterface = class MeteorMethodInterface extends BaseInterface {

	/**
	 * Bind a call
	 * @return {[type]} [description]
	 */
	bind (name, type, options, handler) {
		let methods = {};

		let crudName = CRUD.TYPES[type];
		if (crudName !== 'read')
			name += '.' + crudName;

		methods[name] = this._wrapFetch(options, handler);
		Meteor.methods(methods);
	}

	/**
	 * 
	 */
	_wrapFetch(options, handler) {
		let interface = this;

		return (...args) => {

			/**
			 * Authentication if required
			 */
			if (options.auth !== false) {
				let authToken = _.isString(args[0]) ? args.shift() : null;
		 		try {
		 			this.auth = this.getContext().authenticate(authToken);
		 		} catch (err) {
		 			throw new Meteor.Error(this.normalizeError(err));
		 		}
			}

			/**
			 * Call the handler
			 */
			try {
				return interface._fetch(handler.apply(this, args));
			} catch (err) {
				throw new Meteor.Error(this.normalizeError(err)); 
			}
		}
	}
}