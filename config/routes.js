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
  'get /auth/:provider/callback': 'AuthController.callback',
  'post /auth/:provider/callback': 'AuthController.callback',
  'get /auth/:provider/:action': 'AuthController.callback',

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
  'get /user/me': 'UserController.me',
  'get /user/:username': 'UserController.getUser',

  'get /user/:username/roles': 'UserController.getUserRoles',
  'post /user/:username/roles/:rolename': 'RoleController.addUserToRole',
  'delete /user/:username/roles/:rolename': 'RoleController.removeUserFromRole',

  'get /user/:username/permissions': 'UserController.getUserPermissions',

  // ///// //
  // ROLES //
  // ///// //
  'get /role?': 'RoleController.find',

  'get /role/:rolename': 'RoleController.findOne',
  'post /role/:rolename': 'RoleController.createRole',
  'delete /role/:rolename': 'RoleController.destroyRole',

  'get /role/:rolename/users': 'RoleController.getRoleUsers',
  'post /role/:rolename/users/:username': 'RoleController.addUserToRole',
  'delete /role/:rolename/users/:username': 'RoleController.removeUserFromRole',

  'get /role/:rolename/permissions': 'RoleController.getRolePermissions',
  'post /role/:rolename/permissions/:permissioname': 'RoleController.addPermissionToRole',
  'delete /role/:rolename/permission/:permissioname': 'RoleController.removePermissionFromRole',

  // /////////// //
  // PERMISSIONS //
  // /////////// //
  'get /permission/all/:permissionname': 'PermissionController.getObjectsWithPermission',
  'get /permission/users/:permissionname': 'PermissionController.getUsersWithPermission',
  'get /permission/roles/:permissionname': 'PermissionController.getRolesWithPermission'
}
