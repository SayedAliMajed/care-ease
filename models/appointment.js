const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    default: 20, 
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled',
  },
  prescription: {
    type: String,
  },
  cpr: {
    type: String,
    required: false,
    index: true,
    validate: {
      validator: function(v) {
        return !v || /^[0-9]{9}$/.test(v); // Make validation optional if no CPR provided
      },
      message: props => `${props.value} is not a valid CPR (must be exactly 9 digits)`
    }
  },
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  doctor_Id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  availabilityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Availability',
    required: true,
  },
}, { timestamps: true }); 

const Appointment = mongoose.model('Appointment', appointmentSchema);
module.exports = Appointment;