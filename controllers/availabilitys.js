const express = require('express');
const router = express.Router();

const Availability = require('../models/availability');
const authorize = require('../middleware/authorize');
const User = require('../models/user')

// GET /availabilitys - List all availabilities for current user
router.get('/', authorize('availabilitys', 'read'), async (req, res) => {
  try {
    const availabilitys = await Availability.find()
      .populate('doctorId', 'profile.fullName')
      .lean();

    res.render('availabilitys/index.ejs', { availabilitys });
  } catch (error) {
    console.error(error);
    res.redirect('/');
  }
});

router.get('/new', authorize('availabilitys', 'create'), async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor' }).select('profile.fullName').lean();
    res.render('availabilitys/new.ejs', { doctors, availability: {} }); 
  } catch (error) {
    console.error(error);
    res.redirect('/availabilitys');
  }
});

router.post('/', authorize('availabilitys', 'create'), async (req, res) => {
  try {
    const { date, openingTime, closingTime, duration, doctorId, breakStartTime, breakEndTime, isRepeating } = req.body;
    
    console.log('Form data received:', req.body);

    // Check if availability already exists for this DOCTOR and date
    const existingAvailability = await Availability.findOne({
      doctorId: doctorId,
      date: date
    });

    if (existingAvailability) {
      const doctors = await User.find({ role: 'doctor' }).select('profile.fullName').lean();
      const selectedDoctor = doctors.find(d => d._id.toString() === doctorId);
      
      return res.render('availabilitys/new', {
        doctors: doctors,
        error: `Doctor ${selectedDoctor?.profile.fullName} already has an availability scheduled for ${new Date(date).toDateString()}. Please edit the existing one or choose a different date/doctor.`,
        // Pass back form data to preserve user input
        date: date,
        openingTime: openingTime,
        closingTime: closingTime,
        duration: duration,
        doctorId: doctorId,
        breakStartTime: breakStartTime,
        breakEndTime: breakEndTime,
        isRepeating: isRepeating
      });
    }

    // Process break times from simple fields
    let breakTimesArray = [];
    if (breakStartTime && breakEndTime) {
      breakTimesArray = [{
        startTime: breakStartTime,
        endTime: breakEndTime
      }];
    }

    const newAvailability = new Availability({
      userId: req.session.user._id,
      doctorId: doctorId,
      date: date,
      openingTime: openingTime,
      closingTime: closingTime,
      duration: parseInt(duration),
      isRepeating: isRepeating === 'on',
      breakTimes: breakTimesArray
    });
    
    await newAvailability.save();
    res.redirect('/availabilitys');
  } catch (error) {
    console.error('Error creating availability:', error);
    
    // Handle duplicate key error specifically
    if (error.code === 11000) {
      const doctors = await User.find({ role: 'doctor' }).select('profile.fullName').lean();
      return res.render('availabilitys/new', {
        doctors: doctors,
        error: `This availability conflicts with an existing one. Please choose a different date or doctor.`,
        // Pass back form data
        date: req.body.date,
        openingTime: req.body.openingTime,
        closingTime: req.body.closingTime,
        duration: req.body.duration,
        doctorId: req.body.doctorId,
        breakStartTime: req.body.breakStartTime,
        breakEndTime: req.body.breakEndTime,
        isRepeating: req.body.isRepeating
      });
    }
    
    res.redirect('/availabilitys/new');
  }
});

router.get('/:availabilityId/edit', authorize('availabilitys', 'update'), async (req, res) => {
  try {
    const availability = await Availability.findById(req.params.availabilityId);
    if (!availability) {
      return res.status(404).send('Availability not found');
    }
    const doctors = await User.find({ role: 'doctor' }).select('profile.fullName').lean();
    res.render('availabilitys/edit', { availability, doctors });
  } catch (error) {
    console.error(error);
    res.redirect('/availabilitys');
  }
});

router.put('/:availabilityId', authorize('availabilitys', 'update'), async (req, res) => {
  try {
    const availability = await Availability.findById(req.params.availabilityId);
    if (!availability) {
      return res.status(404).send('Availability not found');
    }


    availability.date = req.body.date;
    availability.openingTime = req.body.openingTime;
    availability.closingTime = req.body.closingTime;
    availability.duration = req.body.duration;
    availability.doctorId = req.body.doctorId;
    availability.isRepeating = req.body.isRepeating === 'on';

    
    if (req.body.breakStartTime && req.body.breakEndTime) {
      availability.breakTimes = [{
        startTime: req.body.breakStartTime,
        endTime: req.body.breakEndTime
      }];
    } else {
      availability.breakTimes = [];
    }

    await availability.save();
    res.redirect('/availabilitys');
  } catch (error) {
    console.error('Error updating availability:', error);
    res.redirect(`/availabilitys/${req.params.availabilityId}/edit`);
  }
});

router.delete('/:availabilityId', authorize('availabilitys', 'delete'), async (req, res) => {
  try {
    const availability = await Availability.findById(req.params.availabilityId);
    if (!availability) {
      return res.status(404).send('Availability not found');
    }
    await availability.deleteOne();
    res.redirect('/availabilitys');
  } catch (error) {
    console.log(error);
    res.redirect('/availabilitys');
  }
});

module.exports = router;