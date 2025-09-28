const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/user');

const router = express.Router();


function isAdmin(req,res,next) {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    }
return  res.status(403).send('Forbidden: Admins only');
};

router.get('/create-user', isAdmin, (req,res) => {
    res.render('admin/create-user.ejs');
});


router.post('/create-user', isAdmin, async (req,res) => {
    try {

    const { username, email, password, confirmPassword, role, fullName, phone, address,department, specialty } = req.body;
    if (!username || !email || !password || !role)  { 
      return res.send('All fields are required');
      }
    if (password !== confirmPassword) {
      return res.send('Password and Confirm Password must match');
    }

    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.send('Username or email already registered');
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const profile = { fullName, phone, address};
    if (role === 'employee') profile.department = department;
    if (role === 'doctor') profile.specialty = specialty;

    await User.create({
        username,
        email,
        password: hashedPassword,
        role,
        profile,
    });

    res.redirect('admin/users');


    }catch(error) {
        console.log(error);
        res.send('Error creating user');
    }
    
});

router.get('/users', isAdmin, async (req,res) => {
    try {


    }catch(error) {
        console.log(error);
        res.redirect('/');
    }

});


module.exports = router;