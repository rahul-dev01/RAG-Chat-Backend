const PDFSModel = require('../models/pdfs.model');
const USERSModel = require('../models/users.model');
const { MilvusClient } = require("@zilliz/milvus2-sdk-node");

require('dotenv').config();
const NODE_ENV = process.env.NODE_ENV;
const MILVUS_ENDPOINT_ADDRESS = process.env[`${NODE_ENV}_MILVUS_ENDPOINT_ADDRESS`];
const MILVUS_TOKEN = process.env[`${NODE_ENV}_MILVUS_TOKEN`] ;

const milvusClient = new MilvusClient({
    address: MILVUS_ENDPOINT_ADDRESS,
    token: MILVUS_TOKEN,
    timeout: 60000
});

// Update PDF metadata
const UpdatePDFController = async (req, res) => {
    try {
        const { uuid } = req.params;
        const userId = req.userId;
        const { name, description, tags, is_public } = req.body;

        // Find PDF
        const pdf = await PDFSModel.findOne({ uuid, uploaded_by: userId });

        if (!pdf) {
            return res.status(404).json({
                success: false,
                message: 'PDF not found or you do not have permission to update it'
            });
        }

        // Update fields
        if (name) pdf.name = name;
        if (description !== undefined) pdf.description = description;
        if (tags) pdf.tags = tags;
        if (is_public !== undefined) pdf.is_public = is_public;

        await pdf.save();

        res.status(200).json({
            success: true,
            message: 'PDF updated successfully',
            pdf: {
                id: pdf._id,
                uuid: pdf.uuid,
                name: pdf.name,
                description: pdf.description,
                tags: pdf.tags,
                is_public: pdf.is_public,
                updated_at: pdf.updatedAt
            }
        });

    } catch (error) {
        console.error('Error in UpdatePDFController:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating PDF',
            error: error.message
        });
    }
};

module.exports = {
    UpdatePDFController
}