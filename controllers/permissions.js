const permissions = {
  patient: {
    appointments: ['create', 'read', 'update'],
  },
  employee: {
    appointments: ['create', 'read', 'update', 'delete'],
    availabilitys: ['create', 'read', 'update', 'delete'],
    dashboard: ['read'],
    prescriptions: ['read'], 
  },
  doctor: {
    appointments: ['read', 'update'],
    availabilitys: ['create', 'read', 'update', 'delete'],
    dashboard: ['read'],
    prescriptions: ['create', 'read', 'update'], 
  },
  admin: {
    appointments: ['create', 'read', 'update', 'delete'],
    users: ['create', 'read', 'update', 'delete'],
    availabilitys: ['create', 'read', 'update', 'delete'],
    dashboard: ['read'],
    prescriptions: ['create', 'read', 'update', 'delete'], 
  },
};

module.exports = permissions;