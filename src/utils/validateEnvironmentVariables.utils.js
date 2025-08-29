// export const validateEnvironmentVariables = () => {
//     const required = [
//         'GEMINI_API_KEY',
//         'DEV_EMBEDDING_MODEL',
//         'MILVUS_ENDPOINT_ADDRESS',
//         'MILVUS_TOKEN',
//         'CLOUDINARY_API_KEY'  
//     ];
//     const missing = required.filter(key => !process.env[key]);

//     if (missing.length > 0) {
//         throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
//     }

//     // Validate Cloudinary URL format
//     const cloudinaryUrl = process.env.CLOUDINARY_API_KEY;
//     if (!cloudinaryUrl || !cloudinaryUrl.startsWith('cloudinary://')) {
//         throw new Error('CLOUDINARY_API_KEY must be in format: cloudinary://api_key:api_secret@cloud_name');
//     }

//     // Validate Gemini API key
//     if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.length < 10) {
//         throw new Error('GEMINI_API_KEY must be a valid API key');
//     }

//     // Validate Milvus configuration
//     if (!process.env.MILVUS_ENDPOINT_ADDRESS || !process.env.MILVUS_TOKEN) {
//         throw new Error('MILVUS_ENDPOINT_ADDRESS and MILVUS_TOKEN are required');
//     }
// };
