const PDFSModel = require('../models/pdfs.model');
// Get PDF download URL (redirect to Cloudinary)
const getPDFDownloadController = async (req, res) => {
    try {
        const { uuid } = req.params;
        
        const pdfRecord = await PDFSModel.findOne({ 
            uuid: uuid, 
            uploaded_by: req.userId 
        });

        if (!pdfRecord) {
            return res.status(404).json({
                success: false,
                message: "PDF not found"
            });
        }

        // Redirect to Cloudinary URL for download
        res.redirect(pdfRecord.cloudinary_url);

    } catch (error) {
        console.error("Error getting PDF download:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving PDF download link",
            error: error.message
        });
    }
};

module.exports = {
    getPDFDownloadController
}