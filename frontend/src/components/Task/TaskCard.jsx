// Single task card component
// Shows task info with edit/delete buttons
// Will be draggable later

import React from 'react';

const TaskCard = ({ task, onEdit, onDelete, onStatusChange }) => {
  if (!task) return null;

  const taskId = task._id || task.id;

  // Format priority badge class & label
  const getPriorityClass = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'priority-badge priority-high';
      case 'medium':
        return 'priority-badge priority-medium';
      case 'low':
      default:
        return 'priority-badge priority-low';
    }
  };

  // Format due date nicely
  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  const formattedDueDate = formatDate(task.dueDate);
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== 'completed';

  const handleStatusSelect = (e) => {
    if (onStatusChange) {
      onStatusChange(taskId, e.target.value);
    }
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(task);
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(taskId);
    }
  };

  return (
    <div className={`task-card ${task.status === 'completed' ? 'task-completed' : ''}`}>
      <div className="task-header">
        <h4 className="task-title">{task.title}</h4>
        <span className={getPriorityClass(task.priority)}>
          {task.priority || 'Medium'}
        </span>
      </div>

      {task.description && (
        <p className="task-description">{task.description}</p>
      )}

      {formattedDueDate && (
        <div className={`task-due-date ${isOverdue ? 'overdue' : ''}`}>
          <span>📅 {formattedDueDate}</span>
          {isOverdue && <span className="overdue-label">(Overdue)</span>}
        </div>
      )}

      <div className="task-actions">
        <select
          className="task-status-select"
          value={task.status || 'pending'}
          onChange={handleStatusSelect}
          aria-label="Change task status"
        >
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>

        <div className="task-action-buttons">
          <button
            type="button"
            className="btn-task-action btn-edit"
            onClick={handleEditClick}
            title="Edit Task"
            aria-label="Edit Task"
          >
            ✏️ Edit
          </button>
          <button
            type="button"
            className="btn-task-action btn-delete"
            onClick={handleDeleteClick}
            title="Delete Task"
            aria-label="Delete Task"
          >
            🗑️ Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
