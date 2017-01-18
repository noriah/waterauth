module.exports.waterauth = {
  bcrypt: {
    rounds: 8
  },

  enforceIndex: true,

  modelConnectionName: '',

  adminFirstName: process.env.ADMIN_FNAME || 'Admin',
  adminLastName: process.env.ADMIN_LNAME || 'McAdminFace',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@example.com',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin1234',

  trackRequests: true,
  trackGetRequests: false,

  // If using local authentication, force users to verify their email address.
  verifyLocalEmail: true,

  // Possible fields for local register
  local: {
    verifyEmail: false,
    emailTemplate: 'verify',
    // verifyPage: '/auth/verify',
    verifySubjecT: 'Welcome to a SailsJS App -- Verify Email',
    fields: [
      'firstName',
      'lastName',
      'username',
      'name',
      'displayName',
      'phoneNumber',
      'phone',
      'email'
    ]
  }

}
