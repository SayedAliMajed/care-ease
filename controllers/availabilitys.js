const express = require('express');
const router = express.Router();

const Availability = require('../models/availability');
const authorize = require('../middleware/authorize');

// Apply role-based authorization middleware on all appointment routes
router.use(authorize('availabilitys', 'read'));

router.get('/', async (req,res) => {
    try {
    const availabilitys = await Availability.find({ userId:req.session.user._id});
    const editAvailabilityId = req.query.editId || null;
    let availabilityToEdit = null;
    if (editAvailabilityId) {
      availabilityToEdit = await Availability.findById(editAvailabilityId);
    }
    res.render('availabilitys/index.ejs', { availabilitys, availabilityToEdit });
     
    } catch(error){
        console.log(error);
        res.redirect('/');
    }
});

router.post('/', authorize('availabilitys', 'create'), async (req, res) => {
  try {
    const newAvailability = new Availability({
      openingTime: req.body.openingTime,
      closingTime: req.body.closingTime,
      duration: req.body.duration,
      breakTimes: req.body.breakTimes || [],         
      userId: req.session.user._id,
      date: req.body.date                     
    });
    await newAvailability.save();
    res.redirect('/availabilitys');           
  } catch (error) {
    console.log(error);
    res.redirect('/availabilitys');
  }
});


router.put('/:availabilityId', authorize('availabilitys', 'update'), async (req,res) => {
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
    res.redirect(`/availabilitys?editId=${req.params.availabilityId}`); 
  }
});

router.delete('/:availabilityId', authorize('availabilitys', 'delete'), async (req,res) => {
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