const express = require('express');
const router = express.Router();
const { createSupportTicket } = require('../controllers/supportController');

router.post('/', createSupportTicket);

module.exports = router;
