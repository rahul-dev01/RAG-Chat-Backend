const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { v4: uuidv4 } = require('uuid');
const PDFSModel = require('../models/pdfs.model');
const { chunkText } = require('../utils/chunkText.utils');
const { uploadPDFToCloudinary, deletePDFFromCloudinary } = require('../config/cloudinary.config');
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


const GEMINI_API_KEY = process.env[`${NODE_ENV}_GEMINI_API_KEY`];
const EMBEDDING_MODEL = process.env[`${NODE_ENV}_EMBEDDING_MODEL`];
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);


// Index new PDF
const IndexNewPDFController = async (req, res) => {
    let pdfRecord = null;
    let pdfFilePath = null;

    try {
        console.log("Request received to index new PDF file");


        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No PDF file uploaded"
            });
        }

        pdfFilePath = req.file.path;
        const pdfFileName = req.file.originalname;
        const pdfFileSize = req.file.size;

        // Generate unique UUID for this PDF
        const pdfUuid = uuidv4();
        console.log(`Generated UUID for PDF: ${pdfUuid}`);

        console.log("Uploading PDF to Cloudinary...");
        cloudinaryUploadResult = await uploadPDFToCloudinary(pdfFilePath, pdfFileName, req.userId);

        if (!cloudinaryUploadResult.success) {
            console.error("Cloudinary upload failed:", cloudinaryUploadResult.error);
            return res.status(500).json({
                success: false,
                message: "Failed to upload PDF to cloud storage",
                error: cloudinaryUploadResult.error
            });
        }

        console.log(`PDF uploaded to Cloudinary: ${cloudinaryUploadResult.url}`);


        // Create initial PDF record in database
        pdfRecord = new PDFSModel({
            name: pdfFileName,
            original_name: pdfFileName,
            uuid: pdfUuid,
            size: pdfFileSize,
            uploaded_by: req.userId, 
            indexing_status: 'processing',
            cloudinary_url: cloudinaryUploadResult.url,
            cloudinary_public_id: cloudinaryUploadResult.public_id,
            cloudinary_bytes: cloudinaryUploadResult.bytes,
            cloudinary_format: cloudinaryUploadResult.format,
            storage_type: 'cloudinary'
        });

        await pdfRecord.save();
        console.log(`PDF record created in database with ID: ${pdfRecord._id}`);

        // Parse PDF and extract text
        const pdfFile = fs.readFileSync(pdfFilePath);
        let pdfText = "";
        let pageCount = 0;

        try {
            const pdfData = await pdfParse(pdfFile);
            pdfText = pdfData.text;
            pageCount = pdfData.numpages;
            console.log(`PDF text extracted successfully (${pageCount} pages)`);
        } catch (error) {
            console.error("PDF parsing failed:", error);

            // Update PDF record with error
            pdfRecord.indexing_status = 'failed';
            pdfRecord.error_message = 'Failed to parse PDF content';
            await pdfRecord.save();

            // Clean up - delete from Cloudinary if parsing failed
            await deletePDFFromCloudinary(cloudinaryUploadResult.public_id);

            return res.status(400).json({
                success: false,
                message: "Failed to parse the PDF. Please try uploading a valid PDF file.",
                pdf_id: pdfRecord._id
            });
        }

        // Update PDF record with page count
        pdfRecord.page_count = pageCount;
        await pdfRecord.save();

        // Validate extracted text
        if (!pdfText || pdfText.trim().length < 100) {
            pdfRecord.indexing_status = 'failed';
            pdfRecord.error_message = 'PDF contains insufficient text content';
            await pdfRecord.save();

            return res.status(400).json({
                success: false,
                message: "PDF contains insufficient text content for indexing. Please ensure the PDF contains readable text.",
                pdf_id: pdfRecord._id
            });
        }

        // Log text extraction info for debugging
        console.log(`Extracted ${pdfText.length} characters from PDF \n Text preview: ${pdfText.substring(0, 200)}...`);

        // Convert text into chunks with overlap
        const chunks = chunkText(pdfText, 1000, 100);
        console.log(`Created ${chunks.length} chunks from PDF`);

        if (chunks.length === 0) {
            throw new Error('No valid chunks created from PDF text');
        }

        // Process chunks and create embeddings
        let successfulChunks = 0;
        const embeddings = [];

        for (let index = 0; index < chunks.length; index++) {
            const chunk = chunks[index];
            console.log(`🔄 Processing chunk ${index + 1}/${chunks.length} (${chunk.length} characters)`);

            const cleanChunk = chunk
                .replace(/[""'']/g, '"')               
                .replace(/[•➜→]/g, '-')               
                .replace(/[^\x20-\x7E\n]/g, '')        
                .replace(/\s+/g, ' ')                  
                .trim();

            // Skip empty or very short chunks
            if (!cleanChunk || cleanChunk.length < 10) {
                console.log(`Skipping chunk ${index + 1} - too short (${cleanChunk.length} characters)`);
                continue;
            }

            try {
                console.log(`Generating embedding for chunk ${index + 1}...`);

                // Generate vector embedding using Gemini
                const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
                const embeddingResult = await model.embedContent(cleanChunk);

                if (!embeddingResult || !embeddingResult.embedding || !embeddingResult.embedding.values?.length) {
                    throw new Error('Empty or invalid embedding from Gemini for chunk ' + index);
                }

                const chunk_vector_embedding = embeddingResult.embedding.values;
                console.log(`Generated vector embedding for chunk ${index + 1}/${chunks.length} (${chunk_vector_embedding.length} dimensions)`);

                // Prepare data for Milvus insertion
                const MAX_VARCHAR_LENGTH = 3000;


                const embeddingData = {
                    chunk_vector_embedding: chunk_vector_embedding,
                    pdf_text: cleanChunk.substring(0, MAX_VARCHAR_LENGTH),  // truncate text to max allowed length
                    pdf_uuid: pdfUuid,
                    pdf_name: pdfFileName,
                    chunk_index: index,
                    user_id: req.userId.toString(),
                    created_at: new Date().toISOString(),
                    cloudinary_url: cloudinaryUploadResult.url
                };

                embeddings.push(embeddingData);

            } catch (err) {
                console.error(`Error generating embedding for chunk ${index + 1}:`, err.message);
                console.error(`Chunk content (first 100 chars): ${cleanChunk.substring(0, 100)}...`);
                continue;
            }
        }

        console.log(`Generated ${embeddings.length} embeddings out of ${chunks.length} chunks`);


        // Batch insert into Milvus (more efficient)
        if (embeddings.length > 0) {
            try {
                console.log(`Attempting to insert ${embeddings.length} embeddings into Milvus...`);

                // Best solution - combine timeout + connection check
                if (!milvusClient.connected) {
                    console.log('Connecting to Milvus...');
                    milvusClient.connect();
                }

                const milvusResponse = await Promise.race([
                    milvusClient.insert({
                        collection_name: "RAG_TEXT_EMBEDDING",
                        data: embeddings
                    }),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Milvus insert timeout after 30s')), 300000)
                    )
                ]);
                console.log('Milvus response:', milvusResponse);

                successfulChunks = milvusResponse.insert_cnt || 0;
                console.log(`Successfully inserted ${successfulChunks} chunks into Milvus`);

            } catch (milvusError) {
                console.error('Milvus batch insert failed:', milvusError);

                // Try individual inserts as fallback
                console.log('Attempting individual inserts as fallback...');
                for (let i = 0; i < embeddings.length; i++) {
                    try {
                        console.log(`Inserting individual chunk ${i + 1}/${embeddings.length}...`);
                        await milvusClient.insert({
                            collection_name: "RAG_TEXT_EMBEDDING",
                            data: [embeddings[i]]
                        });
                        successfulChunks++;
                        console.log(`Individual chunk ${i + 1} inserted successfully`);
                    } catch (err) {
                        console.error(`Individual insert failed for chunk ${i + 1}:`, err.message);
                    }
                }
            }
        } else {
            console.log('No embeddings to insert into Milvus');
        }

        // Update PDF record with final status
        pdfRecord.total_chunks = chunks.length;
        pdfRecord.successful_chunks = successfulChunks;
        pdfRecord.is_indexed = successfulChunks > 0;
        pdfRecord.indexing_status = successfulChunks > 0 ? 'completed' : 'failed';

        if (successfulChunks === 0) {
            pdfRecord.error_message = 'Failed to index any chunks';

            // If indexing completely failed, delete from Cloudinary
            await deletePDFFromCloudinary(cloudinaryUploadResult.public_id);
        }

        await pdfRecord.save();

        // Clean up uploaded file
        try {
            fs.unlinkSync(pdfFilePath);
            console.log("PDF file deleted successfully");
        } catch (error) {
            console.error("Error deleting uploaded file:", error.message);
        }

        console.log(`PDF indexing completed for ${pdfFileName}`);
        console.log(`Total chunks: ${chunks.length}, Successful: ${successfulChunks}`);

        const indexingMessage =
            successfulChunks === chunks.length
                ? "All PDF chunks were successfully indexed."
                : successfulChunks === 0
                    ? "PDF indexing failed. No chunks were saved."
                    : `Partially indexed: ${successfulChunks} out of ${chunks.length} chunks were successfully indexed.`;


        res.status(201).json({
            success: successfulChunks > 0,
            message: indexingMessage,
            pdf: {
                id: pdfRecord._id,
                uuid: pdfUuid,
                name: pdfFileName,
                size: pdfFileSize,
                size_mb: (pdfFileSize / (1024 * 1024)).toFixed(2),
                page_count: pageCount,
                total_chunks: chunks.length,
                successful_chunks: successfulChunks,
                indexing_status: pdfRecord.indexing_status,
                indexed_at: pdfRecord.indexed_at,
                cloudinary_url: cloudinaryUploadResult.url,
                storage_type: 'cloudinary'
            },
            endpoints: {
                query: `/api/v1/pdf/ask/${pdfUuid}`,
                info: `/api/v1/pdf/info/${pdfUuid}`,
                download: cloudinaryUploadResult.url
            }
        });

        console.log(`PDF indexed successfully: ${pdfFileName} (${pdfUuid})`);
    } catch (error) {
        console.error("Internal error during PDF indexing:", error);

        // Clean up Cloudinary upload if something went wrong
        if (cloudinaryUploadResult && cloudinaryUploadResult.success) {
            try {
                await deletePDFFromCloudinary(cloudinaryUploadResult.public_id);
                console.log("Cleaned up Cloudinary upload due to error");
            } catch (cleanupError) {
                console.error("Error cleaning up Cloudinary upload:", cleanupError);
            }
        }

        // Update PDF record with error if it exists
        if (pdfRecord) {
            try {
                pdfRecord.indexing_status = 'failed';
                pdfRecord.error_message = error.message;
                await pdfRecord.save();
            } catch (dbError) {
                console.error("Failed to update PDF record with error:", dbError);
            }
        }

        // Clean up uploaded file if it exists
        if (pdfFilePath && fs.existsSync(pdfFilePath)) {
            try {
                fs.unlinkSync(pdfFilePath);
            } catch (cleanupError) {
                console.error("Error cleaning up file:", cleanupError);
            }
        }

        res.status(500).json({
            success: false,
            message: "Error while indexing PDF file",
            error: error.message,
            pdf_id: pdfRecord?._id
        });
    }
};

module.exports = {
    IndexNewPDFController
}