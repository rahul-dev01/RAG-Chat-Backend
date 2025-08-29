const PDFSModel = require('../models/pdfs.model');

const GetPDFsByStatusController = async (req, res) => {
    try {
        const { status } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const validStatuses = ['pending', 'processing', 'completed', 'failed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
            });
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        const pdfs = await PDFSModel.find({ indexing_status: status })
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .populate('uploaded_by', 'fullName email');

        const total = await PDFSModel.countDocuments({ indexing_status: status }); 

        res.status(200).json({
            success: true,
            status,
            pdfs: pdfs.map(pdf => ({
                id: pdf._id,
                uuid: pdf.uuid,
                name: pdf.name,
                size_mb: pdf.size_mb,
                indexing_status: pdf.indexing_status,
                total_chunks: pdf.total_chunks,
                successful_chunks: pdf.successful_chunks,
                error_message: pdf.error_message,
                created_at: pdf.createdAt,
                uploaded_by: {
                    name: pdf.uploaded_by.fullName,
                    email: pdf.uploaded_by.email
                }
            })),
            pagination: {
                current_page: pageNum,
                total_pages: Math.ceil(total / limitNum),
                total_pdfs: total,
                has_next: pageNum * limitNum < total,
                has_prev: pageNum > 1
            }
        });
    } catch (error) {
        console.error('Error in GetPDFsByStatusController:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching PDFs by status',
            error: error.message
        });
    }
};



module.exports = {
    GetPDFsByStatusController
};