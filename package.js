Package.describe({
  name: 'centiq:crud',
  version: '1.0.9',
  summary: 'Apply crud operations across meteor methods publications and http.',
  git: 'https://github.com/Centiq/meteor-crud',
  documentation: 'README.md'
});

Npm.depends({
  'body-parser': '1.14.1',
  'content-disposition': '0.5.1',
  'multiparty': '4.1.2',
})

Package.onUse(function(api) {
  api.versionsFrom('1.2.0.2');
  api.use('ecmascript');
  api.use('ejson');
  api.use('underscore');
  api.use('routepolicy');
  api.use('webapp');
  api.use('check');

  api.addFiles('server/interfaces/base-interface.class.js', 'server');
  api.addFiles('server/interfaces/meteor-method.class.js',  'server');
  api.addFiles('server/interfaces/meteor-publish.class.js', 'server');
  api.addFiles('server/interfaces/meteor-http.class.js',    'server');
  api.addFiles('server/crud.class.js',                      'server');

  /**
   * Export the initialised instance
   */
  api.export("CRUD");
});

Package.onTest(function(api){
  api.use('ecmascript');
  api.use('ejson');
  api.use('underscore');
  api.use('check');
  api.use('http');
  api.use('tinytest');
  api.use('centiq:crud');

  api.addFiles('tests/server/server.js', 'server');
  api.addFiles('tests/server/client.js', 'client');
})
