const express = require('express');
const router = express.Router();

const Appointment = require('../models/appointment');
const User = require('../models/user');
const authorize = require('../middleware/authorize');

// List appointments for logged-in patient
router.get('/', authorize('appointments', 'read'), async (req, res) => {
  try {
    const patientId = req.session.user._id;
    const appointments = await Appointment.find({ patient_id: patientId }).populate('employee_id patient_id');
    res.render('appointments/index.ejs', { appointments, user: req.session.user });
  } catch (error) {
    console.log(error);
    res.redirect('/');
  }
});

// Appointment creation form - accessible to roles allowed to create appointments
router.get('/new', authorize('appointments', 'create'), async (req, res) => {
  try {
    res.render('appointments/new', { user: req.session.user });
  } catch (error) {
    console.log(error);
    res.redirect('/');
  }
});

// Create new appointment
router.post('/', authorize('appointments', 'create'), async (req, res) => {
  try {
    const cpr = req.body.cpr;
    if (!/^\d{9}$/.test(cpr)) {
      return res.send('CPR must be exactly 9 digits');
    }
    req.body.patient_id = req.session.user._id;
    if (req.session.user.role === 'patient') {
      req.body.duration = 30;
      req.body.prescription = '';
    }
    await Appointment.create(req.body);
    res.redirect('/appointments');
  } catch (error) {
    console.log(error);
    res.redirect('/');
  }
});

// Show appointment details
router.get('/:appointmentId', authorize('appointments', 'read'), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId).populate('patient_id');
    if (!appointment) return res.status(404).send('Appointment not found');
    res.render('appointments/show.ejs', { appointment, user: req.session.user });
  } catch (error) {
    console.log(error);
    res.redirect('/');
  }
});

// Delete appointment - only allow if logged-in user owns the appointment (patient_id check)
router.delete('/:appointmentId', authorize('appointments', 'delete'), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId);
    if (!appointment) return res.status(404).send('Appointment not found');
    if (!appointment.patient_id.equals(req.session.user._id)) {
      console.log('You are not authorized to delete the appointment');
      return res.status(403).send('Not authorized to delete this appointment');
    }
    await appointment.deleteOne();
    res.redirect('/appointments');
  } catch (error) {
    console.log(error);
    res.redirect('/');
  }
});

// Edit form
router.get('/:appointmentId/edit', authorize('appointments', 'update'), async (req, res) => {
  try {
    const currentAppointment = await Appointment.findById(req.params.appointmentId);
    if (!currentAppointment) return res.status(404).send('Appointment not found');
    res.render('appointments/edit.ejs', { appointment: currentAppointment, user: req.session.user });
  } catch (error) {
    console.log(error);
    res.redirect('/');
  }
});

// Update appointment
router.put('/:appointmentId', authorize('appointments', 'update'), async (req, res) => {
  try {
    const currentAppointment = await Appointment.findById(req.params.appointmentId);
    if (!currentAppointment) return res.status(404).send('Appointment not found');
    if (!currentAppointment.patient_id.equals(req.session.user._id)) {
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
  } catch (error) {
    console.log(error);
    res.redirect('/');
  }
});

module.exports = router;
