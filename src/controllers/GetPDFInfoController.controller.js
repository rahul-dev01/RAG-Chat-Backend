const { MilvusClient } = require('@zilliz/milvus2-sdk-node');
const PDFSModel = require('../models/pdfs.model'); 

require('dotenv').config();
const NODE_ENV = process.env.NODE_ENV;

const MILVUS_ENDPOINT_ADDRESS = process.env[`${NODE_ENV}_MILVUS_ENDPOINT_ADDRESS`];
const MILVUS_TOKEN = process.env[`${NODE_ENV}_MILVUS_TOKEN`] ;

if (!MILVUS_ENDPOINT_ADDRESS || !MILVUS_TOKEN) {
    console.error('Milvus credentials are missing in .env');
    process.exit(1);
}

// Initialize Milvus client
const milvusClient = new MilvusClient({
    address: MILVUS_ENDPOINT_ADDRESS,
    token: MILVUS_TOKEN,
    timeout: 60000
});

// Fixed: Controller to get PDF metadata by UUID
const GetPDFInfoController = async (req, res) => {
    try {
        const { uuid } = req.params;

        if (!uuid || typeof uuid !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Valid PDF UUID is required'
            });
        }

        console.log('Getting PDF info for UUID:', uuid);

        // Query PDF model to get complete PDF information
        const pdfRecord = await PDFSModel.findOne({ uuid }).select(
            'name original_name uuid size page_count total_chunks successful_chunks indexing_status cloudinary_url storage_type createdAt'
        );

        if (!pdfRecord) {
            return res.status(404).json({
                success: false,
                message: 'PDF not found with the provided UUID'
            });
        }

        // Check if PDF is properly indexed
        if (pdfRecord.indexing_status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: `PDF indexing is ${pdfRecord.indexing_status}. Please wait for indexing to complete.`
            });
        }

        // Return data in the format expected by frontend
        res.status(200).json({
            success: true,
            pdf: {
                id: pdfRecord._id,
                uuid: pdfRecord.uuid,
                name: pdfRecord.name,
                original_name: pdfRecord.original_name,
                size_mb: (pdfRecord.size / (1024 * 1024)).toFixed(2),
                page_count: pdfRecord.page_count,
                total_chunks: pdfRecord.total_chunks,
                successful_chunks: pdfRecord.successful_chunks,
                indexing_status: pdfRecord.indexing_status,
                cloudinary_url: pdfRecord.cloudinary_url,
                storage_type: pdfRecord.storage_type,
                created_at: pdfRecord.createdAt
            }
        });

    } catch (error) {
        console.error('Error in GetPDFInfoController:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving PDF information: ' + error.message
        });
    }
};

module.exports = {
    GetPDFInfoController
};