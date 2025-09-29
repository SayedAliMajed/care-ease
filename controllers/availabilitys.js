const express = require('express');
const router = express.Router();

const Availability = require('../models/availability');
const authorize = require('../middleware/authorize');

// Apply role-based authorization middleware on all appointment routes
router.use(authorize('availabilitys', 'read'));

router.get('/', async (req,res) => {
    try {
    const availabilitys = await Availability.find({ employee_id:req.session.user._id});
    res.render('availabilitys/index.ejs', { availabilitys });
     
    } catch(error){
        console.log(error);
        res.redirect('/');
    }
});

router.get('/new', authorize('availabilitys', 'create'), async (req,res) => {
  try {
    res.render('availabilitys/new.ejs');

  }catch(error) {
    console.log(error);
    res.redirect('/');
  }
});

router.post('/',authorize('availabilitys', 'create'), async (req,res) => {
  try {
    const newAvailability = new Availability({
      date: req.body.date,
      slots: req.body.slots,
      employee_id: req.session.user._id,
    });
    await newAvailability.save();
    res.redirect('availabilitys');  

  }catch(error) {
    console.log(error);
    res.redirect('/availabilitys/new');

  }
});

router.get('/:availabilityId/edit', authorize('availabilitys', 'update'), async (req, res) => {
  try {
    const availability = await Availability.findById(req.params.availabilityId);
    if (!availability) {
      return res.status(404).send('Not found');
    }
    res.render('availabilitys/edit.ejs', {
      availability: availability,
    });
  } catch (error) {
    console.log(error);
    res.redirect('/');
  }
});

router.put('/:availabilityId', authorize('availabilitys', 'update'), async (req,res) => {
  try {
    const availability = await Availability.findById(req.params.availabilityId);
    availability.date = req.body.date;
    availability.slots = req.body.slots;
    await availability.save();
    res.redirect('/availabilitys');

  }catch(error) {
    console.log(error);
    res.redirect(`/availabilitys/${req.params.id}/edit`);
  }
});

router.delete('/:availabilityId', authorize('availabilitys', 'delete'), async (req,res) => {
  try {
    const availability = await Availability.findById(req.params.availabilityId);
    await availability.deleteOne();
    res.redirect('/availabilitys')

  }catch(error) {
    console.log(error);
    res.redirect('/availabilitys');
  }
});

module.exports = router;