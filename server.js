const dotenv = require('dotenv');

dotenv.config();
const express = require('express');

const app = express();
app.set('view engine', 'ejs');

const mongoose = require('mongoose');
const methodOverride = require('method-override');
const morgan = require('morgan');
const session = require('express-session');
const MongoStore = require("connect-mongo");
const isSignedIn = require("./middleware/is-signed-in.js");
const passUserToView = require("./middleware/pass-user-to-view.js");

// Controllers
const authController = require('./controllers/auth.js');
const appointmentsController = require('./controllers/appointments.js');
const availabilitysController = require('./controllers/availabilitys.js');
const adminController = require('./controllers/admin');

// Set the port from environment variable or default to 3000
const port = process.env.PORT ? process.env.PORT : '3000';
const path = require('path');
mongoose.connect(process.env.MONGODB_URI);

mongoose.connection.on('connected', () => {
  console.log(`Connected to MongoDB ${mongoose.connection.name}.`);
});

// MIDDLEWARE

// Middleware to parse URL-encoded data from forms
app.use(express.urlencoded({ extended: true }));
// Middleware for using HTTP verbs such as PUT or DELETE
app.use(methodOverride('_method'));
// Morgan for logging HTTP requests
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 14 * 24 * 60 * 60 // session lifetime, 14 days
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      secure: false, // true if HTTPS
      httpOnly: true,
    },
  })
);


app.use(passUserToView);

// PUBLIC
app.get('/', (req, res) => {
  res.render('index.ejs');
});

app.use('/auth', authController);
app.use('/admin', adminController);
app.use(isSignedIn);
app.use('/appointments', appointmentsController);
app.use('/availabilitys', availabilitysController);
app.use(express.json());

// PROTECTED

app.listen(port, () => {
  console.log(`The express app is ready on port ${port}!`);
});
