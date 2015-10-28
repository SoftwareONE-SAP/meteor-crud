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
		
		handler = this.getContext()._wrapBefore(this, name, type, options, handler);

		Meteor.publish(name, this._wrapFetch(handler));
	}

	_wrapFetch(handler) {
		return (...args) => {
			try {
				return handler.call(this, ...args);
			} catch (err) {
				throw new Meteor.Error(this.normalizeError(err)); 
			}
		};
	}
}