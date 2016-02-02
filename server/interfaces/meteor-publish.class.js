/**
 *
 */
MeteorPublishInterface = class MeteorPublishInterface extends BaseInterface {

	name () { return 'Publish' }

	use (name, type) {
		const interface = this;
		const crud = interface.getContext();

		if(type !== CRUD.TYPE_READ) return;

		Meteor.publish(name, function (args={}) {
			if (typeof args !== 'object') {
				throw new Meteor.Error("invalid_args");
			}

			const handler = Meteor.wrapAsync(crud.handle.bind(crud));

			let req = { interface, type, name, args };

			try {
				let result = handler(this, req);
				if (typeof result.data !== 'undefined' && result.data !== null) {
					if (interface._transformer) {
						result.data = interface._transformer(result.data);
					}
				}
				return result.data;
			} catch (err) {
				console.error(err);
				throw new Meteor.Error(interface.normalizeError(err));
			}
		});
	}
}
