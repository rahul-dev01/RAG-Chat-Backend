require('dotenv').config();
const PDFSModel = require('../models/pdfs.model');
const USERSModel = require('../models/users.model');

// Remove PDF sharing
const RemoveSharingController = async (req, res) => {
    try {
        const { uuid } = req.params;
        const userId = req.userId;
        const { user_email } = req.body;

        const pdf = await PDFSModel.findOne({ uuid, uploaded_by: userId });
        if (!pdf) {
            return res.status(404).json({
                success: false,
                message: 'PDF not found or you do not have permission to modify sharing'
            });
        }

        // Find user to remove sharing from
        const userToRemove = await USERSModel.findOne({ email: user_email });
        if (!userToRemove) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if shared_with array exists
        if (!pdf.shared_with || pdf.shared_with.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'PDF is not shared with this user'
            });
        }

        // Find and remove the sharing entry
        const initialLength = pdf.shared_with.length;
        pdf.shared_with = pdf.shared_with.filter(
            share => share.user_id && share.user_id.toString() !== userToRemove._id.toString()
        );

        // Check if anything was actually removed
        if (pdf.shared_with.length === initialLength) {
            return res.status(404).json({
                success: false,
                message: 'PDF is not shared with this user'
            });
        }

        // Save the updated PDF
        await pdf.save();

        res.status(200).json({
            success: true,
            message: `Sharing removed for ${user_email}`
        });

    } catch (error) {
        console.error('Error in RemoveSharingController:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing sharing',
            error: error.message
        });
    }
};

module.exports = {
    RemoveSharingController
}