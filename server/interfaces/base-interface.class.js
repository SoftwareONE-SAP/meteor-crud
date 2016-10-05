
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

	setTransformer(transformer) {
		this._transformers = [transformer];
	}

	addTransformer(transformer) {
		if (!this._transformers) {
			this._transformers = [];
		}
		this._transformers.push(transformer);
	}

	/**
	 * Use
	 * @return {[type]}
	 */
	use() {
		throw new Meteor.Error("Crud.interface", "use is not implemented");
	}

	/**
	 * Name
	 * @return {[name]}
	 */
	name() {
		throw new Meteor.Error("Crud.interface", "name is not implemented");
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
		return this.getContext().normalizeError(err);
	}
}
