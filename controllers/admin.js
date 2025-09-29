const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/user');

const router = express.Router();

// Central permission definitions by role and model
const permissions = {
  admin: { appointments: ['create', 'read', 'update', 'delete'], users: ['create', 'read', 'update', 'delete'] },
  employee: { appointments: ['create', 'read', 'update'], users: ['read'] },
  doctor: { appointments: ['read', 'update'], users: [] },
  patient: { appointments: ['create', 'read', 'update'], users: [] },
};

// Broad role check middleware
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

// Admin user routes with combined checks
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

router.get('/dashboard', isAdmin, (req, res) => {
  res.render('admin/dashboard.ejs', { user: req.session.user });
});

router.get('/employee/dashboard', isEmployee, (req, res) => {
  res.render('employee/dashboard.ejs', { user: req.session.user });
});

router.get('/doctor/dashboard', isDoctor, (req, res) => {
  res.render('doctor/dashboard.ejs', { user: req.session.user });
});

module.exports = router;
