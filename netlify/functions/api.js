const  express =  require("express");
const { Router } = require('express')
const serverless = require("serverless-http");
const app = express()
const port = 3001
const { GoogleGenerativeAI } = require('@google/generative-ai')
const { GoogleAIFileManager, FileState  } = require('@google/generative-ai/server')
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const https = require('https');
const path = require('path');
require('dotenv').config()

const cors = require('cors');
const { default: axios } = require('axios')
app.options('*', cors());
app.use(cors());
const createReadStream = require('fs').createReadStream;

const api = express();

const { google } = require('googleapis');

// Downloaded from while creating credentials of service account
const pkey = require('./pk.json');

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

async function authorize() {
  const jwtClient = new google.auth.JWT(
    pkey.client_email,
    null,
    pkey.private_key,
    SCOPES
  )
  await jwtClient.authorize();
  return jwtClient;
}
async function uploadFile(authClient) {
  const drive = google.drive({ version: 'v3', auth: authClient });

    const file = await drive.files.create({
      media: {
        body: createReadStream('https://asset.cloudinary.com/zainahmed/c556f323d5036708a186475ab7d82b86')
      },
      fields: 'id',
      requestBody: {
        name: path.basename('https://asset.cloudinary.com/zainahmed/c556f323d5036708a186475ab7d82b86'),
      },
    });
    console.log("file",file.data.id)
    return file.data.id
}


const speechToText = async (language, url, res) => {
    const fileManager = new GoogleAIFileManager(process.env.GOOGLE_GEMINI_KEY);
    try {
      // const fileName = 'netlify/functions/media/'+Date()+'.mp3'
      // const localPath  = fs.createWriteStream('./'+fileName)
    //  const id =  await authorize().then(uploadFile)
    //  console.log("id",id)
      // https.get(url, async (response)=> {
  
      //    response.pipe(localPath)
         
      //    setTimeout( async () => {
        
        const uploadResult = await fileManager.uploadFile('1rswysiVwUho1a1rHlt8nJtUu5AVJ2xE7',{
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
        `convert the audio in text and translate the text in ${language} language`,
          {
            fileData: {
              fileUri: uploadResult.file.uri,
              mimeType: uploadResult.file.mimeType,
            },
          },
        ]);
        res.json(result.response.text())
        // return  result.response.text()
      //   }, 2000);
      // })
  
    } catch (error) {
        console.error('Error fetching data:', error.message);
    }
  }

  

const router = Router();
router.get("/hello", async (req, res) => {
  if(req.query.language && req.query.url){
    await speechToText(req.query.language,req.query.url, res)
  }else{
    res.json("no response")
  }
    // res.send("Hello World!")
});

api.use("/api/", router);

export const handler = serverless(api);