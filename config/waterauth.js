module.exports.waterauth = {
  bcrypt: {
    rounds: 8
  },

  modelConnectionName: '',

  adminFirstName: process.env.ADMIN_FNAME || 'Admin',
  adminLastName: process.env.ADMIN_LNAME || 'McAdminFace',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@example.com',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin1234'

}
