/**
 *
 */
const util    = Npm.require('util');
const toArray = Npm.require('stream-to-array');

MeteorMethodInterface = class MeteorMethodInterface extends BaseInterface {

	name () { return 'Method' }

	use (name, type) {
		const iface = this;
		const crud = iface.getContext();

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

			let req = { interface: iface, type, name, args };

			try {
				this.unblock();
				let result = handler(this, req);
				if (typeof result.data === 'object' && typeof result.data.fetch === 'function') {
					result.data = result.data.fetch();
				} else if (typeof result.data === 'object' && typeof result.data.pipe === 'function') {
					result.data = toArray(result.data).then((parts) => {
						const buffers = parts.map(part => util.isBuffer(part) ? part : Buffer.from(part));
						return Buffer.concat(buffers);
					});
				}

				if (typeof result.data !== 'undefined' && result.data !== null) {
					if (iface._transformers) {
						iface._transformers.forEach(transformer => {
							result.data = transformer.call(iface, result.data);
						});
					}
				}
				if (result.onStop) result.onStop();
				if (result.content_type === 'application/json') {
					return result.data;
				} else {
					let ret = {
						type: result.content_type,
						data: new Buffer(result.data).toJSON(),
					};
					if (result.filename) ret.filename = result.filename;
					if (result.content_encoding) ret.encoding = result.content_encoding;
					if (result.disposition) ret.disposition = result.disposition;
					return ret;
				}
			} catch (err) {
				console.error(
					new Date(),
					`Error on ${name} [Method/${crudName}] -` +
					iface.normalizeError(err),
					'Request args: ' + JSON.stringify(args)
				);
				if (err instanceof Meteor.Error) throw err;
				throw new Meteor.Error(iface.normalizeError(err));
			}
		};

		Meteor.methods(methods);
	}
}
