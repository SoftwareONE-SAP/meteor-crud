/**
 *
 */
MeteorMethodInterface = class MeteorMethodInterface extends BaseInterface {

	name () { return 'Method' }

	use (name, type) {
		const interface = this;
		const crud = interface.getContext();

		const crudName   = CRUD.TYPES[type];
		const methodName = crudName === 'read' ? name : name + '.' + crudName;

		let methods = {};

		methods[ methodName ] = function (args={}) {
			if (typeof args !== 'object') {
				throw new Meteor.Error("invalid_args");
			}

			const handler = Meteor.wrapAsync(crud.handle.bind(crud));

			let req = { interface, type, name, args };

			try {
				let result = handler(this, req);
				if (typeof result.data === 'object' && typeof result.data.fetch === 'function') {
					result.data = result.data.fetch();
				}

				if (typeof result.data !== 'undefined' && result.data !== null) {
					if (interface._transformer) {
						result.data = interface._transformer(result.data);
					}
				}
				if (result.onStop) result.onStop();
				return result.data;
			} catch (err) {
				console.error(err);
				throw new Meteor.Error(interface.normalizeError(err));
			}
		};

		Meteor.methods(methods);
	}
}
