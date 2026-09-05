const Board = require('../models/board.model');

exports.list = async (req, res) => {
  const boards = await Board.find({ owner: req.user._id }).sort('-createdAt');
  res.json(boards);
};

exports.create = async (req, res) => {
  const { title } = req.body;
  const board = await Board.create({ title, owner: req.user._id });
  res.status(201).json(board);
};

exports.get = async (req, res) => {
  const board = await Board.findById(req.params.boardId);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  res.json(board);
};

exports.update = async (req, res) => {
  const board = await Board.findByIdAndUpdate(req.params.boardId, req.body, { new: true });
  res.json(board);
};

exports.remove = async (req, res) => {
  await Board.findByIdAndDelete(req.params.boardId);
  res.json({ ok: true });
};
