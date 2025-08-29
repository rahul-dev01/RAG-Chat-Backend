require('dotenv').config();
const PDFSModel = require('../models/pdfs.model');
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



const GEMINI_API_KEY = process.env[`${NODE_ENV}_GEMINI_API_KEY`]
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const EMBEDDING_MODEL = process.env[`${NODE_ENV}_EMBEDDING_MODEL`];



// Delete all PDFs for a user
const DeleteAllUserPDFsController = async (req, res) => {
    try {
        console.log("Request received to delete all user PDFs");
        const userId = req.userId;


        const pdfRecords = await PDFSModel.find({ uploaded_by: userId });

        if (pdfRecords.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No PDFs found for this user"
            });
        }

        console.log(`Found ${pdfRecords.length} PDF records for user deletion`);

        // Delete vectors from Milvus
        let totalDeletedVectors = 0;
        
        try {
            const milvusDeleteResponse = await milvusClient.delete({
                collection_name: "RAG_TEXT_EMBEDDING",
                filter: `user_id == "${userId}"`
            });

            totalDeletedVectors = milvusDeleteResponse.delete_cnt || 0;
            console.log(`Deleted ${totalDeletedVectors} vectors from Milvus`);

        } catch (milvusError) {
            console.error("Error deleting vectors from Milvus:", milvusError);
            console.warn("Continuing with database deletion despite Milvus error");
        }

        // Delete all PDF records for this user
        const deleteResult = await PDFSModel.deleteMany({ uploaded_by: userId });

        console.log(`Deleted ${deleteResult.deletedCount} PDF records from database`);

        const deletedPDFs = pdfRecords.map(pdf => ({
            id: pdf._id,
            uuid: pdf.uuid,
            name: pdf.name,
            total_chunks: pdf.total_chunks
        }));

        res.status(200).json({
            success: true,
            message: `Successfully deleted all ${pdfRecords.length} PDFs for user`,
            deleted_pdfs: deletedPDFs,
            total_deleted_vectors: totalDeletedVectors,
            deleted_at: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error while deleting user PDFs",
            error: error.message
        });
    }
};

module.exports = {
    DeleteAllUserPDFsController
};