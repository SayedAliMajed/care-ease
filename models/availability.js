const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
    time: {
        type: String,
        required: true,  
    },
    isBooked: {
        type: Boolean,
        required: true,
        default: false,
    }
});

const availabilitySchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
    },
    slots: [slotSchema],
    employee_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, { timestamps: true });  

const Availability = mongoose.model('Availability', availabilitySchema);

module.exports = Availability;
