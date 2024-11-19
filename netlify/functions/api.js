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

const api = express();

const router = Router();
router.get("/hello", (req, res) => res.send("Hello World!"));

api.use("/api/", router);

export const handler = serverless(api);