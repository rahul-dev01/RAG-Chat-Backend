const express = require('express');
const multerMiddleware = require('./../../middlewares/multer.middleware');
const { AuthMiddleware } = require('../../middlewares/auth.middleware');
const { IndexNewPDFController } = require('../../controllers/IndexNewPDFController.controller');
const { DeletePDFController } = require('../../controllers/DeletePDFController.controller');
const { DeleteMultiplePDFsController } = require('../../controllers/DeleteMultiplePDFsController.controller');
const { DeleteAllUserPDFsController } = require('../../controllers/DeleteAllUserPDFsController.controller');
const { GetUserPDFsController } = require('../../controllers/GetUserPDFsController.contrller');
const { GetPDFDetailsController } = require('../../controllers/GetPDFDetailsController.controller');
const { UpdatePDFController } = require('../../controllers/UpdatePDFController.controller');
const { SharePDFController } = require('../../controllers/SharePDFController.controller');
const { RemoveSharingController } = require('../../controllers/RemoveSharingController.controller');
const { GetPDFsByStatusController } = require('../../controllers/GetPDFsByStatusController.controller');
const { getPDFDownloadController } = require('../../controllers/GetPDFDownloadController.controller');

const pdfRouter = express.Router();

pdfRouter.post('/upload', AuthMiddleware, multerMiddleware, IndexNewPDFController);
pdfRouter.delete('/:pdfId', AuthMiddleware, DeletePDFController);
pdfRouter.delete('/bulk/delete', AuthMiddleware, DeleteMultiplePDFsController);
pdfRouter.delete('/user/all', AuthMiddleware, DeleteAllUserPDFsController);
pdfRouter.get('/list-pdf', AuthMiddleware, GetUserPDFsController);
pdfRouter.get('/details/:uuid', AuthMiddleware, GetPDFDetailsController);
pdfRouter.put('/update/:uuid', AuthMiddleware, UpdatePDFController);
pdfRouter.post('/share/:uuid', AuthMiddleware, SharePDFController);
pdfRouter.post('/remove-sharing/:uuid', AuthMiddleware, RemoveSharingController);
pdfRouter.get('/status/:status', AuthMiddleware, GetPDFsByStatusController);
pdfRouter.get('/download/:uuid', AuthMiddleware, getPDFDownloadController);


module.exports = pdfRouter;