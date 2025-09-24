const mongoose = require('mongoose');


const slotSchema = new mongoose.Schema ({
    
    time: {
        type:String,
        require: true,
    },
    isBooked: {
        type:Boolean,
        require: true,
        default: false,
    }
    
});

const availabilitySchema = new mongoose.Schema ({
    date: {
        type: Date,
        require: true,
    },
    slots: [slotSchema],
    employee_id: {
        type:mongoose.Schema.Types.ObjectId,
        ref: 'User',
        require: true,
    },
    
});

const Availability = mongoose.model('Availability', availabilitySchema);
module.exports = Availability;