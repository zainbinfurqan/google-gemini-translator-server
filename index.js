const express = require('express')
const app = express()
const port = 3000
const { GoogleGenerativeAI } = require('@google/generative-ai')
const { GoogleAIFileManager, FileState  } = require('@google/generative-ai/server')
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');

// client id 1171866073-kh60kbss29qo0gmrk9j6p0te974csssi.apps.googleusercontent.com

const speechToText = async () => {
  const fileManager = new GoogleAIFileManager('');
  const uploadResult = await fileManager.uploadFile(
    `media/intro.mp3`,
    {
      mimeType: "audio/mp3",
      displayName: "Audio sample",
    },
  );
  let file = await fileManager.getFile(uploadResult.file.name);
  while (file.state === FileState.PROCESSING) {
    process.stdout.write(".");
    // Sleep for 10 seconds
    await new Promise((resolve) => setTimeout(resolve, 10_000));
    // Fetch the file from the API again
    file = await fileManager.getFile(uploadResult.file.name);
  }

  if (file.state === FileState.FAILED) {
    throw new Error("Audio processing failed.");
  }
  
  // View the response.
  console.log(
    `Uploaded file ${uploadResult.file.displayName} as: ${uploadResult.file.uri}`,
  );

  const genAI = new GoogleGenerativeAI('');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const result = await model.generateContent([
  "convert the audio in text.",
  {
    fileData: {
      fileUri: uploadResult.file.uri,
      mimeType: uploadResult.file.mimeType,
    },
  },
]);
console.log(result.response.text());
}

app.get('/text-to-speech', (req, res) => {
  speechToText()
  res.send('Hello World!')
})

app.get('/convert-text-to-speech', async (req,res)=>{
  // Create a client
const client = new textToSpeech.TextToSpeechClient();

async function convertTextToAudio(text, languageCode = 'es-ES') { // Default to Spanish (Spain)
  const request = {
    input: { text },
    voice: { languageCode: languageCode, ssmlGender: 'NEUTRAL' },
    audioConfig: { audioEncoding: 'MP3' },
  };

  // Perform the text-to-speech request
  const [response] = await client.synthesizeSpeech(request);

  // Write the binary audio content to a file
  const outputFilePath = path.join(__dirname, 'output.mp3');
  fs.writeFileSync(outputFilePath, response.audioContent, 'binary');
  console.log('Audio content written to file: ' + outputFilePath);
}

// Example usage
convertTextToAudio('Hi I am zain ahmed, working at dominos', 'fr-FR');
})



app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})