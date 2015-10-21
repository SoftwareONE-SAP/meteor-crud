/**
 * 
 */
let qs 			= Npm.require("querystring");
let Fiber 		= Npm.require('fibers');
let bodyParser 	= Npm.require('body-parser');
/**
 * 
 */
MeteorHTTPInterface = class MeteorHTTPInterface extends BaseInterface {
	/**
	 * Constructor
	 */
	constructor(){
		super(...arguments);
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

		/**
		 * Intercept HTTP Connections
		 */
		WebApp.rawConnectHandlers.use(bodyParser.raw());
		WebApp.rawConnectHandlers.use(bodyParser.urlencoded({extended: true}));
		WebApp.rawConnectHandlers.use(bodyParser.json());
		WebApp.rawConnectHandlers.use((...outerArgs) => {
			let call = _.bind(this._intercept, this);

			Fiber(() => { call(...outerArgs) }).run();
		});
	}

	/**
	 * Bind a call
	 * @return {[type]} [description]
	 */
	bind (name, type, options, rpc) {
		/**
		 * Convert the type to a verb
		 */
		let verb = this._verbize(type);

		/**
		 * Currently we swap the dont notation to slashes to make it
		 * rest like
		 */
		let path = this._pathize(name);

		/**
		 * Push the RPC into the handlersrpc
		 */
		this._handlers[verb][path] = {options, rpc};
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
		return [options];
	}

	/**
	 * Authenticate a request
	 * @return {void}
	 */
	getAuthToken(req) {
		/**
		 * Firstly check the headers
		 */
		let token = req.headers['x-auth-token'] || req.headers['authorization'];

		/***
		 * Next we try the query string
		 */
		if(!token) {
			let parsedQuery = qs.parse(req._parsedUrl.query);
			token = parsedQuery['auth'] || parsedQuery['access-token'];
		}

		return token;
	}

	/**
	 * Dispatch a response
	 * @param  {Response} res  Response Object
	 * @param  {Object} data Object to dispatch
	 * @param  {Number} code Status code
	 */
	_dispatch(res, data, code) {
		res.writeHead(code || 200, {"Content-Type": "application/json"});
		res.end(JSON.stringify(data));
	}

	/**
	 * Dispatch an error response
	 * @param  {Response} 	res  Respons Object
	 * @param  {Object} 	data Object to dispatch
	 * @param  {Number} 	code Status code
	 */
	_dispatchError(res, err, code) {
		if(err instanceof Error)
			return this._dispatch(res, {error: err.message}, code || 500);

		if(err instanceof Object)
			return this._dispatch(res, err, code || 500);

		if(err instanceof String)
			return this._dispatch(res, {error: err}, code || 500);

		return this._dispatch(res, {error: "Internal server error."}, code || 500);
	}

	/**
	 * Intercept HTTP Requests
	 * @param  {Request}    req  [description]
	 * @param  {Response}   res  [description]
	 * @param  {Function}   next [description]
	 */
	_intercept(req, res, next) {
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
		let procedure = this._handlers[req.method][req._parsedUrl.pathname].rpc;

		/**
		 * Fetch the procedure
		 * @type {Function}
		 */
		let options = this._handlers[req.method][req._parsedUrl.pathname].options;

		/**
		 * Marshal the payload
		 */
		let payload = this._unmarshal(req);

		/**
		 * Fetch the auth token
		 */
		let authToken = this.getAuthToken(req);

		let complete = () => {
			try{
				this._dispatch(res, this._fetch(procedure.apply(req, payload)), 200);
			}catch(e) {
				this._dispatchError(res, e, 500);
			}
		}

		/**
		 * Start the auth validation
		 */
		if(options.auth === false){
			return complete();
		}

		/**
		 * Check for the authenticator
		 */
		if(!this._authenticator)
			throw new Meteor.Error("Missing authenticator");

		/**
		 * Authenticate Mode
		 */
		this.authenticate(authToken, (err, result) => {
			if(err) return this._dispatchError(res, err, 401);
			req.auth = result;
			complete();
		});
	}
}