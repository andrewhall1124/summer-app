'use client';

import { useState, useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, MoreVertical } from 'lucide-react';
import Folder from './Folder';

export default function SwimLane({ swimLane, onUpdateName, onDelete, onAddFolder, onRefresh }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(swimLane.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: swimLane.id });

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `drop-${swimLane.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSaveName = () => {
    if (name.trim() && name !== swimLane.name) {
      onUpdateName(swimLane.id, name.trim());
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setName(swimLane.name);
      setIsEditing(false);
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
    <div
      ref={setNodeRef}
      style={style}
      className="swim-lane"
      {...attributes}
    >
      <div className="swim-lane-content">
        <div className="swim-lane-header">
          <div className="swim-lane-title-section">
            <button
              className="icon-btn drag-handle"
              {...listeners}
            >
              <GripVertical size={16} />
            </button>
            {isEditing ? (
              <input
                className="form-input swim-lane-title-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={handleKeyPress}
                autoFocus
              />
            ) : (
              <h2 className="swim-lane-title">
                {swimLane.name}
              </h2>
            )}
          </div>
          <div className="swim-lane-actions">
            <div className="menu-container" ref={menuRef}>
              <button
                className="icon-btn"
                onClick={() => setMenuOpen(!menuOpen)}
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
                      onDelete(swimLane.id);
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

        <div className="folder-list" ref={setDroppableRef}>
          <SortableContext
            items={swimLane.folders?.map(f => f.id) || []}
            strategy={verticalListSortingStrategy}
          >
            {swimLane.folders?.map((folder) => (
              <Folder
                key={folder.id}
                folder={folder}
                onUpdateFolder={() => onRefresh()}
                onDeleteFolder={() => onRefresh()}
                onAddTask={() => onRefresh()}
                onRefresh={onRefresh}
              />
            ))}
          </SortableContext>
        </div>

        <button
          className="add-btn"
          onClick={() => onAddFolder(swimLane.id)}
        >
          <Plus size={16} />
          Add Folder
        </button>
      </div>
    </div>
  );
}