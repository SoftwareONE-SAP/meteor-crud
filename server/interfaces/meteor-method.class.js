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
				console.error(
					`Error on ${name} [Method/${crudName}] - Invalid Args`,
				);
				throw new Meteor.Error("invalid_args");
			}

			const handler = Meteor.wrapAsync(crud.handle.bind(crud));

			let req = { interface, type, name, args };

			try {
				this.unblock();
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
				console.error(
					new Date(),
					`Error on ${name} [Method/${crudName}] -` +
					interface.normalizeError(err),
					'Request args: ' + JSON.stringify(args)
				);
				throw new Meteor.Error(interface.normalizeError(err));
			}
		};

		Meteor.methods(methods);
	}
}
