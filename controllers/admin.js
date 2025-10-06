const express = require('express');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const User = require('../models/user');
const Appointment = require('../models/appointment');
const authorize = require('../middleware/authorize');

const router = express.Router();


// Unified Dashboard Route with proper authorization
router.get('/dashboard', authorize('dashboard', 'read'), async (req, res) => {
  try {
    const userRole = req.session.user.role;
    const userId = req.session.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let dashboardData = {
      user: req.session.user,
      role: userRole,
      stats: {},
      todayAppointments: [],
      recentAppointments: [],
      myAppointments: []
    };

    // Today's appointments
    let todayAppointmentsQuery = { date: { $gte: today, $lt: tomorrow } };
    if (userRole === 'doctor') {
      todayAppointmentsQuery.doctor_Id = userId;
    }

    dashboardData.todayAppointments = await Appointment.find(todayAppointmentsQuery)
      .populate('patient_id', 'profile.fullName profile.cpr profile.phone')
      .populate('doctor_Id', 'profile.fullName')
      .sort({ time: 1 })
      .limit(10)
      .lean();

    // Role-specific data
    if (userRole === 'admin') {
      dashboardData.stats = {
        totalUsers: await User.countDocuments(),
        totalDoctors: await User.countDocuments({ role: 'doctor' }),
        totalPatients: await User.countDocuments({ role: 'patient' }),
        totalEmployees: await User.countDocuments({ role: 'employee' }),
        totalAppointments: await Appointment.countDocuments(),
        pendingAppointments: await Appointment.countDocuments({ status: 'scheduled' }),
        todayAppointmentsCount: await Appointment.countDocuments({ date: { $gte: today, $lt: tomorrow } })
      };

      dashboardData.recentAppointments = await Appointment.find()
        .populate('patient_id', 'profile.fullName')
        .populate('doctor_Id', 'profile.fullName')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

    } else if (userRole === 'doctor') {
      dashboardData.stats = {
        myAppointments: await Appointment.countDocuments({ doctor_Id: userId }),
        myPendingAppointments: await Appointment.countDocuments({ doctor_Id: userId, status: 'scheduled' }),
        myCompletedAppointments: await Appointment.countDocuments({ doctor_Id: userId, status: 'completed' }),
        myTodayAppointments: await Appointment.countDocuments({ doctor_Id: userId, date: { $gte: today, $lt: tomorrow } })
      };

      dashboardData.myAppointments = await Appointment.find({ doctor_Id: userId, status: 'scheduled' })
        .populate('patient_id', 'profile.fullName profile.cpr profile.phone')
        .sort({ date: 1, time: 1 })
        .limit(10)
        .lean();

    } else if (userRole === 'employee') {
      dashboardData.stats = {
        totalAppointments: await Appointment.countDocuments(),
        pendingAppointments: await Appointment.countDocuments({ status: 'scheduled' }),
        todayAppointmentsCount: await Appointment.countDocuments({ date: { $gte: today, $lt: tomorrow } }),
        totalDoctors: await User.countDocuments({ role: 'doctor' }),
        totalPatients: await User.countDocuments({ role: 'patient' })
      };

      dashboardData.recentAppointments = await Appointment.find()
        .populate('patient_id', 'profile.fullName')
        .populate('doctor_Id', 'profile.fullName')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
    }

    
    res.render('dashboard/admin', dashboardData);
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).render('error', {
      message: 'Unable to load dashboard',
      user: req.session.user
    });
  }
});

// Create User Form
router.get('/create-user', authorize('users', 'create'), async (req, res) => {
  try {
    res.render('admin/create-user', { 
      user: req.session.user,
      error: null,
      formData: {}
    });
  } catch (error) {
    res.redirect('/admin/dashboard');
  }
});

// Create User
router.post('/create-user', authorize('users', 'create'), async (req, res) => {
  try {
    const { username, email, password, confirmPassword, role, fullName, phone, address, department, specialty, cpr } = req.body;
    
    if (!username || !email || !password || !role || !fullName || !cpr) {
      return res.render('admin/create-user', {
        error: 'All fields are required',
        user: req.session.user,
        formData: req.body
      });
    }
    
    if (password !== confirmPassword) {
      return res.render('admin/create-user', {
        error: 'Password and Confirm Password must match',
        user: req.session.user,
        formData: req.body
      });
    }
    
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.render('admin/create-user', {
        error: 'Username or email already registered',
        user: req.session.user,
        formData: req.body
      });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const profile = { 
      fullName: fullName.trim(),
      phone: phone?.trim() || '',
      address: address?.trim() || '',
      cpr: cpr.trim()
    };
    
    if (role === 'employee') profile.department = department?.trim() || '';
    if (role === 'doctor') profile.specialty = specialty?.trim() || '';
    
    await User.create({ 
      username: username.trim(), 
      email: email.trim(), 
      password: hashedPassword, 
      role, 
      profile 
    });
    
    res.redirect('/admin/users');
  } catch (error) {
    res.render('admin/create-user', {
      error: 'Error creating user',
      user: req.session.user,
      formData: req.body
    });
  }
});

// User List
router.get('/users', authorize('users', 'read'), async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.render('admin/user-list', { 
      users,
      user: req.session.user,
      success: req.session.success,
      error: req.session.error
    });
    
    delete req.session.success;
    delete req.session.error;
  } catch (error) {
    res.redirect('/admin/dashboard');
  }
});

// Edit User Form
router.get('/edit-user/:userId', authorize('users', 'update'), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    res.render('admin/edit-user', { 
      user,
      error: null,
      user: req.session.user 
    });
  } catch (error) {
    res.redirect('/admin/users');
  }
});

// Update User
router.post('/edit-user/:userId', authorize('users', 'update'), async (req, res) => {
  try {
    const { username, email, fullName, phone, address, department, specialty } = req.body;

    const user = await User.findById(req.params.userId);
    
    const existingUser = await User.findOne({
      _id: { $ne: req.params.userId },
      $or: [{ username }, { email }]
    });
    
    if (existingUser) {
      return res.render('admin/edit-user', {
        user,
        error: 'Username or email already taken',
        user: req.session.user
      });
    }

    user.username = username.trim();
    user.email = email.trim();
    user.profile.fullName = fullName.trim();
    user.profile.phone = phone?.trim() || '';
    user.profile.address = address?.trim() || '';
    
    if (user.role === 'employee') {
      user.profile.department = department?.trim() || '';
    } else if (user.role === 'doctor') {
      user.profile.specialty = specialty?.trim() || '';
    }

    await user.save();
    res.redirect('/admin/users');
  } catch (error) {
    res.render('admin/edit-user', {
      user: await User.findById(req.params.userId),
      error: 'Error updating user',
      user: req.session.user
    });
  }
});

// Delete User
router.post('/delete-user/:userId', authorize('users', 'delete'), async (req, res) => {
  try {
    if (req.params.userId === req.session.user._id.toString()) {
      req.session.error = 'Cannot delete your own account';
      return res.redirect('/admin/users');
    }

    await User.findByIdAndDelete(req.params.userId);
    req.session.success = 'User deleted successfully';
    res.redirect('/admin/users');
  } catch (error) {
    req.session.error = 'Error deleting user';
    res.redirect('/admin/users');
  }
});



module.exports = router;