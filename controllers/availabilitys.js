const express = require('express');
const router = express.Router();

const Availability = require('../models/availability');
const Slot = require('../models/user');
const authorize = require('../middleware/authorize');

router.get('/', async (req,res) => {
    try {
    const employee_id = req.session.user._id;
    const availabilitys = await Availability.find({ employee_id: employee_id}).populate('employee_id');
    res.render('availabilitys/index.ejs', { availabilitys });
     
    } catch(error){
        console.log(error);
        res.redirect('/');
    }
});

router.get('/new', (req, res) => {
    try {
        res.render('availabilitys/new.ejs');
    } catch(error) {
        console.log(error)
    }
});

// Availablity creation form
router.get('/new', async (req,res) => {
  try {
    res.render('availabilitys/new', { user: req.session.user });

  } catch (error) {
    console.log(error);
    res.redirect('/');

  }
});

// Create new availability
router.post('/', async (req,res) => {
  try {
   
    if (!req.body.patient_id) {
        req.body.employee_id = req.session.user._id;
    }
   
    if (!req.body.patient_id) {
        req.body.doctor_id = req.session.user._id;
    }
    await Availability.create(req.body);
    res.redirect('/availabilitys');
  } catch(error) {
    console.log(error)
    res.redirect('/');

  }
});

module.exports = router;