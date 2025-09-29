const express = require('express');
const router = express.Router();

const Appointment = require('../models/appointment');
const authorize = require('../middleware/authorize');

// Apply role-based authorization middleware on all appointment routes
router.use(authorize('appointments', 'read'));

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

router.get('/new', async (req,res) => {
  try {
    res.render('appointments/new', { user: req.session.user });
  } catch (error) {
    console.log(error);
    res.redirect('/');
  }
});

router.post('/', async (req,res) => {
  try {
    const cpr = req.body.cpr;
    if (!/^\d{9}$/.test(cpr)) {
      return res.send('CPR must be exactly 9 digits');
    }
    req.body.patient_id = req.session.user._id;
    if (req.session.user.role === 'patient') {
      req.body.duration = 20;
      req.body.prescription = '';
    }
    await Appointment.create(req.body);
    res.redirect('/appointments');
  } catch(error) {
    console.log(error);
    res.redirect('/');
  }
});

router.get('/:appointmentId', async (req,res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId).populate('patient_id');
    res.render('appointments/show.ejs', { appointment });
  } catch(error) {
    console.log(error);
    res.redirect('/');
  }
});

router.delete('/:appointmentId', async (req,res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId);
    if(appointment.patient_id.equals(req.session.user._id)) {
      await appointment.deleteOne();
      res.redirect('/appointments');
    } else {
      console.log('You are not authorized to delete the appointment');
    }
  }catch(error) {
    console.log(error);
    res.redirect('/');
  }
});

router.get('/:appointmentId/edit', async (req,res) =>{
  try {
    const currentAppointment = await Appointment.findById(req.params.appointmentId);
    res.render('appointments/edit.ejs', { appointment: currentAppointment });
  }catch(error) {
    console.log(error);
    res.redirect('/');
  }
});

router.put('/:appointmentId', async (req,res) => {
  try {
    const currentAppointment = await Appointment.findById(req.params.appointmentId);
    if (!currentAppointment.patient_id.equals(req.session.user._id)){
      console.log('You are not authorized to update this appointment');
      return res.status(403).send('Not authorized');
    }
    if (currentAppointment.status === 'cancelled' && req.body.status !== 'cancelled') {
      console.log('Cannot change appointment after it is cancelled');
      return res.status(400).send('Cannot update cancelled appointment');
    }
    Object.assign(currentAppointment, req.body);
    await currentAppointment.save();
    res.redirect(`/appointments/${req.params.appointmentId}`);
  } catch(error) {
    console.log(error);
    res.redirect('/');
  }
});

module.exports = router;
