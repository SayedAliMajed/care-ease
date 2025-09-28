const express = require('express');
const bcrypt = require('bcrypt');

const User = require('../models/user');

const router = express.Router();

router.get('/sign-up', (req, res) => {
  res.render('auth/sign-up.ejs');
});

router.get('/sign-in', (req, res) => {
  res.render('auth/sign-in.ejs');
});

router.post('/sign-up', async (req, res) => {
  try {
    const userInDatabase = await User.findOne({ username: req.body.username });

    if (userInDatabase) {
      return res.send('Username already in use');
    }

    if (req.body.password !== req.body.confirmPassword) {
      return res.send('Password and Confirm Password must match');
    }

    const hashedPassword = bcrypt.hashSync(req.body.password, 10);

    // Create user with role as 'patient' explicitly
    const newUser = await User.create({
      username: req.body.username,
      password: hashedPassword,
      email: req.body.email,   
      role: 'patient'
    });

    // Store key user info in session for auth and app routes
    req.session.user = {
      username: newUser.username,
      _id: newUser._id,
      role: newUser.role
    };

    req.session.save(() => {
      res.redirect('/');
    });
  } catch (error) {
    console.error(error);
    res.send('Error while creating account');
  }
});

router.post('/sign-in', async (req, res) => {
  try {
    const userInDatabase = await User.findOne({ username: req.body.username });

    if (!userInDatabase) {
      return res.send('Username or Password is invalid');
    }

    const validPassword = bcrypt.compareSync(req.body.password, userInDatabase.password);

    if (!validPassword) {
      return res.send('Username or Password is invalid');
    }

    // Store user info in session, including role for authorization checks
    req.session.user = {
      username: userInDatabase.username,
      _id: userInDatabase._id,
      role: userInDatabase.role
    };

    req.session.save(() => {
  if (userInDatabase.role === 'admin') {
    res.redirect('/admin/dashboard');
  } else if (userInDatabase.role === 'employee') {
    res.redirect('/employee/dashboard');
  } else if (userInDatabase.role === 'doctor') {
    res.redirect('/doctor/dashboard');
  } else {
    res.redirect('/');
  }
});

  } catch (error) {
    console.error(error);
    res.send('Error during sign in');
  }
});

// GET sign-out
router.get('/sign-out', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});



module.exports = router;
