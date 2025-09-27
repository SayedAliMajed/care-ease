const express = require('express');
const router = express.Router();

const Availability = require('../models/availability');
const Slot = require('../models/user');

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


module.exports = router;