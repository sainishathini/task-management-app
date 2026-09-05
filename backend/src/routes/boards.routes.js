const express = require('express');
const router = express.Router();
const boardsCtrl = require('../controllers/boards.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);
router.get('/', boardsCtrl.list);
router.post('/', boardsCtrl.create);
router.get('/:boardId', boardsCtrl.get);
router.put('/:boardId', boardsCtrl.update);
router.delete('/:boardId', boardsCtrl.remove);

module.exports = router;
