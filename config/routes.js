'use strict'

module.exports.routes = {

  'post /register': 'UserController.create',
  'post /logout': 'AuthController.logout',
  'get /logout': 'AuthController.logout',

  'post /auth/local': 'AuthController.callback',
  'post /auth/local/:action': 'AuthController.callback',

  'get /auth/:provider': 'AuthController.provider',
  'get /auth/:provider/callback': 'AuthController.callback',
  'post /auth/:provider/callback': 'AuthController.callback',
  'get /auth/:provider/:action': 'AuthController.callback',

  'post /token/new': 'TokenController.newToken',
  'get /token/new': 'TokenController.newToken',
  'post /token/roles': 'TokenController.tokenRoles',
  'get /token/roles': 'TokenController.tokenRoles',
  'post /token/permissions': 'TokenController.tokenPermissions',
  'get /token/permissions': 'TokenController.tokenPermissions',

  'delete /role/:rolename/users/:username': 'RoleController.removeUserFromRole'

  // '/token/uses/:token': 'TokenController'

}
