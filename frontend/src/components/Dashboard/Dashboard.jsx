// Main dashboard component
// Shows all user boards in grid
// Can create new board

import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BoardContext } from '../../context/BoardContext';
import { AuthContext } from '../../context/AuthContext';

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
];

const Dashboard = () => {
  const navigate = useNavigate();

  // 1 & 2. Get auth and board context data
  const { user, logout } = useContext(AuthContext);
  const { boards, fetchBoards, createBoard, selectBoard, loading, error } = useContext(BoardContext);

  // 4. Component state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newBoardColor, setNewBoardColor] = useState('#3B82F6');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // 3. Fetch boards on mount
  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  // Handle board creation submit
  const handleCreateBoardSubmit = async (e) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) {
      setFormError('Board title is required');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    const res = await createBoard(newBoardTitle.trim(), newBoardColor);
    setIsSubmitting(false);

    if (res.success) {
      setNewBoardTitle('');
      setNewBoardColor('#3B82F6');
      setShowCreateForm(false);
    } else {
      setFormError(res.error || 'Failed to create board.');
    }
  };

  // Handle board card click
  const handleBoardClick = (board) => {
    const boardId = board._id || board.id;
    selectBoard(board);
    navigate(`/board/${boardId}`);
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="user-welcome">
          <h1>Dashboard</h1>
          <p className="welcome-text">Welcome back, <strong>{user?.name || 'User'}</strong>!</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="btn-secondary logout-btn"
        >
          Logout
        </button>
      </header>

      {error && <div className="error-message">{error}</div>}

      <div className="dashboard-actions">
        <h2 className="section-title">Your Boards</h2>
        {!showCreateForm && (
          <button
            type="button"
            className="btn-primary create-board-btn"
            onClick={() => {
              setShowCreateForm(true);
              setFormError('');
            }}
          >
            + Create New Board
          </button>
        )}
      </div>

      {/* 5. If showCreateForm: show form to create board */}
      {showCreateForm && (
        <div className="form-container">
          <form onSubmit={handleCreateBoardSubmit} className="board-create-form">
            <h3>Create New Board</h3>

            {formError && <div className="error-message">{formError}</div>}

            <div className="form-group">
              <label htmlFor="boardTitle">Board Title</label>
              <input
                id="boardTitle"
                type="text"
                placeholder="e.g., Marketing Campaign, Sprint Planning..."
                value={newBoardTitle}
                onChange={(e) => setNewBoardTitle(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="boardColor">Board Theme Color</label>
              <div className="color-picker-wrapper">
                <input
                  id="boardColor"
                  type="color"
                  value={newBoardColor}
                  onChange={(e) => setNewBoardColor(e.target.value)}
                  className="color-input"
                />
                <span className="color-hex-code">{newBoardColor}</span>
              </div>

              {/* Color Preset Swatches */}
              <div className="color-swatches">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-swatch ${newBoardColor.toLowerCase() === color.toLowerCase() ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewBoardColor(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting || !newBoardTitle.trim()}
              >
                {isSubmitting ? 'Saving...' : 'Save Board'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewBoardTitle('');
                  setFormError('');
                }}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. Display all boards in CSS grid */}
      {loading && boards.length === 0 ? (
        <div className="dashboard-loading">Loading your boards...</div>
      ) : boards.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No Boards Found</h3>
          <p>Organize your tasks by creating your first board.</p>
          {!showCreateForm && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              + Create First Board
            </button>
          )}
        </div>
      ) : (
        <div className="board-grid">
          {boards.map((board) => {
            const boardId = board._id || board.id;
            const themeColor = board.color || '#3B82F6';

            return (
              <div
                key={boardId}
                className="board-card"
                style={{ borderTopColor: themeColor }}
                onClick={() => handleBoardClick(board)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleBoardClick(board);
                  }
                }}
              >
                <div className="board-card-header">
                  <div
                    className="board-color-indicator"
                    style={{ backgroundColor: themeColor }}
                  />
                  <h3 className="board-card-title">{board.title}</h3>
                </div>
                <div className="board-card-footer">
                  <span className="open-board-label">Open Board &rarr;</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
