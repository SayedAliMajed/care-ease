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

// MIDDLEWARE - Correct order is crucial!

// Morgan for logging HTTP requests (should be first)
app.use(morgan('dev'));

// Static files middleware
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing middleware - MUST come before routes
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Method override for PUT/DELETE
app.use(methodOverride('_method'));

// View engine setup
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
      maxAge: 1000 * 60 * 60 * 24, // 1 day
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

// ROUTES

// Global Error Handler - should be last
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  
  // Simple error response without requiring error.ejs
  res.status(500).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Server Error</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .error-container { max-width: 500px; margin: 0 auto; }
      </style>
    </head>
    <body>
      <div class="error-container">
        <h1>500 - Server Error</h1>
        <p>Something went wrong on our end. Please try again later.</p>
        <a href="/">Return to Homepage</a>
        ${process.env.NODE_ENV === 'development' ? `<pre>${err.message}</pre>` : ''}
      </div>
    </body>
    </html>
  `);
});


app.get('/', (req, res) => {
  res.render('index.ejs');
});

app.use('/auth', authController);

// Protected Routes (require authentication)
app.use(isSignedIn); 

app.use('/admin', adminController);
app.use('/appointments', appointmentsController);
app.use('/availabilitys', availabilitysController);


app.use((req, res) => {
  res.status(404).render('404', { user: req.session.user });
});


app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  res.status(500).render('error', { 
    message: 'Something went wrong!',
    user: req.session.user 
  });
});

// Start server
app.listen(port, () => {
  console.log(`The express app is ready on port ${port}!`);
});