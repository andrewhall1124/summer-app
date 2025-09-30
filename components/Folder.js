'use client';

import { useState, useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FolderOpen, Plus, MoreVertical, GripVertical, X } from 'lucide-react';
import Task from './Task';

export default function Folder({ folder, onUpdateFolder, onDeleteFolder, onAddTask, onRefresh }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(folder.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: folder.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const completedTasks = folder.tasks?.filter(task => task.completed).length || 0;
  const totalTasks = folder.tasks?.length || 0;

  const handleSaveName = async () => {
    if (name.trim() && name !== folder.name) {
      try {
        const response = await fetch(`/api/folders/${folder.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() }),
        });

        if (response.ok) {
          onUpdateFolder(folder.id, name.trim());
        }
      } catch (error) {
        console.error('Failed to update folder:', error);
      }
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setName(folder.name);
      setIsEditing(false);
    }
  };

  const handleDeleteFolder = async () => {
    if (!confirm('Are you sure you want to delete this folder and all its tasks?')) return;

    try {
      const response = await fetch(`/api/folders/${folder.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDeleteFolder(folder.id);
      }
    } catch (error) {
      console.error('Failed to delete folder:', error);
    }
  };

  const handleAddTask = async () => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Task',
          folderId: folder.id,
          order: folder.tasks?.length || 0
        }),
      });

      if (response.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <>
      <div ref={setNodeRef} style={style} className="folder-card" {...attributes}>
        <div className="folder-content">
          <div className="folder-header">
            <button
              className="icon-btn drag-handle"
              {...listeners}
            >
              <GripVertical size={16} />
            </button>
            <div
              className="folder-title-section"
              onClick={() => setIsDialogOpen(true)}
            >
              <FolderOpen size={16} />
              <span className="folder-name">
                {folder.name}
              </span>
            </div>
            <div className="folder-actions">
              <span className={`task-count ${completedTasks === totalTasks && totalTasks > 0 ? 'completed' : ''}`}>
                {completedTasks}/{totalTasks}
              </span>
              <div className="menu-container" ref={menuRef}>
                <button
                  className="icon-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(!menuOpen);
                  }}
                >
                  <MoreVertical size={16} />
                </button>
                {menuOpen && (
                  <div className="dropdown-menu">
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setIsEditing(true);
                        setMenuOpen(false);
                      }}
                    >
                      Rename
                    </button>
                    <button
                      className="dropdown-item delete-item"
                      onClick={() => {
                        handleDeleteFolder();
                        setMenuOpen(false);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isDialogOpen && (
        <div className="dialog-overlay" onClick={() => setIsDialogOpen(false)}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <div className="dialog-title-section">
                <FolderOpen size={24} />
                {isEditing ? (
                  <input
                    className="form-input dialog-title-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={handleKeyPress}
                    autoFocus
                  />
                ) : (
                  <h2 className="dialog-title">{folder.name}</h2>
                )}
              </div>
              <button
                className="icon-btn close-btn"
                onClick={() => setIsDialogOpen(false)}
              >
                <X size={24} />
              </button>
            </div>

            <div className="dialog-body">
              {folder.tasks?.length === 0 ? (
                <div className="empty-tasks-text">
                  No tasks yet
                </div>
              ) : (
                folder.tasks?.map((task) => (
                  <Task
                    key={task.id}
                    task={task}
                    onDelete={() => onRefresh()}
                  />
                ))
              )}
            </div>

            <div className="dialog-footer">
              <button
                className="add-btn"
                onClick={handleAddTask}
              >
                <Plus size={16} />
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}