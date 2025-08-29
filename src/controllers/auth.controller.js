require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const UserModel = require('../models/users.model');

require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV;
const JWT_SECRET_KEY = process.env[`${NODE_ENV}_JWT_SECRET_KEY`];

const SALT_ROUNDS = 12; 

if (!JWT_SECRET_KEY) {
    console.error('JWT_SECRET_KEY is not configured in .env');
    process.exit(1);
}

const generateToken = (userId, email, role) => {
    return jwt.sign(
        {
            userId: userId.toString(),
            email,
            role
        },
        JWT_SECRET_KEY,
        { expiresIn: '24h' }
    );
};

const isValidEmail = (email) => {
    const emailRegex = /^\S+@\S+\.\S+$/;
    return emailRegex.test(email);
};

const isValidPassword = (password) => {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/;
    return passwordRegex.test(password);
};

const SignupController = async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        if (!fullName?.trim()) {
            return res.status(400).json({ success: false, message: "Full name is required" });
        }

        if (fullName.trim().length < 3 || fullName.trim().length > 50) {
            return res.status(400).json({ success: false, message: "Full name must be between 3 and 50 characters" });
        }

        if (!email?.trim()) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        if (!isValidEmail(email.trim())) {
            return res.status(400).json({ success: false, message: "Please provide a valid email address" });
        }

        if (!password) {
            return res.status(400).json({ success: false, message: "Password is required" });
        }

        if (!isValidPassword(password)) {
            return res.status(400).json({ 
                success: false, 
                message: "Password must be at least 6 characters long and contain at least one letter and one number" 
            });
        }

        const existingUser = await UserModel.findOne({ email: email.trim().toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ success: false, message: "User with this email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const newUser = new UserModel({
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            password: hashedPassword
        });

        const savedUser = await newUser.save();

        const token = generateToken(savedUser._id, savedUser.email, savedUser.role || 'user');

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                user: {
                    id: savedUser._id,
                    fullName: savedUser.fullName,
                    email: savedUser.email,
                    createdAt: savedUser.createdAt
                },
                token: token
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ 
                success: false, 
                message: messages.join('. ')
            });
        }

        if (error.code === 11000) {
            return res.status(409).json({ 
                success: false, 
                message: "User with this email already exists" 
            });
        }

        res.status(500).json({ 
            success: false, 
            message: "Internal server error. Please try again later." 
        });
    }
};

const SigninController = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email?.trim()) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        if (!isValidEmail(email.trim())) {
            return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
        }

        if (!password) {
            return res.status(400).json({ success: false, message: 'Password is required' });
        }

        const user = await UserModel.findOne({ email: email.trim().toLowerCase() }).select('+password');

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const token = generateToken(user._id, user.email, user.role || 'user');

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    createdAt: user.createdAt
                },
                token: token
            }
        });

    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error. Please try again later." 
        });
    }
};

module.exports = {
    SignupController,
    SigninController,
};