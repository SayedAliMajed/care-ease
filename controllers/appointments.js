const express = require('express');
const router = express.Router();

const authorize = require('../middleware/authorize');
const User = require('../models/user');
const Availability = require('../models/availability');
const Appointment = require('../models/appointment');

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

router.get('/availability/:availabilityId', authorize('appointments', 'read'), async (req, res) => {
  try {
    const availability = await Availability.findById(req.params.availabilityId);
    if (!availability) return res.status(404).send('Availability not found');

    let possibleSlots = generateSlots(availability);
    const bookedAppointments = await Appointment.find({
      availabilityId: availability._id,
      date: availability.date,
    });

    const bookedTimes = bookedAppointments.map(app => app.slotTime);
    const availableSlots = possibleSlots.filter(slot => !bookedTimes.includes(slot));

    res.render('appointments/slots', {
      availability,
      availableSlots,
    });
  } catch (error) {
    console.log(error);
    res.redirect('/');
  }
});

router.get('/', authorize('appointments', 'read'), async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect('/auth/sign-in');

    let appointments;

    if (user.role === 'patient') {
      appointments = await Appointment.find({ patient_id: user._id })
        .select('-prescription')
        .sort({ date: 1 });
    } else if (['doctor', 'employee', 'admin'].includes(user.role)) {
      appointments = await Appointment.find()
        .sort({ date: 1 })
        .populate('patient_id', 'profile.fullName');
    }

    res.render('appointments/index', {
      user,
      appointments,
    });
  } catch (error) {
    console.error(error);
    res.redirect('/');
  }
});

router.get('/new', authorize('appointments', 'create'), async (req, res) => {
  try {
  
    const doctors = await User.find({ role: 'doctor' }).select('profile.fullName').lean();
    const availabilities = await Availability.find({}).sort({ date: 1, openingTime: 1 });

    let availableSlots = [];
    if (availabilities.length) {
      const firstAvailability = availabilities[0];
      availableSlots = generateSlots(firstAvailability);
    }

    res.render('appointments/new', { 
      doctors,
      availabilities,
      availableSlots,
      user: req.session.user
    });
  } catch (error) {
    console.error(error);
    res.redirect('/appointments');
  }
});

router.post('/', authorize('appointments', 'create'), async (req, res) => {
  try {
    const { slotTime, availabilityId, doctor_id } = req.body; 

    const patient_id = req.session.user._id;

    if (!slotTime || !availabilityId || !doctor_id) {
      return res.send('Missing required fields');
    }

    const existingAppointment = await Appointment.findOne({
      availabilityId,
      time: slotTime,
      employee_id: doctor_id,
    });
    if (existingAppointment) {
      return res.send('Selected slot already booked');
    }

    const appointmentData = {
      availabilityId,
      patient_id,
      employee_id: doctor_id, 
      time: slotTime,
      date: new Date(req.body.date),
      
    };

    await Appointment.create(appointmentData);
    res.redirect('/appointments');

  } catch (error) {
    console.log(error);
    res.redirect('/');
  }
});

router.get('/:appointmentId/edit', authorize('appointments', 'update'), async (req,res) =>{
  try {
    const appointmentId = req.params.appointmentId;
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).send('Appointment not found');
    }

    res.render('appointments/edit', { appointment });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});


router.put('/:appointmentId', authorize('appointments', 'update'), async (req, res) => {
  try {
    const { slotTime } = req.body;

    await Appointment.findByIdAndUpdate(req.params.appointmentId, {
      slotTime,
    });

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
