const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  priority: { type: String, enum: ['Low','Medium','High'], default: 'Medium' },
  dueDate: { type: Date },
  status: { type: String, enum: ['pending','in-progress','completed'], default: 'pending' },
  order: { type: Number, default: 0 },
  board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);
