const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

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

  
    let { status, dateFrom, dateTo, doctor_Id } = req.query;

    let filter = {};

    if (user.role === 'patient') {
      filter.patient_id = new mongoose.Types.ObjectId(user._id.toString());
    } else {
      if (doctor_Id && mongoose.Types.ObjectId.isValid(doctor_Id)) {
        filter.doctor_Id = new mongoose.Types.ObjectId(doctor_Id);
      }
    }

    if (status) {
      filter.status = status;
    }

   
    const startDate = dateFrom ? new Date(dateFrom) : new Date();
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = dateTo ? new Date(dateTo) : new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
    endDate.setHours(0, 0, 0, 0);
    
    filter.date = { $gte: startDate, $lt: endDate };

    
    const appointments = await Appointment.find(filter)
      .populate('patient_id', 'profile.fullName profile.cpr profile.phone')
      .populate('doctor_Id', 'profile.fullName')
      .sort({ date: 1, time: 1 })
      .lean();

  
    let doctors = [];
    if (['employee', 'admin'].includes(user.role)) {
      doctors = await User.find({ role: 'doctor' }).select('profile.fullName').lean();
    }
    console.log(`Appointments fetched for user ${user._id}: ${appointments.length}`);

    res.render('appointments/index', {
      user,
      appointments,
      doctors,
      filters: { status, dateFrom, dateTo, doctor_Id },
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).render('error', { 
      message: 'Unable to fetch appointments',
      user: req.session.user 
    });
  }
});




router.get('/search-patients', employeeOrAdmin, (req, res) => {
  res.render('appointments/search-patients', { query: '', patients: [], message: null });
});


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

  
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'i');

    const patients = await User.find({
      role: 'patient',
      $or: [
        { 'profile.cpr': { $regex: regex } },
        { 'profile.fullName': { $regex: regex } },
      ],
    }).lean();

    res.render('appointments/search-patients', {
      patients,
      query,
      message: patients.length ? null : `No patients found for "${query}"`,
    });
  } catch (error) {
    console.error('Patient search error:', error);
    res.status(500).render('error', { 
      message: 'Search failed',
      user: req.session.user 
    });
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

    const appointments = await Appointment.find({ patient_id: new mongoose.Types.ObjectId(patientId) })
      .populate('doctor_Id', 'profile.fullName')
      .lean();

    res.render('appointments/patient-history', { patient, appointments });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { 
      message: 'Unable to load patient history',
      user: req.session.user 
    });
  }
});

router.get('/new', authorize('appointments', 'create'), async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/auth/sign-in');
    }

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
      if (!selectedPatient) {
        return res.status(404).send('Patient not found or invalid');
      }
    }

    let patients = [];
    if (['admin', 'employee'].includes(req.session.user.role)) {
      patients = await User.find({ role: 'patient' }).select('profile.fullName profile.cpr').lean();
    }

    res.render('appointments/new', {
      doctors,
      availabilities,
      availableSlots,
      user: req.session.user,
      selectedPatient,
      patients,
    });
  } catch (error) {
    console.error(error);
    res.redirect('/appointments');
  }
});


router.post('/', authorize('appointments', 'create'), async (req, res, next) => {
  try {
    const { slotTime, availabilityId, doctor_id, patientId } = req.body;

    if (!slotTime || !availabilityId || !doctor_id) {
      return res.status(400).send('Missing required fields');
    }

    const availability = await Availability.findById(availabilityId).lean();
    if (!availability) {
      return res.status(400).send('Invalid availability selected');
    }
    const date = availability.date;

    let patient_id = req.session.user._id;
    if ((req.session.user.role === 'employee' || req.session.user.role === 'admin') && patientId) {
      
      if (!mongoose.Types.ObjectId.isValid(patientId)) {
        return res.status(400).send('Invalid patient ID');
      }
      const patient = await User.findOne({ _id: patientId, role: 'patient' });
      if (!patient) {
        return res.status(400).send('Invalid patient selected');
      }
      patient_id = patientId;
    }

    const existingAppointment = await Appointment.findOne({
      availabilityId,
      time: slotTime,
      doctor_Id: doctor_id,
      date,
    });
    if (existingAppointment) {
      return res.status(400).send('Selected slot already booked');
    }

    const appointmentData = {
      availabilityId,
      patient_id: new mongoose.Types.ObjectId(patient_id.toString()),
      doctor_Id: new mongoose.Types.ObjectId(doctor_id.toString()),
      time: slotTime,
      date,
      status: 'scheduled' 
    };

    await Appointment.create(appointmentData);
   
    return res.redirect('/appointments');
  } catch (error) {
    console.error('Error creating appointment:', error);
    next(error); 
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
    res.status(500).render('error', { 
      message: 'Unable to load appointment',
      user: req.session.user 
    });
  }
});

// PUT update appointment
router.put('/:appointmentId', authorize('appointments', 'update'), async (req, res) => {
  try {
    const { slotTime } = req.body;
    if (!slotTime) {
      return res.status(400).send('Slot time is required');
    }

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