require('dotenv').config();
const { chunkText } = require('./src/utils/chunkText.utils');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Test text
const testText = `This is a test document with multiple sentences. 
It contains various types of content including technical terms, 
mathematical expressions, and regular text. The purpose of this 
test is to verify that the chunking function works correctly 
and that embeddings can be generated for each chunk. 
This should help identify any issues with the PDF processing pipeline.`;

console.log('Testing chunking and embedding process...\n');

// Test chunking
console.log('Original text length:', testText.length, 'characters');
console.log('Original text preview:', testText.substring(0, 100) + '...\n');

const chunks = chunkText(testText, 100, 20);
console.log(`Created ${chunks.length} chunks:`);

chunks.forEach((chunk, index) => {
    console.log(`  Chunk ${index + 1}: ${chunk.length} characters - "${chunk.substring(0, 50)}..."`);
});

console.log('\nTesting embedding generation...');

// Test embedding generation
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DEV_EMBEDDING_MODEL = process.env.DEV_EMBEDDING_MODEL;

if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not found in environment variables');
    process.exit(1);
}

if (!DEV_EMBEDDING_MODEL) {
    console.error('DEV_EMBEDDING_MODEL not found in environment variables');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function testEmbeddings() {
    try {
        for (let i = 0; i < Math.min(chunks.length, 2); i++) {
            const chunk = chunks[i];
            console.log(`Testing embedding for chunk ${i + 1}...`);
            
            const model = genAI.getGenerativeModel({ model: DEV_EMBEDDING_MODEL });
            const embeddingResult = await model.embedContent(chunk);
            
            if (embeddingResult && embeddingResult.embedding && embeddingResult.embedding.values) {
                console.log(`Successfully generated embedding for chunk ${i + 1}`);
                console.log(`Dimensions: ${embeddingResult.embedding.values.length}`);
                console.log(`First few values: [${embeddingResult.embedding.values.slice(0, 5).join(', ')}...]`);
            } else {
                console.log(`Failed to generate embedding for chunk ${i + 1}`);
            }
        }
        
        console.log('\nEmbedding test completed successfully!');
    } catch (error) {
        console.error('Embedding test failed:', error.message);
    }
}

testEmbeddings();
