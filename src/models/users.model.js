const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, "Full Name is required"],
        trim: true,
        minlength: [3, "Full Name must be at least 3 characters long"],
        maxlength: [50, "Full Name cannot exceed 50 characters"],
        unique: true
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        trim: true,
        lowercase: true,
        unique: true,
        match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"]
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [6, "Password must be at least 6 characters long"],
        select: false 
    },
    role: {
        type: String,
        enum: ["user"], 
        default: "user"
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true 
});

const USERSModel = mongoose.model("users", UserSchema);

module.exports = USERSModel;

