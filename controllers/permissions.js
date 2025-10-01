const permissions = {
  patient: {
    appointments: ['create', 'read', 'update'],
  },
  employee: {
    appointments: ['create', 'read', 'update', 'delete'],
    availabilitys: ['create', 'read', 'update', 'delete'],
  },
  doctor: {
    appointments: ['read', 'update'],
    availabilitys: ['create', 'read', 'update', 'delete'],
  },
  admin: {
    appointments: ['create', 'read', 'update', 'delete'],
    users: ['create', 'read', 'update', 'delete'],
    availabilitys: ['create', 'read', 'update', 'delete'],
  },
};

module.exports = permissions;
