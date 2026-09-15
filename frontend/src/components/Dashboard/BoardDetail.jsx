// Board detail view
// Shows tasks in 3 columns: pending, in-progress, completed
// Can create tasks

import React, { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BoardContext } from '../../context/BoardContext';
import { AuthContext } from '../../context/AuthContext';

const BoardDetail = () => {
  // 1 & 2. Get params and navigation
  const { id: routeBoardId } = useParams();
  const navigate = useNavigate();

  // 3. Get context data & functions
  const { user } = useContext(AuthContext);
  const {
    currentBoard,
    boards,
    tasks,
    fetchBoards,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    selectBoard,
    loading,
    error,
  } = useContext(BoardContext);

  const activeBoardId = routeBoardId || currentBoard?._id || currentBoard?.id;

  // 5. Component state
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    status: 'pending',
    dueDate: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // 4. Fetch tasks and sync active board on mount & param change
  useEffect(() => {
    if (activeBoardId) {
      fetchTasks(activeBoardId);

      // If boards are available, select current board object
      if (boards.length > 0) {
        const foundBoard = boards.find((b) => (b._id || b.id) === activeBoardId);
        if (foundBoard && (!currentBoard || (currentBoard._id || currentBoard.id) !== activeBoardId)) {
          selectBoard(foundBoard);
        }
      } else {
        fetchBoards();
      }
    }
  }, [activeBoardId, fetchTasks, fetchBoards, boards, currentBoard, selectBoard]);

  // Tasks for current board
  const boardTasks = tasks[activeBoardId] || [];

  // Reset form helper
  const resetForm = (initialStatus = 'pending') => {
    setFormData({
      title: '',
      description: '',
      priority: 'Medium',
      status: initialStatus,
      dueDate: '',
    });
    setFormError('');
    setEditingTaskId(null);
  };

  // Open form for creating new task
  const handleOpenCreateForm = (columnStatus = 'pending') => {
    resetForm(columnStatus);
    setShowTaskForm(true);
  };

  // Open form for editing task
  const handleOpenEditForm = (task) => {
    setEditingTaskId(task._id || task.id);
    setFormData({
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'Medium',
      status: task.status || 'pending',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
    });
    setFormError('');
    setShowTaskForm(true);
  };

  // Handle task form submission (create or update)
  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError('Task title is required');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      if (editingTaskId) {
        // Update task
        const res = await updateTask(editingTaskId, {
          title: formData.title.trim(),
          description: formData.description.trim(),
          priority: formData.priority,
          status: formData.status,
          dueDate: formData.dueDate ? formData.dueDate : null,
        });

        if (res.success) {
          setShowTaskForm(false);
          resetForm();
        } else {
          setFormError(res.error || 'Failed to update task.');
        }
      } else {
        // Create new task
        const res = await createTask(
          activeBoardId,
          formData.title.trim(),
          formData.description.trim(),
          formData.priority,
          formData.dueDate ? formData.dueDate : null,
          formData.status
        );

        if (res.success) {
          setShowTaskForm(false);
          resetForm();
        } else {
          setFormError(res.error || 'Failed to create task.');
        }
      }
    } catch (err) {
      setFormError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle task status change (quick update)
  const handleStatusChange = async (task, newStatus) => {
    const taskId = task._id || task.id;
    await updateTask(taskId, { status: newStatus });
  };

  // Handle task deletion
  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await deleteTask(activeBoardId, taskId);
    }
  };

  // Filter tasks into 3 columns
  const pendingTasks = boardTasks.filter((t) => t.status === 'pending');
  const inProgressTasks = boardTasks.filter((t) => t.status === 'in-progress');
  const completedTasks = boardTasks.filter((t) => t.status === 'completed');

  const boardThemeColor = currentBoard?.color || '#3B82F6';

  return (
    <div className="board-detail">
      {/* Top Bar with Navigation & Title */}
      <header className="board-header">
        <div className="board-header-top">
          <button
            type="button"
            className="btn-secondary back-btn"
            onClick={() => navigate('/dashboard')}
          >
            &larr; Back to Dashboard
          </button>
          <div className="board-header-user">
            <span>{user?.name}</span>
          </div>
        </div>

        <div className="board-title-section">
          <div className="board-title-wrapper">
            <span
              className="board-color-indicator-lg"
              style={{ backgroundColor: boardThemeColor }}
            />
            <h1>{currentBoard?.title || 'Board Detail'}</h1>
          </div>
          <button
            type="button"
            className="btn-primary create-task-btn"
            onClick={() => handleOpenCreateForm('pending')}
          >
            + Create Task
          </button>
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      {/* Task Creation / Edit Form Modal or Inline Container */}
      {showTaskForm && (
        <div className="form-container task-form-container">
          <form onSubmit={handleTaskSubmit} className="task-form">
            <h3>{editingTaskId ? 'Edit Task' : 'Create New Task'}</h3>

            {formError && <div className="error-message">{formError}</div>}

            <div className="form-group">
              <label htmlFor="taskTitle">Task Title</label>
              <input
                id="taskTitle"
                type="text"
                placeholder="What needs to be done?"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="taskDescription">Description</label>
              <textarea
                id="taskDescription"
                rows="3"
                placeholder="Add more details, context, or notes..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label htmlFor="taskPriority">Priority</label>
                <select
                  id="taskPriority"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div className="form-group flex-1">
                <label htmlFor="taskStatus">Status Column</label>
                <select
                  id="taskStatus"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="form-group flex-1">
                <label htmlFor="taskDueDate">Due Date</label>
                <input
                  id="taskDueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting || !formData.title.trim()}
              >
                {isSubmitting ? 'Saving...' : editingTaskId ? 'Update Task' : 'Save Task'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowTaskForm(false);
                  resetForm();
                }}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 6. Three columns layout */}
      {loading && boardTasks.length === 0 ? (
        <div className="dashboard-loading">Loading tasks...</div>
      ) : (
        <div className="columns-container">
          {/* Column 1: Pending */}
          <div className="column column-pending">
            <div className="column-header">
              <div className="column-title-badge">
                <span className="status-dot pending-dot" />
                <h2>Pending</h2>
                <span className="task-count">{pendingTasks.length}</span>
              </div>
              <button
                type="button"
                className="add-task-icon-btn"
                onClick={() => handleOpenCreateForm('pending')}
                title="Add task to Pending"
              >
                +
              </button>
            </div>

            <div className="task-list">
              {pendingTasks.length === 0 ? (
                <div className="empty-column-msg">No pending tasks</div>
              ) : (
                pendingTasks.map((task) => (
                  <TaskCard
                    key={task._id || task.id}
                    task={task}
                    onEdit={handleOpenEditForm}
                    onDelete={handleDeleteTask}
                    onStatusChange={handleStatusChange}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 2: In Progress */}
          <div className="column column-in-progress">
            <div className="column-header">
              <div className="column-title-badge">
                <span className="status-dot in-progress-dot" />
                <h2>In Progress</h2>
                <span className="task-count">{inProgressTasks.length}</span>
              </div>
              <button
                type="button"
                className="add-task-icon-btn"
                onClick={() => handleOpenCreateForm('in-progress')}
                title="Add task to In Progress"
              >
                +
              </button>
            </div>

            <div className="task-list">
              {inProgressTasks.length === 0 ? (
                <div className="empty-column-msg">No tasks in progress</div>
              ) : (
                inProgressTasks.map((task) => (
                  <TaskCard
                    key={task._id || task.id}
                    task={task}
                    onEdit={handleOpenEditForm}
                    onDelete={handleDeleteTask}
                    onStatusChange={handleStatusChange}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 3: Completed */}
          <div className="column column-completed">
            <div className="column-header">
              <div className="column-title-badge">
                <span className="status-dot completed-dot" />
                <h2>Completed</h2>
                <span className="task-count">{completedTasks.length}</span>
              </div>
              <button
                type="button"
                className="add-task-icon-btn"
                onClick={() => handleOpenCreateForm('completed')}
                title="Add task to Completed"
              >
                +
              </button>
            </div>

            <div className="task-list">
              {completedTasks.length === 0 ? (
                <div className="empty-column-msg">No completed tasks</div>
              ) : (
                completedTasks.map((task) => (
                  <TaskCard
                    key={task._id || task.id}
                    task={task}
                    onEdit={handleOpenEditForm}
                    onDelete={handleDeleteTask}
                    onStatusChange={handleStatusChange}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component: TaskCard
const TaskCard = ({ task, onEdit, onDelete, onStatusChange }) => {
  const taskId = task._id || task.id;

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'High':
        return 'priority-high';
      case 'Medium':
        return 'priority-medium';
      case 'Low':
      default:
        return 'priority-low';
    }
  };

  const formattedDueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== 'completed';

  return (
    <div className={`task-card ${task.status === 'completed' ? 'is-completed' : ''}`}>
      <div className="task-card-header">
        <h4 className="task-title">{task.title}</h4>
        <span className={`priority-badge ${getPriorityBadgeClass(task.priority)}`}>
          {task.priority}
        </span>
      </div>

      {task.description && <p className="task-description">{task.description}</p>}

      <div className="task-card-meta">
        {formattedDueDate && (
          <span className={`due-date ${isOverdue ? 'overdue' : ''}`}>
            📅 {formattedDueDate} {isOverdue && '(Overdue)'}
          </span>
        )}
      </div>

      <div className="task-card-actions">
        <div className="status-selector-wrapper">
          <select
            className="status-quick-select"
            value={task.status}
            onChange={(e) => onStatusChange(task, e.target.value)}
          >
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="task-btn-group">
          <button
            type="button"
            className="btn-icon edit-btn"
            onClick={() => onEdit(task)}
            title="Edit Task"
          >
            ✏️
          </button>
          <button
            type="button"
            className="btn-icon delete-btn"
            onClick={() => onDelete(taskId)}
            title="Delete Task"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
};

export default BoardDetail;
