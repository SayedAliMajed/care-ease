const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BreakTimeSchema = new mongoose.Schema({
    startTime: {
        type: String, 
    },
    endTime: {
        type: String,
    }
});

const availabilitySchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        index:true,
    },
    openingTime: {
        type: String,
        required: true,
    },
    closingTime:{
        type:String,
        required: true,
    },
    duration: {
        type:Number,
        required: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    doctorId: {
        type: Schema.Types.ObjectId,
        ref: 'User',  
        required: true,
        index: true,
    },
    isRepeating: {
        type: Boolean,
        default: false,
    },
    breakTimes: [BreakTimeSchema]
});  

availabilitySchema.index({ userId: 1, doctorId: 1, date: 1 }, { unique: true });
const Availability = mongoose.model('Availability', availabilitySchema);

module.exports = Availability;