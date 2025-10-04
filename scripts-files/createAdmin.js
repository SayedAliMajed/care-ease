const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/user'); // Make sure path is correct

async function createAdmin() {
    try {
        // Use environment variable for MongoDB URI instead of hardcoding
        const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://sayedali:dZyxeb3kASBebhYV@cluster0.vikumfe.mongodb.net/care-easy?retryWrites=true&w=majority&appName=Cluster0';
        
        await mongoose.connect(mongoURI);
        console.log('Connected to MongoDB');

        // Check if admin already exists by username or email
        const existingAdmin = await User.findOne({
            $or: [
                { username: 'admin' },
                { email: 'sayed.ali.majed@gmail.com' },
                { role: 'admin' }
            ]
        });

        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash('sayed', 10);
            
            const adminUser = new User({
                username: 'sayedali',
                email: 'sayed.ali.majed@gmail.com',
                password: hashedPassword,
                role: 'admin',
                profile: {
                    fullName: 'Administrator',
                    cpr: '892233112' // Required field in your User model
                }
            });

            await adminUser.save();
            console.log('✅ Admin user created successfully');
            console.log('Username: SayedAli');
            console.log('Password: sayed');
            console.log('Email: sayed.ali.majed@gmail.com');
            
        } else {
            console.log('⚠️ Admin account already exists:');
            console.log(`Username: ${existingAdmin.username}`);
            console.log(`Email: ${existingAdmin.email}`);
            console.log(`Role: ${existingAdmin.role}`);
        }

    } catch (error) {
        console.error('❌ Error creating admin:', error.message);
    } finally {
        // Always close the connection
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
    }
}

createAdmin();