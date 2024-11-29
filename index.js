const express = require('express')
const app = express()
const Port = process.env.PORT || 3001;
const { GoogleGenerativeAI } = require('@google/generative-ai')
const { GoogleAIFileManager, FileState  } = require('@google/generative-ai/server')
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');
require('dotenv').config()
const { Router } = require('express')
const bodyParser = require('body-parser')

const cors = require('cors');
const { default: axios } = require('axios')
const { Server } = require('http')
app.options('*', cors());
app.use(cors());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded())
const socketIo = require('socket.io');

app.use(bodyParser.json())
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*", // Allow any origin for simplicity; adjust as necessary
    methods: ["GET", "POST"]
  }
});

// app.post('/api/askai',  async (req, res) => {
//   const body  = req.body
//   console.log(body)
//   const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_KEY);
//   const fileManager = new GoogleAIFileManager(process.env.GOOGLE_GEMINI_KEY);
//   const model = genAI.getGenerativeModel({
//     model: "gemini-1.5-flash",
//   });

//   const uploadResponse = await fileManager.uploadFile(`media/${body.bookId}.pdf`,{
//     mimeType: "application/pdf",
//     displayName: `media/${body.bookId}.pdf`,
//   });

//   console.log(
//     `Uploaded file ${uploadResponse.file.displayName} as: ${uploadResponse.file.uri}`,
//   );

//   const result = await model.generateContentStream([
//     {
//       fileData: {
//         mimeType: uploadResponse.file.mimeType,
//         fileUri: uploadResponse.file.uri,
//       },
//     },
//     { text: body.query },
//   ]);
//   for await (const chunk of result.stream) {
//     const chunkText = chunk.text();
//     console.log("chunkText",chunkText)
//   }
//   // console.log("result",result.response.text())
//   res.json(result.response.text())
// })
const generateContent = async (uploadResponse, data) => {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
  });
  let queryBuilder = data.query + 'from this uploaded file'
  if(data.language != null) {
    queryBuilder + 'also convert this text to ' + data.language
  }
  return result = await model.generateContentStream([
    {
      fileData: {
        mimeType: uploadResponse.file.mimeType,
        fileUri: uploadResponse.file.uri,
      },
    },
    { text: data.query + 'from this uploaded file' },
  ]);
}

const uploadResponseFn = async (data) => {
  const fileManager = new GoogleAIFileManager(process.env.GOOGLE_GEMINI_KEY);
 return fileManager.uploadFile(`media/${data.bookId}.pdf`,{
    mimeType: "application/pdf",
    displayName: `media/${data.bookId}.pdf`,
  });
}

const returnStreamChunk = async (result, socket) => {
  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    console.log("chunkText",chunkText)
    socket.emit('answer-by-ai-model',{ isEnd: false, data: chunkText})
  }
}

io.on('connection',  async (socket) => {
  console.log('A user connected');
  
  let uploadResponse = null

  //-------book-selected------//
  socket.on('book-selected', async (data)=>{
    if(uploadResponse) {
    } else {
      uploadResponse = await uploadResponseFn(data);
    
      console.log(`Uploaded file ${uploadResponse.file.displayName} as: ${uploadResponse.file.uri}`);
    }
  })
  //-------book-selected------//
 
  //-------ask-ai-model------//
  socket.on('ask-ai-model', async (data)=>{
    if(uploadResponse) {
      try {
        console.log("uploadResponse",uploadResponse)

        const result = await generateContent(uploadResponse, data)
  
      await returnStreamChunk(result, socket)
       
        socket.emit('answer-by-ai-model',{ isError: false, isEnd: true, data: ''})
      } catch (error) {
        socket.emit('answer-by-ai-model',{ isError: true, isEnd: true, data: ''})
        console.log("error",error)
      }
    } else {

      try {
        uploadResponse = await uploadResponseFn(data)
    
        console.log(`Uploaded file ${uploadResponse.file.displayName} as: ${uploadResponse.file.uri}`);
  
        const result = await generateContent(uploadResponse, data)
  
      await returnStreamChunk(result, socket)
  
        socket.emit('answer-by-ai-model',{ isError: false, isEnd: true, data: ''})
      } catch (error) {
        socket.emit('answer-by-ai-model',{ isError: true, isEnd: true, data: ''})
        console.log("error",error)
      }
    }
  })
  //-------ask-ai-model------//

  //-------disconnect------//
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
  //-------disconnect------//
});

app.get('/', (req, res) => {
res.json('working...')
})

server.listen(Port, () => {
  console.log(`server Example app listening on port ${Port}`);
});