const express = require('express');
const { QueryController } = require('./../../controllers/QueryController.controller');
const { GetPDFInfoController } = require('./../../controllers/GetPDFInfoController.controller');

const { AuthMiddleware } = require('../../middlewares/auth.middleware');

const queryRouter = express.Router();
queryRouter.post('/ask/:uuid',AuthMiddleware, QueryController);
queryRouter.get('/info/:uuid',AuthMiddleware, GetPDFInfoController);

module.exports = queryRouter;