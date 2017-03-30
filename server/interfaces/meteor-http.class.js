/**
 * Default max request size of 1MB
 */
const DEFAULT_MAX_REQUEST_SIZE = 1 * 1024 * 1024;

const qs                 = Npm.require('querystring');
const fs                 = Npm.require('fs');
const Fiber              = Npm.require('fibers');
const bodyParser         = Npm.require('body-parser');
const multiparty         = Npm.require('multiparty');
const contentDisposition = Npm.require('content-disposition');

MeteorHTTPInterface = class MeteorHTTPInterface extends BaseInterface {

	name () { return 'HTTP' }

	/**
	 * Constructor
	 */
	constructor(opt={}){
		super(...arguments);

		this._max_request_size = opt.max_request_size || DEFAULT_MAX_REQUEST_SIZE;

		/**
		 * Base path
		 * @type {String}
		 */
		this._base_path = '/rpc/';

		/**
		 * Declare the base path as a network path
		 */
		RoutePolicy.declare(this._base_path, 'network');

		/**
		 * Inversion table to exchange CRUD for HTTP Verbs
		 * @type {Object}
		 */
		this.__crud_to_verbs = {
			'create': 	'POST',
			'read': 	'GET',
			'update': 	'PUT',
			'delete': 	'DELETE'
		};

		/**
		 * Create the handlers
		 */
		this._handlers = {
			GET: {},
			POST: {},
			PUT: {},
			DELETE: {}
		}

		let parserOpt = {
			limit: this._max_request_size,
		};

		/**
		 * Intercept HTTP Connections
		 */
		WebApp.rawConnectHandlers.use(bodyParser.raw(parserOpt));
		WebApp.rawConnectHandlers.use(bodyParser.urlencoded({
			...parserOpt,
			extended: true,
		}));
		WebApp.rawConnectHandlers.use(bodyParser.json(parserOpt));
		WebApp.rawConnectHandlers.use((...outerArgs) => {
			let call = _.bind(this._intercept, this);

			Fiber(() => { call(...outerArgs) }).run();
		});
	}

	/**
	 * Get the HTTP equivilent to the CRUD type
	 * @param  {String} type CRUD type
	 * @return {String}      HTTP Verb
	 */
	_verbize(type) {
		return this.__crud_to_verbs[CRUD.TYPES[type].toLowerCase()];
	}

	/**
	 * Convert a RPC name to a mountable pathanme
	 * @param  {String} name RPC Name
	 * @return {String}      Pathized name
	 */
	_pathize(name) {
		return this._base_path + name.replace(/\./g, '/');
	}

	/**
	 * Unmarshal the request into a common options object
	 * @param  {Request} req Request
	 * @return {Object}
	 */
	_unmarshal(req) {
		/**
		 * Options object
		 * @type {Object}
		 */
		let options = {};

		/**
		 * First we use the query parameters
		 */
		_.extend(options, qs.parse(req._parsedUrl.query), req.body || {});

		/**
		 * Return the options
		 */
		return options;
	}

	/**
	 * Dispatch a response
	 * @param  {Response} res  Response Object
	 * @param  {Object} data Object to dispatch
	 * @param  {Number} code Status code
	 */
	_dispatch(res, data, code=200, opt={}) {

		let content_type = opt.content_type || 'application/json';

		if (opt.filename) {
			const type = opt.disposition || 'attachment';
			res.setHeader('Content-Disposition', contentDisposition(opt.filename, { type }));
		}

		if (opt.redirect) {

			res.setHeader('Location', data);
			res.writeHead(code);
			res.end();

		} else {

			if (content_type === 'application/json') {
				data = JSON.stringify(data);
			} else if (opt.content_encoding) {
				content_type += '; charset=' + opt.content_encoding;
			}

			data = new Buffer(data);
			res.setHeader('Content-Length', data.length);
			res.setHeader('Content-Type', content_type);
			res.writeHead(code);
			res.end(data);

		}

	}

	/**
	 * Dispatch an error response
	 * @param  {Response} 	res  Respons Object
	 * @param  {Object} 	data Object to dispatch
	 * @param  {Number} 	code Status code
	 */
	_dispatchError(res, err, code) {
		return this._dispatch(res, {
			error: this.normalizeError(err)
		}, code || 500);
	}

	/**
	 * Intercept HTTP Requests
	 * @param  {Request}    req  [description]
	 * @param  {Response}   res  [description]
	 * @param  {Function}   next [description]
	 */
	_intercept(req, res, next) {
		const iface = this;
		const crud = iface.getContext();

		/**
		 * dirty check to exclude none crud operations
		 */
		if(!this._handlers[req.method])
			return next();

		/**
		 * Check to see if the pathanme is something where intersted in
		 * this._handlers[req.method]
		 */
		if(!(req._parsedUrl.pathname in this._handlers[req.method]))
			return next();

		/**
		 * Fetch the procedure
		 * @type {Function}
		 */
		const data = this._handlers[req.method][req._parsedUrl.pathname]
		let args = this._unmarshal(req);
		const handler = Meteor.wrapAsync(crud.handle.bind(crud));

		/**
		 * multipart/form-data parsing
		 */
		let files = null;
		try {
			const res = this.multipart(req);
			if (res) {
				files = res.files;
				args = { ...args, ...res.fields };
			}
		} catch (err) {
			return next(err.message);
		}

		try {
			let result = handler(req, {
				interface: iface,
				type: data.type,
				name: data.name,
				args,
				files,
			});

			/**
			 * Clean up files from multipart/form-data POSTs
			 */
			if (files) {
				Object.keys(files).forEach(field => {
					files[ field ].forEach(file => fs.unlink(file.path));
				});
			}


			if (typeof result.data === 'object' && typeof result.data.fetch === 'function') {
				result.data = result.data.fetch();
			}
			if (typeof result.data !== 'undefined' && result.data !== null) {
				if (iface._transformers) {
					iface._transformers.forEach(transformer => {
						result.data = transformer.call(iface, result.data);
					});
				}
			}

			let opt = {
				filename:         result.filename,
				disposition:	  result.disposition,
				content_type:     result.content_type,
				content_encoding: result.content_encoding,
			        redirect:         result.redirect,
			};



			if (result.redirect) {
				this._dispatch(res, result.data.url, result.data.code, opt);
			} else {
				this._dispatch(res, result.data, 200, opt);
			}


			if (result.onStop) result.onStop();
		} catch (err) {
			console.error(
				new Date(),
				`Error on ${data.name} (HTTP/${req.method}):` +
				this.normalizeError(err),
				'Request args: ' +
				JSON.stringify(args)
			);
			this._dispatchError(res, err, 500);
		}

	}

	/**
	 * If this is a multipart/form-data request, then parses it
	 * and returns parsed fields and file data, otherwise returns
	 * undefined
	 */
	multipart (req) {
		const type = req.headers['content-type']||'';

		if (!type.match(/^multipart\/form-data(?:\s*;.*)?$/i)) {
			return;
		}

		return Meteor.wrapAsync(callback => {
			const form = new multiparty.Form({
				maxFieldsSize: this._max_request_size,
				maxFilesSize:  this._max_request_size,
			});
			form.parse(req, (err, fields, files) => {
				if (err) return callback(err);
				Object.keys(files||{}).forEach(field => {
					files[field] = files[ field ].map(file => {
						file.name = file.originalFilename;
						delete file.originalFilename;
						delete file.fieldName;
						file.type = file.headers['content-type'] || 'application/octet-stream';
						delete file.headers;
						return file;
					}).filter(file => {
						const keep = file.name || file.size
						if (!keep) fs.unlink(file.path);
						return keep;
					});
					if (files[field].length === 0) delete files[field];
				});
				callback(err, {
					fields: fields || {},
					files:  files  || {},
				});
			});
		})();
	}

	use (name, type) {
		const iface = this;
		const crud = iface.getContext();

		/**
		 * Convert the type to a verb
		 */
		let verb = this._verbize(type);

		/**
		 * Currently we swap the dont notation to slashes to make it
		 * rest like
		 */
		let path = this._pathize(name);

		this._handlers[verb][path] = { name, type };
	}
}
