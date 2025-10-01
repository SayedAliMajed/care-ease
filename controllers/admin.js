const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/user');
const Appointment = require('../models/appointment');

const router = express.Router();

// Central permission definitions by role and model
const permissions = {
  admin: { appointments: ['create', 'read', 'update', 'delete'], users: ['create', 'read', 'update', 'delete'] },
  employee: { appointments: ['create', 'read', 'update'], users: ['read'] },
  doctor: { appointments: ['read', 'update'], users: [] },
  patient: { appointments: ['create', 'read', 'update'], users: [] },
};

// Role check middleware
function isAdmin(req, res, next) {
  if (req.session?.user?.role === 'admin') return next();
  return res.status(403).send('Forbidden: Admins only');
}
function isEmployee(req, res, next) {
  if (req.session?.user?.role === 'employee') return next();
  return res.status(403).send('Forbidden: Employees only');
}
function isDoctor(req, res, next) {
  if (req.session?.user?.role === 'doctor') return next();
  return res.status(403).send('Forbidden: Doctors only');
}

function authorizeAction(model, action) {
  return (req, res, next) => {
    const role = req.session.user?.role;
    if (permissions[role]?.[model]?.includes(action)) {
      return next();
    }
    return res.status(403).send('Forbidden: insufficient permissions');
  };
}

// User management routes
router.get('/create-user', isAdmin, (req, res) => {
  res.render('admin/create-user.ejs');
});
router.post(
  '/create-user',
  isAdmin,
  authorizeAction('users', 'create'),
  async (req, res) => {
    try {
      const { username, email, password, confirmPassword, role, fullName, phone, address, department, specialty } = req.body;
      if (!username || !email || !password || !role) {
        return res.send('All fields are required');
      }
      if (password !== confirmPassword) {
        return res.send('Password and Confirm Password must match');
      }
      const existing = await User.findOne({ $or: [{ username }, { email }] });
      if (existing) {
        return res.send('Username or email already registered');
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const profile = { fullName, phone, address };
      if (role === 'employee') profile.department = department;
      if (role === 'doctor') profile.specialty = specialty;
      await User.create({ username, email, password: hashedPassword, role, profile });
      res.redirect('/admin/users');
    } catch (error) {
      console.error(error);
      res.send('Error creating user');
    }
  }
);
router.get('/users', isAdmin, authorizeAction('users', 'read'), async (req, res) => {
  try {
    const users = await User.find();
    res.render('admin/user-list.ejs', { users });
  } catch (error) {
    console.error(error);
    res.redirect('/');
  }
});

router.get('/dashboard', async (req, res) => {
  const role = req.session.user?.role;

  try {
    if (role === 'doctor') {
      const appointments = await Appointment.find({ doctorId: req.session.user._id });
      return res.render('dashboard/doctor', { user: req.session.user, appointments });
    }
    if (role === 'admin') {
      return res.render('dashboard/admin', { user: req.session.user });
    }
    if (role === 'employee') {
      return res.render('dashboard/employee', { user: req.session.user });
    }
    if (role === 'patient') {
      const appointments = await Appointment.find({ patient_id: req.session.user._id });
      return res.render('appointments/index', { user: req.session.user, appointments });
    }
    return res.status(403).send('Access denied');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

exports.dashboard = async (req, res) => {
  try {
    const userRole = req.session.user?.role;
    if (userRole === 'doctor') {
      const doctorId = req.session.user._id;

      const appointments = await Appointment.find({
        doctorId: doctorId,
        status: 'scheduled' 
      })
      .populate('patient_id', 'username','cpr') 
      .sort({ date: 1 });

      const mappedAppointments = appointments.map(app => ({
        ...app.toObject(),
        patientName: app.patient_id?.username || 'Unknown'
      }));

      return res.render('dashboard/doctor', {
        user: req.session.user,
        appointments: mappedAppointments
      });
    }



    res.redirect('/');
  } catch (error) {
    console.error('Error rendering dashboard:', error);
    res.status(500).send('Server error');
  }
};

module.exports = router;
