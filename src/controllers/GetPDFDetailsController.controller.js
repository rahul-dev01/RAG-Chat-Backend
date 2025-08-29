const PDFSModel = require('../models/pdfs.model');


// Get single PDF details
const GetPDFDetailsController = async (req, res) => {
    try {
        const { uuid } = req.params;
        const userId = req.userId;

        // Find PDF
        const pdf = await PDFSModel.findOne({ uuid }).populate('uploaded_by', 'fullName email');

        if (!pdf) {
            return res.status(404).json({
                success: false,
                message: 'PDF not found'
            });
        }

        // Check access
        if (!pdf.hasAccess(userId)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view this PDF'
            });
        }
        const isOwner = pdf.uploaded_by._id.toString() === userId.toString();
        let userPermission = 'none';

        if (isOwner) {
            userPermission = 'owner';
        } else if (pdf.is_public) {
            userPermission = 'read';
        } else if (pdf.shared_with && pdf.shared_with.length > 0) {
            // Check if user has specific permission
            const userShare = pdf.shared_with.find(share =>
                share.user_id && share.user_id.toString() === userId.toString()
            );
            if (userShare) {
                userPermission = userShare.permission || 'read';
            }
        }

        res.status(200).json({
            success: true,
            pdf: {
                id: pdf._id,
                uuid: pdf.uuid,
                name: pdf.name,
                original_name: pdf.original_name,
                size: pdf.size,
                size_mb: pdf.size_mb,
                page_count: pdf.page_count,
                is_indexed: pdf.is_indexed,
                indexing_status: pdf.indexing_status,
                total_chunks: pdf.total_chunks,
                successful_chunks: pdf.successful_chunks,
                indexed_at: pdf.indexed_at,
                created_at: pdf.createdAt,
                updated_at: pdf.updatedAt,
                error_message: pdf.error_message,
                is_owner: pdf.uploaded_by._id.toString() === userId.toString(),
                is_public: pdf.is_public,
                permission: userPermission,
                tags: pdf.tags,
                description: pdf.description,
                uploaded_by: {
                    name: pdf.uploaded_by.fullName,
                    email: pdf.uploaded_by.email
                },
                shared_with: pdf.shared_with.map(share => ({
                    permission: share.permission,
                    shared_at: share.shared_at
                }))
            }
        });

    } catch (error) {
        console.error('Error in GetPDFDetailsController:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching PDF details',
            error: error.message
        });
    }
};

module.exports = {
    GetPDFDetailsController
}