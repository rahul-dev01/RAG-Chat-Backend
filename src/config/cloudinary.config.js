const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV;
const cloudinaryUrl = process.env[`${NODE_ENV}_CLOUDINARY_API_KEY`];

if (!cloudinaryUrl || !cloudinaryUrl.startsWith("cloudinary://")) {
    throw new Error("Invalid or missing CLOUDINARY_API_KEY");
}

// Parse the URL
const [, credentialsPart] = cloudinaryUrl.split("://");
const [auth, cloudName] = credentialsPart.split("@");
const [apiKey, apiSecret] = auth.split(":");

// Configure Cloudinary
cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
});


// Upload PDF to Cloudinary
const uploadPDFToCloudinary = async (filePath, originalName, userId) => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: 'raw',
            folder: `pdfs/${userId}`,
            public_id: `${Date.now()}_${originalName
                .replace(/\.[^/.]+$/, "")
                .trim()
                .replace(/\s+/g, "_")}`,
            use_filename: true,
            unique_filename: false,
            overwrite: false,
            tags: ['pdf', 'document', `user_${userId}`],
            context: {
                uploaded_by: userId,
                original_name: originalName,
                upload_date: new Date().toISOString()
            }
        });

        return {
            success: true,
            url: result.secure_url,
            public_id: result.public_id,
            bytes: result.bytes,
            format: result.format,
            resource_type: result.resource_type,
            created_at: result.created_at
        };
    } catch (error) {
        console.error('Cloudinary upload failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Delete PDF from Cloudinary
const deletePDFFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: 'raw'
        });
        return {
            success: result.result === 'ok',
            result: result.result
        };
    } catch (error) {
        console.error('Cloudinary delete failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Get PDF info from Cloudinary
const getPDFInfoFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.api.resource(publicId, {
            resource_type: 'raw'
        });
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Cloudinary get info failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Test connection function
const testCloudinaryConnection = async () => {
    try {
        const result = await cloudinary.api.ping();
        console.log('Cloudinary connection successful:', result);
        return true;
    } catch (error) {
        console.error('Cloudinary connection failed:', error);
        return false;
    }
};

module.exports = {
    cloudinary,
    uploadPDFToCloudinary,
    deletePDFFromCloudinary,
    getPDFInfoFromCloudinary,
    testCloudinaryConnection
};