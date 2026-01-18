import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const quickDrop = async () => {
  try {
    console.log('⚠️  QUICK DROP MODE - NO CONFIRMATION ⚠️\n');
    
    await mongoose.connect("mongodb+srv://dev:1234@cluster0.2e779dx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
    console.log('✅ Connected to database');

    await mongoose.connection.dropDatabase();
    console.log('✅ Database dropped successfully!');

    await mongoose.connection.close();
    console.log('✅ Connection closed\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

quickDrop();