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
		let nameFull = [name, CRUD.TYPES[type]].join('.');

		methods[nameFull] = this._wrapFetch(options, handler);
		Meteor.methods(methods);
	}

	/**
	 * 
	 */
	_wrapFetch(options, handler) {
		let interface = this;

		return (...args) => {
			/**
			 * Bypass authentication if required
			 */
			if(options.auth === false){
				return interface._fetch(handler.apply(this, args));
			}

			/**
		 	* Authenticate
		 	*/
		 	let authToken = _.isString(args[0]) ? args.shift() : null;
		 	try {
		 		this.auth = this.getContext().authenticate(authToken);
		 	} catch (err) {
		 		throw(new Meteor.Error(err.message));
		 	}

			/**
			 * Call the handler
			 */
			return interface._fetch(handler.apply(this, args));
		}
	}
}