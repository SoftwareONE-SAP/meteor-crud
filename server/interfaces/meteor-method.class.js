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

		handler = this.getContext()._wrapBefore(this, name, type, options, handler);

		methods[name] = this._wrapFetch(handler);

		Meteor.methods(methods);
	}

	_wrapFetch(handler) {
		return (...args) => {
			try {
				return this._fetch(handler.call(this, ...args));
			} catch (err) {
				throw new Meteor.Error(this.normalizeError(err)); 
			}
		};
	}
}