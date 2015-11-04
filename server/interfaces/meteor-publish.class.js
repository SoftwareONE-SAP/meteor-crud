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
				if (this._transformer) {
					result = this._transformer(result);
				}
				return result;
			} catch (err) {
				throw new Meteor.Error(interface.normalizeError(err));
			}
		});
	}
}