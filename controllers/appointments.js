const express = require('express');
const router = express.Router();

const Appointment = require('../models/appointment');
const User = require('../models/user');

router.get('/', async (req, res) => {
  try {
    const ownerId = req.session.user._id;
    const populatedAppointments = await Appointment.find({ owner: ownerId }).populate('owner');
    res.render('appointments/index.ejs', { appointments: populatedAppointments }); // lowercase key
  } catch (error) {
    console.log(error);
    res.redirect('/');
  }
});

router.get('/new', async (req,res) => {
  try {
    res.render('appointments/new')

  } catch (error) {
    console.log(error);
    res.redirect('/');

  }
})








module.exports = router;