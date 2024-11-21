const express = require('express')
const app = express()
const port = 3001
const { GoogleGenerativeAI } = require('@google/generative-ai')
const { GoogleAIFileManager, FileState  } = require('@google/generative-ai/server')
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const https = require('https');
const path = require('path');
require('dotenv').config()
const { Router } = require('express')

const cors = require('cors');
const { default: axios } = require('axios')
app.options('*', cors());
app.use(cors());

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET
// });

const speechToText = async (language, url, res) => {
  const fileManager = new GoogleAIFileManager(process.env.GOOGLE_GEMINI_KEY);
  try {
    const fileName = 'media/'+Date()+'.mp3'
    const localPath  = fs.createWriteStream('./'+fileName)

    // https.get(url, async (response)=> {

      //  response.pipe(localPath)
       
       setTimeout( async () => {
      
      const uploadResult = await fileManager.uploadFile('https://asset.cloudinary.com/zainahmed/c556f323d5036708a186475ab7d82b86',{
        mimeType: "audio/mp3",
        displayName: "Audio sample",
      });

      let file = await fileManager.getFile(uploadResult.file.name);

      while (file.state === FileState.PROCESSING) {
        process.stdout.write(".");
        await new Promise((resolve) => setTimeout(resolve, 10_000));
        file = await fileManager.getFile(uploadResult.file.name);
      }

      if (file.state === FileState.FAILED) {
        throw new Error("Audio processing failed.");
      }
  
      console.log(
        `Uploaded file ${uploadResult.file.displayName} as: ${uploadResult.file.uri}`,
      );
      
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent([
      `convert the audio in text and translate the text in ${'german'} language`,
        {
          fileData: {
            fileUri: uploadResult.file.uri,
            mimeType: uploadResult.file.mimeType,
          },
        },
      ]);
      res.json(result.response.text())
      return  result.response.text()
      }, 2000);
    // })

  } catch (error) {
      console.error('Error fetching data:', error.message);
  }
}

app.get('/speech-to-text', async (req, res) => {
  await speechToText(req.query.language,req.query.url, res)
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

app.get('/translate', async (req,res)=>{
  res.json("working...")
})

app.get('/', async (req,res)=>{
  res.json("working...")
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})