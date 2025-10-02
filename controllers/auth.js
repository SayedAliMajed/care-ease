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
    const userInDatabase = await User.findOne({ username: req.body.username }).lean(); // fetch full user document

    if (!userInDatabase) {
      return res.send('Username or Password is invalid');
    }

    const validPassword = bcrypt.compareSync(req.body.password, userInDatabase.password);

    if (!validPassword) {
      return res.send('Username or Password is invalid');
    }

    // Store entire user document in session, including profile
    req.session.user = userInDatabase;

    req.session.save(() => {
      res.redirect('/admin/dashboard');
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
