const express = require('express');
const pdfRouter = require('./pdf.router');
const queryRouter = require('./query.router');
const authRouter = require('./auth.router');

const v1Router = express.Router();

v1Router.use('/pdf', pdfRouter);
v1Router.use('/pdf', queryRouter);
v1Router.use('/auth', authRouter);

module.exports = v1Router;