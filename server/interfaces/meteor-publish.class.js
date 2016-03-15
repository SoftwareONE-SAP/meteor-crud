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
				console.error(`Error on ${name} [Publication] - Invalid args`);
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
					/**
					 * If a non-reactive array was returned, we need to call added
					 * for each element and then ready. Try and intelligently pick
					 * _id's for the documents
					 */
					if (Array.isArray(result.data)) {
						let last_id = 1, usedIds = {};
						result.data.forEach(doc => {
							let id = doc._id || doc.id || last_id;
							while (usedIds[ EJSON.stringify(id) ]) { id = ++last_id }
							usedIds[ EJSON.stringify(id) ] = true;
							this.added(name, id, doc);
						});
						return this.ready();
					}
				}
				return result.data;
			} catch (err) {
				console.error(
					new Date(),
					`Error on ${name} [Publication] -` + interface.normalizeError(err),
					'Request args: ' + JSON.stringify(args)
				);
				throw new Meteor.Error(interface.normalizeError(err));
			}
		});
	}
}
