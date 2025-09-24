const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    date: {
        type:Date,
        require: true,
    },
    time: {
        type: String,
        require: true,
    },
    duration: {
        type: Number,
        default: 30,
    },
    status: {
        type: String,
        enum:['scheduled', 'completed', 'cancelled'],default: 'scheduled',
    },
    prescription: {
        type: String,
    }, 
    patient_id: {
    type:mongoose.Schema.Types.ObjectId,
    ref: 'User',
    require: true,
    },
    employee_id: {
        type:mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    timestamps: true 
});

const Appointment = mongoose.model('Appointment', appointmentSchema);
module.exports = Appointment;