const router = require('express').Router();

const { saveData, getPdf, generatePdf, savePdf, deletePdf } = require('./youtube.controller');

router.get('/:id', getPdf);
router.post('/save', saveData);
router.patch('/save-pdf', savePdf);
router.get('/generate-pdf/:id', generatePdf);
router.delete('/', deletePdf);

module.exports = router;