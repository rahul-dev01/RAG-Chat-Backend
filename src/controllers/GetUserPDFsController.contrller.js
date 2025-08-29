const PDFSModel = require('../models/pdfs.model');
const cloudinary = require('cloudinary').v2;


// Get user's PDFs (owned, shared, and public) - Only indexed/completed PDFs
const GetUserPDFsController = async (req, res) => {
    try {
        const userId = req.userId;
        const { page = 1, limit = 10, status, type = 'all' } = req.query;

        let pdfs;
        let total;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        // Build query options
        const options = {
            sort: { createdAt: -1 },
            limit: limitNum,
            skip: (pageNum - 1) * limitNum
        };

        // Base filter for indexed and completed PDFs
        const baseIndexedFilter = {
            is_indexed: true,
            indexing_status: 'completed'
        };

        // Get PDFs based on type
        switch (type) {
            case 'owned':
                const ownedQuery = { 
                    uploaded_by: userId,
                    ...baseIndexedFilter
                };
                if (status) ownedQuery.indexing_status = status;

                pdfs = await PDFSModel.find(ownedQuery, null, options);
                total = await PDFSModel.countDocuments(ownedQuery);
                break;

            case 'shared':
                pdfs = await PDFSModel.findSharedWithUser(userId, options, baseIndexedFilter);
                total = await PDFSModel.countDocuments({ 
                    'shared_with.user': userId,
                    ...baseIndexedFilter
                });
                break;

            case 'public':
                const publicQuery = { 
                    is_public: true,
                    ...baseIndexedFilter
                };
                pdfs = await PDFSModel.find(publicQuery, null, options);
                total = await PDFSModel.countDocuments(publicQuery);
                break;

            default: // 'all'
                const allQuery = {
                    $or: [
                        { uploaded_by: userId },
                        { is_public: true },
                        { 'shared_with.user': userId }
                    ],
                    ...baseIndexedFilter
                };
                pdfs = await PDFSModel.find(allQuery, null, options);
                total = await PDFSModel.countDocuments(allQuery);
        }

        // Format response with Cloudinary URLs
        const formattedPdfs = pdfs.map(pdf => {
            let cloudinaryUrl = null;
            
            // Generate Cloudinary URL if PDF has cloudinary_public_id
            if (pdf.cloudinary_public_id) {
                cloudinaryUrl = cloudinary.url(pdf.cloudinary_public_id, {
                    resource_type: 'auto',
                    secure: true,
                    format: 'pdf'
                });
            }

            return {
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
                is_owner: pdf.uploaded_by.toString() === userId.toString(),
                is_public: pdf.is_public,
                permission: pdf.getUserPermission ? pdf.getUserPermission(userId) : 'read',
                tags: pdf.tags,
                description: pdf.description,
                cloudinary_url: cloudinaryUrl,
                cloudinary_public_id: pdf.cloudinary_public_id
            };
        });

        res.status(200).json({
            success: true,
            pdfs: formattedPdfs,
            pagination: {
                current_page: pageNum,
                total_pages: Math.ceil(total / limitNum),
                total_pdfs: total,
                has_next: pageNum * limitNum < total,
                has_prev: pageNum > 1,
                per_page: limitNum
            },
            filter: {
                type,
                status: status || 'completed', 
                indexed_only: true
            }
        });

    } catch (error) {
        console.error('Error in GetUserPDFsController:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user PDFs',
            error: error.message
        });
    }
};

module.exports = {
    GetUserPDFsController
};