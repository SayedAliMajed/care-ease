const express = require('express');
const router = express.Router();

const Availability = require('../models/availability');
const authorize = require('../middleware/authorize');

// GET /availabilitys - List all availabilities for current user
router.get('/', authorize('availabilitys', 'read'), async (req, res) => {
  try {
    const availabilitys = await Availability.find({ userId: req.session.user._id });
    res.render('availabilitys/index.ejs', { availabilitys });
  } catch (error) {
    console.log(error);
    res.redirect('/');
  }
});


router.get('/new', authorize('availabilitys', 'create'), (req, res) => {
  res.render('availabilitys/new.ejs');
});


router.post('/', authorize('availabilitys', 'create'), async (req, res) => {
  try {
    const newAvailability = new Availability({
      userId: req.session.user._id,
      date: req.body.date,
      openingTime: req.body.openingTime,
      closingTime: req.body.closingTime,
      duration: req.body.duration,
      breakTimes: req.body.breakTimes,
    });
    await newAvailability.save();
    res.redirect('/availabilitys');
  } catch (error) {
    console.log(error);
    res.redirect('/availabilitys/new');
  }
});


router.get('/:availabilityId/edit', authorize('availabilitys', 'update'), async (req, res) => {
  try {
    const availability = await Availability.findById(req.params.availabilityId);
    if (!availability) {
      return res.status(404).send('Availability not found');
    }
    res.render('availabilitys/edit.ejs', { availability });
  } catch (error) {
    console.log(error);
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
    availability.breakTimes = req.body.breakTimes;

    await availability.save();
    res.redirect('/availabilitys');
  } catch (error) {
    console.log(error);
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
