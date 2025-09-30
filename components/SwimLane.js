'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Edit2, Trash2 } from 'lucide-react';
import Folder from './Folder';

export default function SwimLane({ swimLane, onUpdateName, onDelete, onAddFolder, onRefresh }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(swimLane.name);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: swimLane.id });

  const { setNodeRef: setDroppableNodeRef } = useDroppable({
    id: `droppable-${swimLane.id}`,
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
            <button
              className="icon-btn"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 size={14} />
            </button>
            <button
              className="icon-btn delete-btn"
              onClick={() => onDelete(swimLane.id)}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="folder-list" ref={setDroppableNodeRef}>
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