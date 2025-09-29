'use client';

import { useState, useEffect } from 'react';
import { Calendar, Edit2, Trash2, Tag, Plus } from 'lucide-react';
import { format } from 'date-fns';

export default function Task({ task, onDelete }) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [dueDate, setDueDate] = useState(task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '');
  const [completed, setCompleted] = useState(task.completed);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState(task.tags?.map(t => t.tagId) || []);

  useEffect(() => {
    if (isEditDialogOpen) {
      fetchTags();
    }
  }, [isEditDialogOpen]);

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags');
      if (response.ok) {
        const tags = await response.json();
        setAvailableTags(tags);
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          completed: completed
        }),
      });

      if (response.ok) {
        await updateTaskTags();
        setIsEditDialogOpen(false);
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const updateTaskTags = async () => {
    try {
      await fetch(`/api/tasks/${task.id}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagIds: selectedTagIds }),
      });
    } catch (error) {
      console.error('Failed to update task tags:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDelete(task.id);
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const createNewTag = async (tagName) => {
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tagName,
          color: `#${Math.floor(Math.random()*16777215).toString(16)}`
        }),
      });

      if (response.ok) {
        const newTag = await response.json();
        setAvailableTags([...availableTags, newTag]);
        setSelectedTagIds([...selectedTagIds, newTag.id]);
      }
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const handleCheck = async (e) => {
    const newCompleted = e.target.checked;
    setCompleted(newCompleted);

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          completed: newCompleted
        }),
      });

      if (!response.ok) {
        setCompleted(!newCompleted);
      }
    } catch (error) {
      console.error('Failed to update task:', error);
      setCompleted(!newCompleted);
    }
  };

  return (
    <>
      <div className="task-item">
        <div className="task-main">
          <input
            type="checkbox"
            checked={completed}
            onChange={handleCheck}
            className="task-checkbox"
          />
          <span
            className={`task-title ${completed ? 'completed' : ''}`}
            onClick={() => setIsEditDialogOpen(true)}
          >
            {task.title}
          </span>
        </div>
        <div className="task-meta">
          {task.dueDate && (
            <span className="task-badge due-date">
              <Calendar size={10} />
              {format(new Date(task.dueDate), 'MMM dd')}
            </span>
          )}
          {task.tags?.map((taskTag) => (
            <span
              key={taskTag.tagId}
              className="task-badge tag-badge"
              style={{ backgroundColor: taskTag.tag.color }}
            >
              {taskTag.tag.name}
            </span>
          ))}
          <button
            className="icon-btn task-action"
            onClick={() => setIsEditDialogOpen(true)}
          >
            <Edit2 size={12} />
          </button>
          <button
            className="icon-btn task-action delete-btn"
            onClick={handleDelete}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {isEditDialogOpen && (
        <div className="modal-overlay" onClick={() => setIsEditDialogOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Task</h3>
              <p className="modal-description">
                Modify task details, add tags, and set due dates.
              </p>
            </div>

            <div className="modal-body">
              <label className="form-label">
                <span className="label-text">Title</span>
                <input
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Task title"
                />
              </label>

              <label className="form-label">
                <span className="label-text">Description</span>
                <textarea
                  className="form-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Task description (optional)"
                />
              </label>

              <label className="form-label">
                <span className="label-text">Due Date</span>
                <input
                  className="form-input"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </label>

              <div className="form-section">
                <span className="label-text">Tags</span>
                <div className="tags-section">
                  <div className="available-tags">
                    {availableTags.map((tag) => (
                      <span
                        key={tag.id}
                        className={`tag-option ${selectedTagIds.includes(tag.id) ? 'selected' : ''}`}
                        style={{
                          backgroundColor: selectedTagIds.includes(tag.id) ? tag.color : '#f3f4f6',
                          color: selectedTagIds.includes(tag.id) ? 'white' : '#374151'
                        }}
                        onClick={() => {
                          if (selectedTagIds.includes(tag.id)) {
                            setSelectedTagIds(selectedTagIds.filter(id => id !== tag.id));
                          } else {
                            setSelectedTagIds([...selectedTagIds, tag.id]);
                          }
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                  <button
                    className="secondary-btn small"
                    onClick={() => {
                      const tagName = prompt('Enter tag name:');
                      if (tagName) createNewTag(tagName);
                    }}
                  >
                    <Plus size={12} />
                    New Tag
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="secondary-btn"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </button>
              <button className="primary-btn" onClick={handleSave}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}