/**
 * 
 */
MeteorPublishInterface = class MeteorPublishInterface extends BaseInterface {

	/**
	 * Bind a call
	 * @return {[type]} [description]
	 */
	bind (name, type, options, handler) {
		/**
		 * We only ever expose READ functions over a publication
		 * as we 
		 */
		if(type !== CRUD.TYPE_READ)
			console.log(`PUBLICATION: Ignoring ${name}::${type}`);

		Meteor.publish(name, this._wrapFetch(options, handler));
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
			if(options.auth === false)
				return handler.apply(this, args);

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
			return handler.apply(this, args);
		}
	}
}