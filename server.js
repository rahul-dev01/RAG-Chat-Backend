const express = require('express');
require('dotenv').config();
const cors = require('cors');
const v1Router = require('./src/routers/v1/v1.router');
const { RequestLoggerMiddleware } = require('./src/middlewares/requestlogger.middleware.js');
const { connectToDB } = require('./src/database/db.connect.js')


const NODE_ENV = process.env.NODE_ENV;
const PORT = process.env[`${NODE_ENV}_PORT`];


const server = express(); 
server.use(express.json()); 
server.use(RequestLoggerMiddleware); 
server.use(cors()); 

server.use('/api/v1', v1Router);

async function startServer() {
    try {
        await connectToDB(); 
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT} & enviroment is ${NODE_ENV}`);
        })
    } catch (error) {
        console.error(`Error while starting the server ${error}`);
    }
}
startServer(); 