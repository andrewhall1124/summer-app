'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, GripVertical, FolderOpen } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import SwimLane from './SwimLane';

export default function Board() {
  const [swimLanes, setSwimLanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [activeType, setActiveType] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchSwimLanes();
  }, []);

  const fetchSwimLanes = async () => {
    try {
      const response = await fetch('/api/swim-lanes');
      if (response.ok) {
        const data = await response.json();
        setSwimLanes(data);
      }
    } catch (error) {
      console.error('Failed to fetch swim lanes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);

    // Determine if we're dragging a swim lane or folder
    const isSwimLane = swimLanes.some(lane => lane.id === active.id);
    setActiveType(isSwimLane ? 'swimLane' : 'folder');
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setActiveType(null);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    setActiveId(null);
    setActiveType(null);

    if (!over) return;

    // Check if we're dragging a swim lane
    const isSwimLane = swimLanes.some(lane => lane.id === active.id);

    if (isSwimLane) {
      // Handle swim lane reordering
      if (active.id !== over.id) {
        const oldIndex = swimLanes.findIndex((lane) => lane.id === active.id);
        const newIndex = swimLanes.findIndex((lane) => lane.id === over.id);

        const newSwimLanes = arrayMove(swimLanes, oldIndex, newIndex);
        setSwimLanes(newSwimLanes);

        try {
          await fetch('/api/swim-lanes/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              swimLanes: newSwimLanes.map((lane, index) => ({
                id: lane.id,
                order: index
              }))
            }),
          });
        } catch (error) {
          console.error('Failed to reorder swim lanes:', error);
          fetchSwimLanes();
        }
      }
    } else {
      // Handle folder reordering
      // Find source folder and swim lane
      let sourceLane = null;
      let sourceFolderIndex = -1;

      for (const lane of swimLanes) {
        const folderIndex = lane.folders?.findIndex(f => f.id === active.id);
        if (folderIndex !== undefined && folderIndex !== -1) {
          sourceLane = lane;
          sourceFolderIndex = folderIndex;
          break;
        }
      }

      if (!sourceLane) return;

      let targetLane = null;
      let targetFolderIndex = -1;

      // Check if dropped on a folder or empty drop zone
      if (over.id.toString().startsWith('drop-')) {
        // Dropped on empty space in a swim lane
        const targetLaneId = over.id.toString().replace('drop-', '');
        targetLane = swimLanes.find(l => l.id === targetLaneId);
        targetFolderIndex = targetLane?.folders?.length || 0; // Add to end
      } else {
        // Dropped on another folder
        for (const lane of swimLanes) {
          const folderIndex = lane.folders?.findIndex(f => f.id === over.id);
          if (folderIndex !== undefined && folderIndex !== -1) {
            targetLane = lane;
            targetFolderIndex = folderIndex;
            break;
          }
        }
      }

      if (!targetLane || active.id === over.id) return;

      // Update state optimistically
      const newSwimLanes = swimLanes.map(lane => ({
        ...lane,
        folders: lane.folders ? [...lane.folders] : []
      }));

      const sourceLaneIndex = newSwimLanes.findIndex(l => l.id === sourceLane.id);
      const targetLaneIndex = newSwimLanes.findIndex(l => l.id === targetLane.id);

      if (sourceLaneIndex === -1 || targetLaneIndex === -1) return;

      // Remove from source
      const [movedFolder] = newSwimLanes[sourceLaneIndex].folders.splice(sourceFolderIndex, 1);

      // Add to target at correct position
      if (sourceLane.id === targetLane.id) {
        // Same lane: arrayMove handles the index adjustment automatically
        newSwimLanes[sourceLaneIndex].folders = arrayMove(
          [...swimLanes[sourceLaneIndex].folders],
          sourceFolderIndex,
          targetFolderIndex
        );
      } else {
        // Different lane: insert at target position
        movedFolder.swimLaneId = targetLane.id;
        newSwimLanes[targetLaneIndex].folders.splice(targetFolderIndex, 0, movedFolder);
      }

      setSwimLanes(newSwimLanes);

      // Calculate backend index (position in array)
      const finalTargetIndex = newSwimLanes[targetLaneIndex].folders.findIndex(f => f.id === active.id);

      try {
        await fetch('/api/folders/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderId: active.id,
            targetSwimLaneId: targetLane.id,
            targetIndex: finalTargetIndex
          }),
        });
      } catch (error) {
        console.error('Failed to reorder folders:', error);
        fetchSwimLanes();
      }
    }
  };

  const addSwimLane = async () => {
    try {
      const response = await fetch('/api/swim-lanes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Lane ${swimLanes.length + 1}`,
          order: swimLanes.length
        }),
      });

      if (response.ok) {
        const newLane = await response.json();
        setSwimLanes([...swimLanes, newLane]);
      }
    } catch (error) {
      console.error('Failed to create swim lane:', error);
    }
  };

  const updateSwimLaneName = async (id, name) => {
    try {
      const response = await fetch(`/api/swim-lanes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        setSwimLanes(swimLanes.map(lane =>
          lane.id === id ? { ...lane, name } : lane
        ));
      }
    } catch (error) {
      console.error('Failed to update swim lane:', error);
    }
  };

  const deleteSwimLane = async (id) => {
    if (!confirm('Are you sure you want to delete this swim lane?')) return;

    try {
      const response = await fetch(`/api/swim-lanes/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSwimLanes(swimLanes.filter(lane => lane.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete swim lane:', error);
    }
  };

  const addFolder = async (swimLaneId) => {
    try {
      const swimLane = swimLanes.find(lane => lane.id === swimLaneId);
      const folderCount = swimLane?.folders?.length || 0;

      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Folder',
          swimLaneId,
          order: folderCount
        }),
      });

      if (response.ok) {
        fetchSwimLanes();
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  if (loading) {
    return (
      <div className="board-container">
        <div className="loading-text">Loading...</div>
      </div>
    );
  }

  return (
    <div className="board-container">
      <div className="board-content">
        <div className="board-header">
          <h1 className="board-title">Todo Board</h1>
          <div className="header-actions">
            <button className="primary-btn" onClick={addSwimLane}>
              <Plus size={16} />
              Add Swim Lane
            </button>
            <SignedOut>
              <SignInButton />
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={swimLanes.map(lane => lane.id)} strategy={horizontalListSortingStrategy}>
            <div className="swim-lane-container">
              {swimLanes.map((swimLane) => (
                <SwimLane
                  key={swimLane.id}
                  swimLane={swimLane}
                  onUpdateName={updateSwimLaneName}
                  onDelete={deleteSwimLane}
                  onAddFolder={addFolder}
                  onRefresh={fetchSwimLanes}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeId ? (
              activeType === 'swimLane' ? (
                <div className="swim-lane dragging">
                  <div className="swim-lane-content">
                    <div className="swim-lane-header">
                      <div className="swim-lane-title-section">
                        <button className="icon-btn drag-handle">
                          <GripVertical size={16} />
                        </button>
                        <h2 className="swim-lane-title">
                          {swimLanes.find(l => l.id === activeId)?.name}
                        </h2>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                (() => {
                  let activeFolder = null;
                  for (const lane of swimLanes) {
                    activeFolder = lane.folders?.find(f => f.id === activeId);
                    if (activeFolder) break;
                  }
                  return activeFolder ? (
                    <div className="folder-card dragging">
                      <div className="folder-content">
                        <div className="folder-header">
                          <button className="icon-btn drag-handle">
                            <GripVertical size={16} />
                          </button>
                          <div className="folder-title-section">
                            <FolderOpen size={16} />
                            <span className="folder-name">{activeFolder.name}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()
              )
            ) : null}
          </DragOverlay>
        </DndContext>

        {swimLanes.length === 0 && (
          <div className="empty-state">
            <div className="empty-text">No swim lanes yet</div>
            <button className="primary-btn" onClick={addSwimLane}>
              <Plus size={16} />
              Create your first swim lane
            </button>
          </div>
        )}
      </div>
    </div>
  );
}