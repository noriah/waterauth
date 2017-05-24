'use strict'

module.exports.routes = {

  'post /register': 'UserController.create',
  'post /logout': 'AuthController.logout',
  'get /logout': 'AuthController.logout',

  // //// //
  // AUTH //
  // //// //
  // 'post /auth/local': 'AuthController.callback',
  // 'post /auth/local/:action': 'AuthController.callback',
  'post /auth/local/register': 'UserController.create',

  'post /auth/sendVerify': 'UserController.sendVerificationEmail',
  'get /auth/verify/:token': 'UserController.verifyEmail',

  'post /auth/sendReset': 'UserController.sendResetEmail',
  'post /auth/reset/:token': 'UserController.resetPassword',

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

  'get /user/:id?': 'UserController.findOne',

  'put /user?': 'UserController.update',

  'get /user/:userId/roles': 'UserController.getUserRoles',
  'get /user/:userId/permissions': 'UserController.getUserPermissions',

  // ///// //
  // ROLES //
  // ///// //
  'get /role?': 'RoleController.find',

  'get /role/:id?': 'RoleController.findOne',
  'post /role': 'RoleController.createRole',
  'delete /role/:id': 'RoleController.destroyRole',

  'get /role/:roleId/users': 'RoleController.getRoleUsers',
  'post /role/:roleId/users/:userIds': 'RoleController.addUsersToRole',
  'delete /role/:roleId/users/:userIds': 'RoleController.removeUsersFromRole',

  'get /role/:roleId/permissions': 'RoleController.getRolePermissions',
  'post /role/:roleId/permissions/:permissionames': 'RoleController.addPermissionsToRole',
  'delete /role/:roleId/permission/:permissionames': 'RoleController.removePermissionsFromRole',

  // /////////// //
  // PERMISSIONS //
  // /////////// //
  'get /permission?': 'PermissionController.find',
  'get /permission/:id?': 'PermissionController.findOne',
  'post /permission': 'PermissionController.createPermission',
  'get /permission/:permissionId/users': 'PermissionController.getUsersWithPermission',
  'get /permission/:permissionId/roles': 'PermissionController.getRolesWithPermission',
  'post /permission/grant': 'PermissionController.grant',
  'delete /permission/grant/:id': 'PermissionController.deleteGrant'
}
