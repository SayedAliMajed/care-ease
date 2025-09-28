const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/user');

const router = express.Router();

// Role-based middleware
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

// Render form to create new user
router.get('/create-user', isAdmin, (req, res) => {
  res.render('admin/create-user.ejs');
});

// Handle form submission to create new user
router.post('/create-user', isAdmin, async (req, res) => {
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

    await User.create({
      username,
      email,
      password: hashedPassword,
      role,
      profile,
    });

    res.redirect('/admin/users');
  } catch (error) {
    console.error(error);
    res.send('Error creating user');
  }
});

// List all users
router.get('/users', isAdmin, async (req, res) => {
  try {
    const users = await User.find();
    res.render('admin/user-list.ejs', { users });
  } catch (error) {
    console.error(error);
    res.redirect('/');
  }
});

// Admin dashboard
router.get('/dashboard', isAdmin, (req, res) => {
  res.render('admin/dashboard.ejs', { user: req.session.user });
});

// Employee dashboard
router.get('/employee/dashboard', isEmployee, (req, res) => {
  res.render('employee/dashboard.ejs', { user: req.session.user });
});

// Doctor dashboard
router.get('/doctor/dashboard', isDoctor, (req, res) => {
  res.render('doctor/dashboard.ejs', { user: req.session.user });
});

module.exports = router;
