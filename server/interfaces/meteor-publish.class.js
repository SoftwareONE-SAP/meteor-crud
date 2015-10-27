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
		 */
		if(type !== CRUD.TYPE_READ) return;
		
		Meteor.publish(name, this._wrapFetch(options, handler));
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
				return handler.apply(this, args);
			} catch (err) {
				throw new Meteor.Error(this.normalizeError(err));
			}
		}
	}
}