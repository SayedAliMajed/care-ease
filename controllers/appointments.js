const express = require('express');
const router = express.Router();

const authorize = require('../middleware/authorize');
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
    if (!user) {
      return res.redirect('/auth/sign-in'); 
    }

  
    const appointments = await Appointment.find({ patient_id: user._id }).sort({ date: 1 });

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
    const availabilities = await Availability.find({}).sort({ date: 1, openingTime: 1 });

    let availableSlots = [];
    if (availabilities.length) {
      const firstAvailability = availabilities[0];
      availableSlots = generateSlots(firstAvailability);
    }

    res.render('appointments/new', { availabilities, availableSlots, user: req.session.user });
  } catch (error) {
    console.error(error);
    res.redirect('/appointments');
  }
});


router.post('/', authorize('appointments', 'create'), async (req, res) => {
  try {
    const { slotTime, availabilityId } = req.body;

    
    const patientName = req.session.user.profile.fullName;
    const cpr = req.session.user.profile.cpr;
    const patient_id = req.session.user._id;

    if (!slotTime || !availabilityId || !patientName || !cpr) {
      return res.send('Missing required appointment fields');
    }

   
    const existingAppointment = await Appointment.findOne({
      availabilityId,
      slotTime,
    });

    if (existingAppointment) {
      return res.send('Selected time slot is already booked');
    }

    let duration = 20;
    let prescription = '';
    if (req.session.user.role !== 'patient') {
      duration = req.body.duration || 20;
      prescription = req.body.prescription || '';
    }

    const appointmentData = {
      availabilityId,
      patient_id,
      slotTime,
      patientName,
      cpr,
      duration,
      prescription,
      date: req.body.date || new Date(),
    };

    await Appointment.create(appointmentData);
    res.redirect('/appointments');
  } catch (error) {
    console.log(error);
    res.redirect('/');
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
