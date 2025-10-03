const express = require('express');
const router = express.Router();

const authorize = require('../middleware/authorize');
const User = require('../models/user');
const Availability = require('../models/availability');
const Appointment = require('../models/appointment');

// Middleware to allow employees and admins only
function employeeOrAdmin(req, res, next) {
  const role = req.session.user?.role;
  if (role === 'employee' || role === 'admin') return next();
  return res.status(403).send('Forbidden');
}

// Use existing role-based authorization for read permissions globally
router.use(authorize('appointments', 'read'));

function toMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function generateSlots(availability) {
  const slots = [];
  let currentTime = toMinutes(availability.openingTime);
  const closeTime = toMinutes(availability.closingTime);
  const breakStart = availability.breakStartTime ? toMinutes(availability.breakStartTime) : null;
  const breakEnd = availability.breakEndTime ? toMinutes(availability.breakEndTime) : null;

  while (currentTime + availability.duration <= closeTime) {
    if (breakStart !== null && breakEnd !== null) {
      if (currentTime >= breakStart && currentTime < breakEnd) {
        currentTime = breakEnd;
        continue;
      }
    }
    slots.push(minutesToTime(currentTime));
    currentTime += availability.duration;
  }
  return slots;
}

// Get available slots by availabilityId
router.get('/availability/:availabilityId', authorize('appointments', 'read'), async (req, res) => {
  try {
    const availability = await Availability.findById(req.params.availabilityId).lean();
    if (!availability) return res.status(404).send('Availability not found');

    let possibleSlots = generateSlots(availability);
    const bookedAppointments = await Appointment.find({
      availabilityId: availability._id,
      date: availability.date,
    }).lean();

    const bookedTimes = bookedAppointments.map(app => app.slotTime || app.time);
    const availableSlots = possibleSlots.filter(slot => !bookedTimes.includes(slot));

    res.render('appointments/slots', { availability, availableSlots });
  } catch (error) {
    console.error(error);
    res.redirect('/');
  }
});

// List appointments by role
router.get('/', authorize('appointments', 'read'), async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect('/auth/sign-in');

    let appointments;

    if (user.role === 'patient') {
      appointments = await Appointment.find({ patient_id: user._id })
        .select('-prescription')
        .sort({ date: 1 })
        .lean();
    } else if (['doctor', 'employee', 'admin'].includes(user.role)) {
      appointments = await Appointment.find()
        .sort({ date: 1 })
        .populate('patient_id', 'profile.fullName')
        .lean();
    }

    res.render('appointments/index', { user, appointments });
  } catch (error) {
    console.error(error);
    res.redirect('/');
  }
});

// Patient Search Routes for employee/admin

// Search form
router.get('/search-patients', employeeOrAdmin, (req, res) => {
  res.render('appointments/search-patients', { query: '', patients: [], message: null });
});

// Search results with improved flexible query for fullName or CPR
router.get('/search-patients/results', employeeOrAdmin, async (req, res) => {
  try {
    let query = req.query.q?.trim() || '';

    if (!query) {
      return res.render('appointments/search-patients', {
        patients: [],
        query,
        message: 'Please enter a search query',
      });
    }

    // Escape regex special characters to build safe regex
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'i');

    const patients = await User.find({
      role: 'patient',
      $or: [
        { 'profile.cpr': { $regex: regex } },       // partial CPR match
        { 'profile.fullName': { $regex: regex } },  // flexible fullName match
      ],
    }).lean();

    res.render('appointments/search-patients', {
      patients,
      query,
      message: patients.length ? null : `No patients found for "${query}"`,
    });
  } catch (error) {
    console.error('Patient search error:', error);
    res.status(500).send('Server error');
  }
});

// Patient history view with appointments and prescriptions
router.get('/patient-history/:patientId', employeeOrAdmin, async (req, res) => {
  try {
    const patientId = req.params.patientId;
    const patient = await User.findById(patientId).lean();
    if (!patient || patient.role !== 'patient') {
      return res.status(404).send('Patient not found');
    }

    const appointments = await Appointment.find({ patient_id: patientId })
      .populate('employee_id', 'profile.fullName')
      .lean();

    res.render('appointments/patient-history', { patient, appointments });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

// Appointment creation form for employee/admin booking for a patient
router.get('/new', authorize('appointments', 'create'), async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor' }).select('profile.fullName').lean();
    const availabilities = await Availability.find({}).sort({ date: 1, openingTime: 1 }).lean();

    let availableSlots = [];
    if (availabilities.length) {
      availableSlots = generateSlots(availabilities[0]);
    }

    const patientId = req.query.patientId;
    let selectedPatient = null;
    if (patientId) {
      selectedPatient = await User.findOne({ _id: patientId, role: 'patient' }).lean();
    }

    res.render('appointments/new', {
      doctors,
      availabilities,
      availableSlots,
      user: req.session.user,
      selectedPatient,
    });
  } catch (error) {
    console.error(error);
    res.redirect('/appointments');
  }
});

// POST create appointment
router.post('/', authorize('appointments', 'create'), async (req, res) => {
  try {
    const { slotTime, availabilityId, doctor_id, patientId, date } = req.body;

    let patient_id = req.session.user._id;
    if ((req.session.user.role === 'employee' || req.session.user.role === 'admin') && patientId) {
      patient_id = patientId;
    }

    if (!slotTime || !availabilityId || !doctor_id || !date) {
      return res.send('Missing required fields');
    }

    const existingAppointment = await Appointment.findOne({
      availabilityId,
      time: slotTime,
      employee_id: doctor_id,
      date: new Date(date),
    });
    if (existingAppointment) {
      return res.send('Selected slot already booked');
    }

    const appointmentData = {
      availabilityId,
      patient_id,
      employee_id: doctor_id,
      time: slotTime,
      date: new Date(date),
    };

    await Appointment.create(appointmentData);
    res.redirect('/appointments');
  } catch (error) {
    console.log(error);
    res.redirect('/');
  }
});

// Edit appointment form
router.get('/:appointmentId/edit', authorize('appointments', 'update'), async (req, res) => {
  try {
    const appointmentId = req.params.appointmentId;
    const appointment = await Appointment.findById(appointmentId).lean();

    if (!appointment) {
      return res.status(404).send('Appointment not found');
    }

    res.render('appointments/edit', { appointment });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

// PUT update appointment
router.put('/:appointmentId', authorize('appointments', 'update'), async (req, res) => {
  try {
    const { slotTime } = req.body;

    await Appointment.findByIdAndUpdate(req.params.appointmentId, { time: slotTime });

    res.redirect('/appointments');
  } catch (error) {
    console.log(error);
    res.redirect('/appointments');
  }
});

// Delete appointment
router.delete('/:appointmentId', authorize('appointments', 'delete'), async (req, res) => {
  try {
    await Appointment.findByIdAndDelete(req.params.appointmentId);
    res.redirect('/appointments');
  } catch (error) {
    console.log(error);
    res.redirect('/appointments');
  }
});

module.exports = router;
