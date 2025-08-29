const fs = require("fs");
const wav = require("wav");
const vosk = require("vosk");
const path = require("path");

const MODEL_PATH = path.join(__dirname, "model");
const AUDIO_FILE = path.join(__dirname, "670ca1b7-df4f-4c9c-b5a1-9a8392838a96_audio.wav");

if (!fs.existsSync(MODEL_PATH)) {
  console.error("Model folder not found! Download a Vosk model and unzip to ./model");
  process.exit(1);
}

const MODEL_SAMPLE_RATE = 16000;

const model = new vosk.Model(MODEL_PATH);
const rec = new vosk.Recognizer({ model: model, sampleRate: MODEL_SAMPLE_RATE });

const fileStream = fs.createReadStream(AUDIO_FILE);
const reader = new wav.Reader();

reader.on("format", (format) => {
  if (format.sampleRate !== MODEL_SAMPLE_RATE || format.channels !== 1) {
    console.error(`Audio must be mono WAV at ${MODEL_SAMPLE_RATE}Hz`);
    process.exit(1);
  }
});

reader.on("data", (data) => {
  rec.acceptWaveform(data);
});

reader.on("end", () => {
  const result = rec.finalResult();
  console.log("🎤 Transcribed Text:", result.text); // Logs the text
  rec.free();
  model.free();
});

fileStream.pipe(reader);
