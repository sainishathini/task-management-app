// Board and Task Context
// CRUD for boards and tasks

import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from './AuthContext';

export const BoardContext = createContext(null);

export const BoardProvider = ({ children }) => {
  const [boards, setBoards] = useState([]);
  const [currentBoard, setCurrentBoard] = useState(null);
  const [tasks, setTasks] = useState({}); // Stores tasks mapped by boardId: { [boardId]: Task[] }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper to clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 1. Fetch all user boards
  const fetchBoards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/boards');
      const fetchedBoards = response.data.boards || [];
      setBoards(fetchedBoards);

      // Auto-select first board if none selected or if current selection is invalid
      if (
        fetchedBoards.length > 0 &&
        (!currentBoard || !fetchedBoards.some((b) => (b._id || b.id) === (currentBoard._id || currentBoard.id)))
      ) {
        setCurrentBoard(fetchedBoards[0]);
      } else if (fetchedBoards.length === 0) {
        setCurrentBoard(null);
      }

      return { success: true, boards: fetchedBoards };
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to fetch boards.';
      setError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  }, [currentBoard]);

  // 2. Create a new board
  const createBoard = useCallback(async (title, color) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/boards', { title, color });
      const newBoard = response.data.board;

      setBoards((prevBoards) => [newBoard, ...prevBoards]);
      setCurrentBoard(newBoard);

      return { success: true, board: newBoard };
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to create board.';
      setError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // 3. Update an existing board
  const updateBoard = useCallback(
    async (id, title, color) => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.put(`/boards/${id}`, { title, color });
        const updatedBoard = response.data.board;

        setBoards((prevBoards) =>
          prevBoards.map((b) => ((b._id || b.id) === id ? updatedBoard : b))
        );

        if (currentBoard && (currentBoard._id || currentBoard.id) === id) {
          setCurrentBoard(updatedBoard);
        }

        return { success: true, board: updatedBoard };
      } catch (err) {
        const errMsg = err.response?.data?.error || err.message || 'Failed to update board.';
        setError(errMsg);
        return { success: false, error: errMsg };
      } finally {
        setLoading(false);
      }
    },
    [currentBoard]
  );

  // 4. Delete a board (and clear associated tasks)
  const deleteBoard = useCallback(
    async (id) => {
      setLoading(true);
      setError(null);
      try {
        await api.delete(`/boards/${id}`);

        setBoards((prevBoards) => {
          const remaining = prevBoards.filter((b) => (b._id || b.id) !== id);
          if (currentBoard && (currentBoard._id || currentBoard.id) === id) {
            setCurrentBoard(remaining.length > 0 ? remaining[0] : null);
          }
          return remaining;
        });

        setTasks((prevTasks) => {
          const updatedTasksMap = { ...prevTasks };
          delete updatedTasksMap[id];
          return updatedTasksMap;
        });

        return { success: true };
      } catch (err) {
        const errMsg = err.response?.data?.error || err.message || 'Failed to delete board.';
        setError(errMsg);
        return { success: false, error: errMsg };
      } finally {
        setLoading(false);
      }
    },
    [currentBoard]
  );

  // 5. Select active board
  const selectBoard = useCallback((board) => {
    setCurrentBoard(board);
  }, []);

  // 6. Fetch tasks for a specific board
  const fetchTasks = useCallback(async (boardId) => {
    if (!boardId) return { success: false, error: 'Board ID is required' };
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/tasks/${boardId}`);
      const fetchedTasks = response.data.tasks || [];

      setTasks((prevTasks) => ({
        ...prevTasks,
        [boardId]: fetchedTasks,
      }));

      return { success: true, tasks: fetchedTasks };
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to fetch tasks.';
      setError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // 7. Create a new task in a board
  const createTask = useCallback(
    async (boardId, title, description = '', priority = 'Medium', dueDate = null, status = 'pending') => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.post('/tasks', {
          boardId,
          title,
          description,
          priority,
          status,
          dueDate,
        });

        const newTask = response.data.task;

        setTasks((prevTasks) => ({
          ...prevTasks,
          [boardId]: [...(prevTasks[boardId] || []), newTask],
        }));

        return { success: true, task: newTask };
      } catch (err) {
        const errMsg = err.response?.data?.error || err.message || 'Failed to create task.';
        setError(errMsg);
        return { success: false, error: errMsg };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // 8. Update a task by ID
  const updateTask = useCallback(async (id, updates) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.put(`/tasks/${id}`, updates);
      const updatedTask = response.data.task;
      const targetBoardId = updatedTask.boardId;

      setTasks((prevTasks) => {
        const updatedMap = { ...prevTasks };

        // Check if task moved to another board
        if (updates.boardId && updates.boardId !== targetBoardId) {
          Object.keys(updatedMap).forEach((bId) => {
            updatedMap[bId] = updatedMap[bId].filter((t) => (t._id || t.id) !== id);
          });
          updatedMap[targetBoardId] = [...(updatedMap[targetBoardId] || []), updatedTask];
        } else {
          // Update in-place
          Object.keys(updatedMap).forEach((bId) => {
            if (updatedMap[bId]) {
              updatedMap[bId] = updatedMap[bId].map((t) =>
                (t._id || t.id) === id ? updatedTask : t
              );
            }
          });
        }

        return updatedMap;
      });

      return { success: true, task: updatedTask };
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to update task.';
      setError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // 9. Delete a task
  const deleteTask = useCallback(async (boardId, taskId) => {
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/tasks/${taskId}`);

      setTasks((prevTasks) => ({
        ...prevTasks,
        [boardId]: (prevTasks[boardId] || []).filter((t) => (t._id || t.id) !== taskId),
      }));

      return { success: true };
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to delete task.';
      setError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // 10. Reorder tasks in a board (drag and drop)
  const reorderTasks = useCallback(
    async (boardId, reorderedTasks) => {
      setError(null);
      // Optimistic UI update
      setTasks((prevTasks) => ({
        ...prevTasks,
        [boardId]: reorderedTasks,
      }));

      try {
        const response = await api.put(`/tasks/reorder/${boardId}`, {
          tasks: reorderedTasks,
        });

        if (response.data.tasks) {
          setTasks((prevTasks) => ({
            ...prevTasks,
            [boardId]: response.data.tasks,
          }));
        }

        return { success: true, tasks: response.data.tasks || reorderedTasks };
      } catch (err) {
        const errMsg = err.response?.data?.error || err.message || 'Failed to reorder tasks.';
        setError(errMsg);
        // Fallback: refetch tasks from backend on error
        fetchTasks(boardId);
        return { success: false, error: errMsg };
      }
    },
    [fetchTasks]
  );

  const value = {
    boards,
    currentBoard,
    tasks,
    loading,
    error,
    clearError,
    fetchBoards,
    createBoard,
    updateBoard,
    deleteBoard,
    selectBoard,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    reorderTasks,
  };

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
};

export const useBoard = () => {
  const context = useContext(BoardContext);
  if (!context) {
    throw new Error('useBoard must be used within a BoardProvider');
  }
  return context;
};

export default BoardContext;
