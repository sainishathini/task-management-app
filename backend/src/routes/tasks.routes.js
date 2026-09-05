const express = require('express');
const router = express.Router();
const tasksCtrl = require('../controllers/tasks.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);
router.get('/board/:boardId', tasksCtrl.listByBoard);
router.post('/board/:boardId', tasksCtrl.create);
router.get('/:taskId', tasksCtrl.get);
router.put('/:taskId', tasksCtrl.update);
router.delete('/:taskId', tasksCtrl.remove);
router.patch('/:taskId/move', tasksCtrl.move);

module.exports = router;
