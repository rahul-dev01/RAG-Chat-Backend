const PDFSModel = require('../models/pdfs.model');

const ListPDFsController = async (req, res) => {
    try {
        const userId = req.userId;  // ← Change this line
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User authentication required'
            });
        }
        
        const limit = parseInt(req.query.limit) || 10;
        const page = parseInt(req.query.page) || 1;

        const pdfs = await PDFSModel.findByUser(userId, {
            sort: { createdAt: -1 },
            limit,
            skip: (page - 1) * limit
        });

        res.status(200).json({
            success: true,
            total: pdfs.length,
            pdfs
        });

    } catch (error) {
        console.error('Error in ListPDFsController:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to list PDFs: ' + error.message
        });
    }
};

module.exports = {
    ListPDFsController
}
