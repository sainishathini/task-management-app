const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Configuration & Constants
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/taskmanager';
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// MONGOOSE SCHEMAS & MODELS
// ==========================================

// 1. User Schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// findByEmail static method on schema
userSchema.statics.findByEmail = function (email) {
  if (!email) return null;
  return this.findOne({ email: email.toLowerCase().trim() });
};

// Password hashing pre-save hook
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Omit password from JSON serialization
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = mongoose.model('User', userSchema);

// 2. Board Schema
const boardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Board title is required'],
    trim: true,
    maxlength: [100, 'Board title cannot exceed 100 characters']
  },
  color: {
    type: String,
    default: '#3B82F6',
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Board = mongoose.model('Board', boardSchema);

// 3. Task Schema
const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  boardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: [true, 'Board ID is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Task title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  priority: {
    type: String,
    enum: {
      values: ['Low', 'Medium', 'High'],
      message: '{VALUE} is not a valid priority'
    },
    default: 'Medium'
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'in-progress', 'completed'],
      message: '{VALUE} is not a valid status'
    },
    default: 'pending'
  },
  dueDate: {
    type: Date,
    default: null
  },
  position: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for position sorting per board
taskSchema.index({ boardId: 1, position: 1 });

const Task = mongoose.model('Task', taskSchema);

// ==========================================
// HELPERS & MIDDLEWARE
// ==========================================

// Custom Error Class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Async route wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Check valid MongoDB ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Generate JWT Helper
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// JWT Middleware to verify tokens
const authenticateToken = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Access denied. No authentication token provided.', 401));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid authentication token.', 401));
    }
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Authentication token has expired.', 401));
    }
    return next(err);
  }
});

// ==========================================
// API ROUTES
// ==========================================

// --- Root & Health Check ---
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Task Management API Server is running',
    version: '1.0.0'
  });
});

// --- Auth Routes ---

// POST /api/auth/register - Register User
app.post(
  '/api/auth/register',
  asyncHandler(async (req, res, next) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return next(new AppError('Please provide name, email, and password', 400));
    }

    if (password.length < 6) {
      return next(new AppError('Password must be at least 6 characters long', 400));
    }

    // Using custom findByEmail static method
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return next(new AppError('User already exists with this email address', 400));
    }

    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  })
);

// POST /api/auth/login - Login User
app.post(
  '/api/auth/login',
  asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    // Using custom findByEmail static method
    const user = await User.findByEmail(email);
    if (!user) {
      return next(new AppError('Invalid email or password', 401));
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new AppError('Invalid email or password', 401));
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  })
);

// --- Board Routes ---

// GET /api/boards - Get all user's boards
app.get(
  '/api/boards',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const boards = await Board.find({ userId: req.user._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: boards.length,
      boards
    });
  })
);

// POST /api/boards - Create board
app.post(
  '/api/boards',
  authenticateToken,
  asyncHandler(async (req, res, next) => {
    const { title, color } = req.body;

    if (!title || !title.trim()) {
      return next(new AppError('Board title is required', 400));
    }

    const board = await Board.create({
      userId: req.user._id,
      title: title.trim(),
      color: color || '#3B82F6'
    });

    res.status(201).json({
      success: true,
      board
    });
  })
);

// PUT /api/boards/:id - Update board
app.put(
  '/api/boards/:id',
  authenticateToken,
  asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return next(new AppError('Invalid board ID format', 400));
    }

    const { title, color } = req.body;
    const updateFields = {};

    if (title !== undefined) updateFields.title = title.trim();
    if (color !== undefined) updateFields.color = color;

    const board = await Board.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!board) {
      return next(new AppError('Board not found or unauthorized', 404));
    }

    res.status(200).json({
      success: true,
      board
    });
  })
);

// DELETE /api/boards/:id - Delete board (and cascade delete tasks)
app.delete(
  '/api/boards/:id',
  authenticateToken,
  asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return next(new AppError('Invalid board ID format', 400));
    }

    const board = await Board.findOneAndDelete({ _id: id, userId: req.user._id });

    if (!board) {
      return next(new AppError('Board not found or unauthorized', 404));
    }

    // Cascade delete all tasks associated with this board
    await Task.deleteMany({ boardId: id, userId: req.user._id });

    res.status(200).json({
      success: true,
      message: 'Board and all associated tasks deleted successfully'
    });
  })
);

// --- Task Routes ---

// GET /api/tasks/:boardId - Get tasks for board
app.get(
  '/api/tasks/:boardId',
  authenticateToken,
  asyncHandler(async (req, res, next) => {
    const { boardId } = req.params;

    if (!isValidObjectId(boardId)) {
      return next(new AppError('Invalid board ID format', 400));
    }

    // Verify board belongs to user
    const board = await Board.findOne({ _id: boardId, userId: req.user._id });
    if (!board) {
      return next(new AppError('Board not found or unauthorized', 404));
    }

    const tasks = await Task.find({ boardId, userId: req.user._id }).sort({ position: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      tasks
    });
  })
);

// POST /api/tasks - Create task
app.post(
  '/api/tasks',
  authenticateToken,
  asyncHandler(async (req, res, next) => {
    const { boardId, title, description, priority, status, dueDate } = req.body;

    if (!boardId || !isValidObjectId(boardId)) {
      return next(new AppError('Valid boardId is required', 400));
    }

    if (!title || !title.trim()) {
      return next(new AppError('Task title is required', 400));
    }

    // Verify board belongs to user
    const board = await Board.findOne({ _id: boardId, userId: req.user._id });
    if (!board) {
      return next(new AppError('Board not found or unauthorized', 404));
    }

    // Compute auto position (highest position + 1)
    const lastTask = await Task.findOne({ boardId, userId: req.user._id }).sort({ position: -1 });
    const position = lastTask && typeof lastTask.position === 'number' ? lastTask.position + 1 : 0;

    const task = await Task.create({
      userId: req.user._id,
      boardId,
      title: title.trim(),
      description: description || '',
      priority: priority || 'Medium',
      status: status || 'pending',
      dueDate: dueDate ? new Date(dueDate) : null,
      position
    });

    res.status(201).json({
      success: true,
      task
    });
  })
);

