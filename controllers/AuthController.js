import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const user = await User.create({ name, email, password, role: 'user' });
    const token = generateToken(user._id);

    // --- PRODUCTION COOKIE SETTINGS ---
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: true,      // Required for cross-site cookies
      sameSite: 'none',  // Required for cross-site cookies
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      success: true,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check statuses
    if (user.role === 'technician' && user.status === 'pending-deletion') {
      return res.status(403).json({ success: false, message: 'Deletion pending. Contact admin.' });
    }
    if (user.status === 'inactive') {
      return res.status(403).json({ success: false, message: 'Account deactivated. Contact admin.' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    // --- PRODUCTION COOKIE SETTINGS ---
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: true,      // Must be true on Render/Vercel (HTTPS)
      sameSite: 'none',  // Must be 'none' to work across Vercel/Render domains
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        specialization: user.specialization,
        experience: user.experience
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const logout = (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    secure: true,     // Match the login settings
    sameSite: 'none', // Match the login settings
    expires: new Date(0)
  });
  
  res.json({ success: true, message: 'Logged out successfully' });
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};