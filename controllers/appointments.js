const express = require('express');
const router = express.Router();
const authorize = require('../middleware/authorize');

router.use(authorize('appointments', 'read'));
const Availability = require('../models/availability');
const Appointment = require('../models/appointment');



function toMinutes (timeStr) {
  const [h,m] = timeStr.split(':').map(Number);
  return h* 60 + m;
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

router.get('/availability/:availabilityId', authorize('appointments', 'read'), async (req,res) => {
  try {
    const availability = await Availability.findById(req.params.availabilityId);
    if (!availability) return res.status(404).send ('Availability not found');

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

  } catch(error) {
    console.log(error);
    res.redirect('/');

  }
});

router.post('/', authorize('appointments', 'post'), async (req,res) => {
  try {
    const {cpr, slotTime, availabilityId, patientName} = req.body;

    if (!/^\d{9}$/.test(cpr)) {
      return res.send('CPR must be exactly 9 digits');
    }

   if (!slotTime || !availabilityId || !patientName) {
      return res.send('Missing required appointment fields');
    }

    const patient_id = req.session.user._id;

    let duration = 20;
    let prescription = '';
    if (req.session.user.role !== 'patient') {
      duration = req.body.duration || 20;
      prescription = req.body.prescription || '';
    }

    const existingAppointment = await Appointment.findOne({
      availabilityId,
      slotTime,
    });

    if (existingAppointment) {
      return res.send('Selected time slot is already booked')
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

  }catch(error) {
    console.log(error);
    res.redirect('/');
  }
});


module.exports = router;