const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const User = require('../models/user');

async function createAdmin() {
    try {
    await mongoose.connect('mongodb+srv://sayedali:dZyxeb3kASBebhYV@cluster0.vikumfe.mongodb.net/care-easy?retryWrites=true&w=majority&appName=Cluster0');
    const hashedPassword = await bcrypt.hash('sayed', 10);
    const existingAdmin = await User.findOne({role:'admin'});
    if(!existingAdmin) {
        const adminUser = new User ({
            username: 'admin',
            email: 'sayed.ali.majed@gmail.com',
            password: hashedPassword,
            role: 'admin',
            profile: {
                fullName: 'Administrator'   
        }
    });

    await adminUser.save();
    console.log('admin user created successfully');

} else {
    console.log('admin account already exist');
}
    } catch(error) {
        console.error(error.message);
    }
    
}

createAdmin();