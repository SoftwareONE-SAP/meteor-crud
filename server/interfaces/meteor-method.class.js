/**
 * 
 */
MeteorMethodInterface = class MeteorMethodInterface extends BaseInterface {

	/**
	 * Bind a call
	 * @return {[type]} [description]
	 */
	bind (name, type, options, handler) {
		const self = this;

		const crudName = CRUD.TYPES[type];
		if (crudName !== 'read')
			name += '.' + crudName;

		let methods = {};

		methods[ name ] = function (...args) {
			try {
				const res = self.getContext().run(this, name, type, options, args, handler);
				return self._fetch(res);
			} catch (err) {
				throw new Meteor.Error(self.normalizeError(err));
			}
		};

		Meteor.methods(methods);
	}
}