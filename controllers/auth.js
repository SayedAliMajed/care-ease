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
      return res.render('auth/sign-up.ejs', { error: 'Username already in use', formData: req.body });
    }

    if (req.body.password !== req.body.confirmPassword) {
      return res.send('Password and Confirm Password must match');
    }

    if (!/^\d{9}$/.test(req.body.cpr)) {
      return res.send('CPR must be exactly 9 digits');
    }

    const hashedPassword = bcrypt.hashSync(req.body.password, 10);

    const newUser = await User.create({
      username: req.body.username,
      password: hashedPassword,
      email: req.body.email,
      role: 'patient',
      profile: {
        fullName: req.body.fullName,
        cpr: req.body.cpr,
      },
    });

    // Store user info in session including full profile
    req.session.user = newUser.toObject();

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
    const userInDatabase = await User.findOne({ username: req.body.username }).lean();

    if (!userInDatabase) {
      return res.render('auth/sign-in', { 
        error: 'Username or Password is invalid',
        username: req.body.username 
      });
    }

    const validPassword = bcrypt.compareSync(req.body.password, userInDatabase.password);

    if (!validPassword) {
      return res.render('auth/sign-in', { 
        error: 'Username or Password is invalid',
        username: req.body.username 
      });
    }

  
    req.session.user = userInDatabase;

    req.session.save(() => {
      res.redirect('/admin/dashboard');
    });
  } catch (error) {
    console.error(error);
    res.render('auth/sign-in', { 
      error: 'Error during sign in. Please try again.',
      username: req.body.username
    });
  }
});

// GET sign-out
router.get('/sign-out', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
