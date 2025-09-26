const express = require('express');
const router = express.Router();

const Appointment = require('../models/appointment');
const User = require('../models/user');

router.get('/', async (req, res) => {
  try {
    const patientId = req.session.user._id;
    const appointments = await Appointment.find({ patient_id: patientId }).populate('employee_id patient_id');
    res.render('appointments/index.ejs', { appointments });
  } catch (error) {
    console.log(error);
    res.redirect('/');
  }
});

// Appointment creation form
router.get('/new', async (req,res) => {
  try {
    res.render('appointments/new')

  } catch (error) {
    console.log(error);
    res.redirect('/');

  }
});

// Create new appointment
router.post('/', async (req,res) => {
  try {
    req.body.patientId = req.session.user._id;
    await Appointment.create(req.body);
    
    res.redirect('/appointments');
  } catch(error) {
    console.log(error)
    res.redirect('/');

  }
});

// Show Page

router.get('/:appointmentId', async (req,res) => {
  try {
    const appointments = await Appointment.findById(req.params.appointmentId)
    .populate('patient_id')
    .populate('doctorId')
    res.render('appointments/show.ejs', {
      appointments
    });
  } catch(error) {
    Console.log(error);
    res.redirect('/');
  }
});






module.exports = router;