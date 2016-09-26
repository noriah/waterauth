'use strict'

module.exports.routes = {

  'post /register': 'UserController.create',
  'post /logout': 'AuthController.logout',
  'get /logout': 'AuthController.logout',

  // //// //
  // AUTH //
  // //// //
  'post /auth/local': 'AuthController.callback',
  'post /auth/local/:action': 'AuthController.callback',

  'get /auth/:provider': 'AuthController.provider',
  'post /auth/:provider': 'AuthController.callback',
  'get /auth/:provider/callback': 'AuthController.callback',
  'post /auth/:provider/callback': 'AuthController.callback',
  'get /auth/:provider/:action': 'AuthController.callback',
  'post /auth/:provider/:action': 'AuthController.callback',

  //  ////// //
  //  TOKENS //
  //  ////// //
  // 'post /token/new': 'TokenController.newToken',
  'get /token/new': 'TokenController.newToken',

  // 'post /token/roles': 'TokenController.tokenRoles',
  'get /token/roles': 'TokenController.tokenRoles',

  // 'post /token/permissions': 'TokenController.tokenPermissions',
  'get /token/permissions': 'TokenController.tokenPermissions',

  // //// //
  // USER //
  // //// //
  'get /user?': 'UserController.find',

  'get /user/me': 'UserController.me',

  'get /user/:username': 'UserController.findOne',

  'get /user/:username/roles': 'UserController.getUserRoles',
  'post /user/:usernames/roles/:rolename': 'RoleController.addUsersToRole',
  'delete /user/:usernames/roles/:rolename': 'RoleController.removeUsersFromRole',

  'get /user/:username/permissions': 'UserController.getUserPermissions',

  // ///// //
  // ROLES //
  // ///// //
  'get /role?': 'RoleController.find',

  'get /role/:rolename': 'RoleController.findOne',
  'post /role/:rolename': 'RoleController.createRole',
  'delete /role/:rolename': 'RoleController.destroyRole',

  'get /role/:rolename/users': 'RoleController.getRoleUsers',
  'post /role/:rolename/users/:usernames': 'RoleController.addUsersToRole',
  'delete /role/:rolename/users/:usernames': 'RoleController.removeUsersFromRole',

  'get /role/:rolename/permissions': 'RoleController.getRolePermissions',
  'post /role/:rolename/permissions/:permissionames': 'RoleController.addPermissionsToRole',
  'delete /role/:rolename/permission/:permissionames': 'RoleController.removePermissionsFromRole',

  // /////////// //
  // PERMISSIONS //
  // /////////// //
  'get /permission/:permissionname/users': 'PermissionController.getUsersWithPermission',
  'get /permission/:permissionname/roles': 'PermissionController.getRolesWithPermission'
}
