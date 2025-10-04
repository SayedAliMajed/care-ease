const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/user');
const Appointment = require('../models/appointment');
const authorize = require('../middleware/authorize');

const router = express.Router();

// Role check middleware
function isAdmin(req, res, next) {
  if (req.session?.user?.role === 'admin') return next();
  return res.status(403).send('Forbidden: Admins only');
}

// Create User Routes
router.get('/create-user', isAdmin, (req, res) => {
  res.render('admin/create-user.ejs');
});

router.post('/create-user', isAdmin, authorize('users', 'create'), async (req, res) => {
  try {
    const { username, email, password, confirmPassword, role, fullName, phone, address, department, specialty, cpr } = req.body;
    
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
    
    const profile = { 
      fullName: fullName || '', 
      phone: phone || '', 
      address: address || '',
      cpr: cpr || '000000000'
    };
    
    if (role === 'employee') profile.department = department || '';
    if (role === 'doctor') profile.specialty = specialty || '';
    
    await User.create({ 
      username, 
      email, 
      password: hashedPassword, 
      role, 
      profile 
    });
    
    res.redirect('/admin/users');
  } catch (error) {
    res.send('Error creating user: ' + error.message);
  }
});

// User Management Routes
router.get('/users', isAdmin, authorize('users', 'read'), async (req, res) => {
  try {
    const users = await User.find();
    res.render('admin/user-list.ejs', { users });
  } catch (error) {
    res.redirect('/');
  }
});

router.get('/edit-user/:userId', isAdmin, authorize('users', 'update'), async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }
    res.render('admin/edit-user', { user });
  } catch (error) {
    res.status(500).send('Server error');
  }
});

router.post('/edit-user/:userId', isAdmin, authorize('users', 'update'), async (req, res) => {
  try {
    const userId = req.params.userId;
    const { username, email, fullName, phone, address, department, specialty } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }

    user.username = username;
    user.email = email;
    if (!user.profile) user.profile = {};
    user.profile.fullName = fullName;
    user.profile.phone = phone;
    user.profile.address = address;
    if (user.role === 'employee') {
      user.profile.department = department;
    } else if (user.role === 'doctor') {
      user.profile.specialty = specialty;
    }

    await user.save();
    res.redirect('/admin/users');
  } catch (error) {
    res.status(500).send('Error updating user');
  }
});

router.post('/delete-user/:userId', isAdmin, authorize('users', 'delete'), async (req, res) => {
  try {
    const userId = req.params.userId;

    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).send('User not found');
    }

    res.redirect('/admin/users');
  } catch (error) {
    res.status(500).send('Error deleting user');
  }
});

// Dashboard Routes
router.get('/dashboard', async (req, res) => {
  const role = req.session.user?.role;

  try {
    if (role === 'doctor') {
      const doctor_Id = req.session.user._id;

      const appointments = await Appointment.find({
        doctor_Id: doctor_Id,
        status: { $in: ['scheduled', 'completed'] }
      })
      .populate('patient_id')
      .populate('doctor_Id')
      .lean();

      const mappedAppointments = appointments.map(app => {
        return {
          _id: app._id,
          date: app.date,
          time: app.time,
          status: app.status,
          prescription: app.prescription,
          patientName: app.patient_id?.profile?.fullName || 'No Name',
          patientCPR: app.patient_id?.profile?.cpr || 'No CPR',
          patientPhone: app.patient_id?.profile?.phone || 'No Phone'
        };
      });

      return res.render('dashboard/doctor', {
        user: req.session.user,
        appointments: mappedAppointments
      });
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
    res.status(500).send('Internal server error');
  }
});

// Doctor Dashboard Route
router.get('/doctor', async (req, res) => {
  try {
    if (req.session.user?.role !== 'doctor') {
      return res.status(403).send('Access denied - Doctors only');
    }
    
    const doctor_Id = req.session.user._id;

    const appointments = await Appointment.find({
      doctor_Id: doctor_Id,
      status: { $in: ['scheduled', 'completed'] }
    })
    .populate('patient_id')
    .populate('doctor_Id')
    .lean();

    const mappedAppointments = appointments.map(app => {
      return {
        _id: app._id,
        date: app.date,
        time: app.time,
        status: app.status,
        prescription: app.prescription,
        patientName: app.patient_id?.profile?.fullName || 'No Name',
        patientCPR: app.patient_id?.profile?.cpr || 'No CPR',
        patientPhone: app.patient_id?.profile?.phone || 'No Phone'
      };
    });

    return res.render('dashboard/doctor', {
      user: req.session.user,
      appointments: mappedAppointments
    });
  } catch (error) {
    res.status(500).send('Server error');
  }
});

router.get('/employee', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth/sign-in');
  }
  res.render('dashboard/employee', { user: req.session.user });
});

module.exports = router;