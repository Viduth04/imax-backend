import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import readline from 'readline';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const name = await question('Enter admin name: ');
    const email = await question('Enter admin email: ');
    const password = await question('Enter admin password: ');
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User with this email already exists!');
      process.exit(1);
    }
    
    const admin = await User.create({
      name,
      email,
      password,
      role: 'admin'
    });
    
    console.log('Admin created successfully!');
    console.log(`Name: ${admin.name}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Role: ${admin.role}`);
    
  } catch (error) {
    console.error('Error creating admin:', error.message);
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
}

createAdmin();