// PUT /api/tasks/reorder/:boardId - Reorder tasks (drag & drop)
app.put(
  '/api/tasks/reorder/:boardId',
  authenticateToken,
  asyncHandler(async (req, res, next) => {
    const { boardId } = req.params;

    if (!isValidObjectId(boardId)) {
      return next(new AppError('Invalid board ID format', 400));
    }

    // Verify board ownership
    const board = await Board.findOne({ _id: boardId, userId: req.user._id });
    if (!board) {
      return next(new AppError('Board not found or unauthorized', 404));
    }

    const { tasks } = req.body; // Expects array of objects containing id/_id and position (and optionally status)

    if (!Array.isArray(tasks)) {
      return next(new AppError('Tasks payload must be an array of task objects with id and position', 400));
    }

    const bulkOps = tasks.map((item) => {
      const taskId = item._id || item.id;
      if (!isValidObjectId(taskId)) {
        throw new AppError(`Invalid task ID: ${taskId}`, 400);
      }

      const updateData = { position: Number(item.position) };
      if (item.status) updateData.status = item.status;

      return {
        updateOne: {
          filter: { _id: taskId, boardId, userId: req.user._id },
          update: { $set: updateData }
        }
      };
    });

    if (bulkOps.length > 0) {
      await Task.bulkWrite(bulkOps);
    }

    const updatedTasks = await Task.find({ boardId, userId: req.user._id }).sort({ position: 1 });

    res.status(200).json({
      success: true,
      message: 'Tasks reordered successfully',
      tasks: updatedTasks
    });
  })
);

// PUT /api/tasks/:id - Update task
app.put(
  '/api/tasks/:id',
  authenticateToken,
  asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return next(new AppError('Invalid task ID format', 400));
    }

    const { title, description, priority, status, dueDate, position, boardId } = req.body;
    const updateFields = {};

    if (title !== undefined) updateFields.title = title.trim();
    if (description !== undefined) updateFields.description = description;
    if (priority !== undefined) updateFields.priority = priority;
    if (status !== undefined) updateFields.status = status;
    if (dueDate !== undefined) updateFields.dueDate = dueDate ? new Date(dueDate) : null;
    if (position !== undefined) updateFields.position = position;

    // Moving task to another board
    if (boardId !== undefined) {
      if (!isValidObjectId(boardId)) {
        return next(new AppError('Invalid target board ID format', 400));
      }
      const targetBoard = await Board.findOne({ _id: boardId, userId: req.user._id });
      if (!targetBoard) {
        return next(new AppError('Target board not found or unauthorized', 404));
      }
      updateFields.boardId = boardId;
    }

    const task = await Task.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!task) {
      return next(new AppError('Task not found or unauthorized', 404));
    }

    res.status(200).json({
      success: true,
      task
    });
  })
);

// DELETE /api/tasks/:id - Delete task
app.delete(
  '/api/tasks/:id',
  authenticateToken,
  asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return next(new AppError('Invalid task ID format', 400));
    }

    const task = await Task.findOneAndDelete({ _id: id, userId: req.user._id });

    if (!task) {
      return next(new AppError('Task not found or unauthorized', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  })
);

// --- User Stats Route ---

// GET /api/stats - Get user statistics
app.get(
  '/api/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const [totalBoards, totalTasks, statusStats, priorityStats, overdueCount] = await Promise.all([
      Board.countDocuments({ userId }),
      Task.countDocuments({ userId }),
      Task.aggregate([
        { $match: { userId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Task.aggregate([
        { $match: { userId } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),
      Task.countDocuments({
        userId,
        dueDate: { $lt: new Date() },
        status: { $ne: 'completed' }
      })
    ]);

    const tasksByStatus = {
      pending: 0,
      'in-progress': 0,
      completed: 0
    };
    statusStats.forEach((item) => {
      if (item._id) tasksByStatus[item._id] = item.count;
    });

    const tasksByPriority = {
      Low: 0,
      Medium: 0,
      High: 0
    };
    priorityStats.forEach((item) => {
      if (item._id) tasksByPriority[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      stats: {
        totalBoards,
        totalTasks,
        overdueTasks: overdueCount,
        tasksByStatus,
        tasksByPriority
      }
    });
  })
);

// ==========================================
// ERROR HANDLING & 404 ROUTE
// ==========================================

// Handle 404 Unmatched Routes
app.use((req, res, next) => {
  next(new AppError(`Cannot find endpoint ${req.originalUrl} on this server`, 404));
});

// Centralized Error Middleware
app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((el) => el.message);
    return res.status(400).json({
      success: false,
      error: `Validation Error: ${errors.join('. ')}`
    });
  }

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(400).json({
      success: false,
      error: `Duplicate value entered for ${field}. Please use another value.`
    });
  }

  // Handle Mongoose Cast Error (Invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: `Invalid format for ${err.path}: ${err.value}`
    });
  }

  if (!err.isOperational) {
    console.error('SERVER ERROR 💥:', err);
  }

  res.status(err.statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// ==========================================
// SERVER LAUNCH & DATABASE CONNECTION
// ==========================================

const startServer = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully');

    const server = app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });

    // Graceful Shutdown Handlers
    const shutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        console.log('HTTP server closed.');
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('MongoDB connection failure:', error);
    process.exit(1);
  }
};

startServer();
