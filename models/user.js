
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,   
    unique: true,
  },
  role: {
    type: String,
    required: true,   
    enum: ['patient', 'doctor', 'employee', 'admin'],
  },
  profile: {
    fullName: String,
    phone: String,
    address: String,
    department: String, // only for employee
    specialty: String,  // only for doctor
  },
}, { timestamps: true }); 

const User = mongoose.model('User', userSchema);

module.exports = User;
