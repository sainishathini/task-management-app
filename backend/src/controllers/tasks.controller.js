const Task = require('../models/task.model');

exports.listByBoard = async (req, res) => {
  const tasks = await Task.find({ board: req.params.boardId }).sort('order');
  res.json(tasks);
};

exports.create = async (req, res) => {
  const { title, description, priority, dueDate, status, order } = req.body;
  const task = await Task.create({ title, description, priority, dueDate, status, order, board: req.params.boardId, createdBy: req.user._id });
  res.status(201).json(task);
};

exports.get = async (req, res) => {
  const task = await Task.findById(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
};

exports.update = async (req, res) => {
  const task = await Task.findByIdAndUpdate(req.params.taskId, req.body, { new: true });
  res.json(task);
};

exports.remove = async (req, res) => {
  await Task.findByIdAndDelete(req.params.taskId);
  res.json({ ok: true });
};

exports.move = async (req, res) => {
  // payload: { status, order }
  const { status, order } = req.body;
  const task = await Task.findById(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  task.status = status || task.status;
  if (order !== undefined) task.order = order;
  await task.save();
  res.json(task);
};
