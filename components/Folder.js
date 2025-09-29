'use client';

import { useState } from 'react';
import { FolderOpen, ChevronDown, ChevronRight, Plus, Edit2, Trash2 } from 'lucide-react';
import Task from './Task';

export default function Folder({ folder, onUpdateFolder, onDeleteFolder, onAddTask, onRefresh }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(folder.name);

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
        setIsExpanded(true);
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  return (
    <div className="folder-card">
      <div className="folder-content">
        <div className="folder-header">
          <div
            className="folder-title-section"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <button className="icon-btn">
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            <FolderOpen size={16} />
            {isEditing ? (
              <input
                className="form-input folder-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={handleKeyPress}
                autoFocus
              />
            ) : (
              <span className="folder-name">
                {folder.name}
              </span>
            )}
          </div>
          <div className="folder-actions">
            <span className={`task-count ${completedTasks === totalTasks && totalTasks > 0 ? 'completed' : ''}`}>
              {completedTasks}/{totalTasks}
            </span>
            <button
              className="icon-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
            >
              <Edit2 size={12} />
            </button>
            <button
              className="icon-btn delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteFolder();
              }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="folder-tasks">
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
            <button
              className="add-btn small"
              onClick={handleAddTask}
            >
              <Plus size={12} />
              Add Task
            </button>
          </div>
        )}
      </div>
    </div>
  );
}