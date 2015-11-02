/**
 * 
 */
MeteorPublishInterface = class MeteorPublishInterface extends BaseInterface {

	/**
	 * Bind a call
	 * @return {[type]} [description]
	 */
	bind (name, type, options, handler) {
		const self = this;

		/**
		 * We only ever expose READ functions over a publication
		 */
		if(type !== CRUD.TYPE_READ) return;
	
		Meteor.publish(name, function (...args) {
			try {
				return self.getContext().run(this, name, type, options, args, handler);
			} catch (err) {
				throw new Meteor.Error(self.normalizeError(err));
			}	
		});
	}
}