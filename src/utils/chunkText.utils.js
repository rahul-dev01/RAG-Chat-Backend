
export const chunkText = (text, chunkSize = null, overlap = null) => {
  // Clean and normalize the text first
  let cleanText = text
    .replace(/\s+/g, ' ')  
    .replace(/[^\x20-\x7E\n]/g, '')  
    .trim();

  // If text is too short, return it as a single chunk
  if (cleanText.length < 100) {
    return [cleanText];
  }

  const words = cleanText.split(/\s+/);
  const wordCount = words.length;

  // Default values based on document size
  if (!chunkSize || !overlap) {
    if (wordCount <= 500) {
      chunkSize = 250;
      overlap = 50;
    } else if (wordCount <= 2000) {
      chunkSize = 500;
      overlap = 100;
    } else if (wordCount <= 5000) {
      chunkSize = 1000;
      overlap = 150;
    } else {
      chunkSize = 1500;
      overlap = 200;
    }
  }

  // Ensure overlap is not larger than chunk size
  if (overlap >= chunkSize) {
    overlap = Math.floor(chunkSize * 0.2); // 20% overlap
  }

  const chunks = [];
  for (let i = 0; i < words.length; i += (chunkSize - overlap)) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim() && chunk.length > 10) { // Ensure chunk has meaningful content
      chunks.push(chunk.trim());
    }
  }

  // If no chunks were created, create at least one chunk
  if (chunks.length === 0) {
    chunks.push(cleanText);
  }

  return chunks;
};
