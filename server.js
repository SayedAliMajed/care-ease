const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const morgan = require('morgan');
const session = require('express-session');
const MongoStore = require("connect-mongo");
const path = require('path');

const isSignedIn = require("./middleware/is-signed-in.js");
const passUserToView = require("./middleware/pass-user-to-view.js");

// Controllers
const authController = require('./controllers/auth.js');
const appointmentsController = require('./controllers/appointments.js');
const availabilitysController = require('./controllers/availabilitys.js');
const adminController = require('./controllers/admin');

const app = express();
const port = process.env.PORT || '3000';

// Middleware
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 14 * 24 * 60 * 60 
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      secure: false, 
      httpOnly: true,
    },
  })
);

app.use(passUserToView);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

mongoose.connection.on('connected', () => {
  console.log(`Connected to MongoDB ${mongoose.connection.name}.`);
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// Routes
app.get('/', (req, res) => {
  res.render('index.ejs');
});

app.use('/auth', authController);

// Protected Routes
app.use(isSignedIn); 
app.use('/admin', adminController);
app.use('/appointments', appointmentsController);
app.use('/availabilitys', availabilitysController);


app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});