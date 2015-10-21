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

		return function (...args) {
			/**
			 * Bypass authentication if required
			 */
			if(options.auth === false){
				return interface._fetch(handler.apply(this, args));
			}

			/**
			 * Check for the authenticator
			 */
			if(!interface._authenticator)
				throw new Meteor.Error("Missing authenticator");

			/**
			 * Wrap async
			 */
			let syncAuth = Meteor.wrapAsync(interface.authenticate, interface);
			
			/**
			 * Authentication is required for this method so we need to
			 * make sure that the first argument is a string
			 */
			if(!args.length || !_.isString(args[0])){
				throw new Meteor.Error("Authenticaton Required, first parameter needs to be token.");
			}

			/**
			 * Authenticate
			 * execptions will be throw by the wrapAsync
			 */
			try {
				this.auth = syncAuth(args.shift());
			} catch (err) {
				throw new Meteor.Error(err.message);
			}

			/**
			 * Call the handler
			 */
			return interface._fetch(handler.apply(this, args));
		}
	}
}