require('dotenv').config();
const PDFSModel = require('../models/pdfs.model');
const USERSModel = require('../models/users.model');


// Share PDF with user
const SharePDFController = async (req, res) => {
    try {
        const { uuid } = req.params;
        const userId = req.userId;
        const { user_email, permission = 'read' } = req.body;

        // Validate permission
        if (!['read', 'write'].includes(permission)) {
            return res.status(400).json({
                success: false,
                message: 'Permission must be either "read" or "write"'
            });
        }

        // Find PDF
        const pdf = await PDFSModel.findOne({ uuid, uploaded_by: userId });
        if (!pdf) {
            return res.status(404).json({
                success: false,
                message: 'PDF not found or you do not have permission to share it'
            });
        }

        // Find user to share with
        const userToShareWith = await USERSModel.findOne({ email: user_email });
        if (!userToShareWith) {
            return res.status(404).json({
                success: false,
                message: 'User not found with this email address'
            });
        }

        // Check if trying to share with self
        if (userToShareWith._id.toString() === userId.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Cannot share PDF with yourself'
            });
        }

        // Initialize shared_with array if it doesn't exist
        if (!pdf.shared_with) {
            pdf.shared_with = [];
        }

        // Check if already shared with this user
        const existingShareIndex = pdf.shared_with.findIndex(
            share => share.user_id && share.user_id.toString() === userToShareWith._id.toString()
        );

        if (existingShareIndex >= 0) {
            // Update existing permission
            pdf.shared_with[existingShareIndex].permission = permission;
            pdf.shared_with[existingShareIndex].shared_at = new Date();
        } else {
            // Add new share
            pdf.shared_with.push({
                user_id: userToShareWith._id,
                permission: permission,
                shared_at: new Date()
            });
        }

        // Save the PDF with updated sharing info
        await pdf.save();

        res.status(200).json({
            success: true,
            message: `PDF shared successfully with ${user_email}`,
            shared_with: {
                user: {
                    name: userToShareWith.fullName,
                    email: userToShareWith.email
                },
                permission: permission
            }
        });

    } catch (error) {
        console.error('Error in SharePDFController:', error);

        res.status(500).json({
            success: false,
            message: 'Error sharing PDF',
            error: error.message
        });
    }
};


module.exports = {
    SharePDFController
}