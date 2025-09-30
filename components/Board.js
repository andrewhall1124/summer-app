'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import SwimLane from './SwimLane';

export default function Board() {
  const [swimLanes, setSwimLanes] = useState([]);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
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

  const handleDragEnd = async (event) => {
    const { active, over } = event;

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
      // Handle folder drag and drop
      const activeFolderId = active.id;
      const overFolderId = over.id;

      // Find the folder and its current swim lane
      let sourceLane = null;
      let sourceFolder = null;

      for (const lane of swimLanes) {
        const folder = lane.folders?.find(f => f.id === activeFolderId);
        if (folder) {
          sourceLane = lane;
          sourceFolder = folder;
          break;
        }
      }

      if (!sourceFolder) return;

      // Determine target swim lane
      let targetLaneId = null;
      let targetIndex = 0;

      // Check if dropping over another folder
      for (const lane of swimLanes) {
        const folderIndex = lane.folders?.findIndex(f => f.id === overFolderId);
        if (folderIndex !== undefined && folderIndex !== -1) {
          targetLaneId = lane.id;
          targetIndex = folderIndex;
          break;
        }
      }

      // Check if dropping over a droppable zone (swim lane)
      if (!targetLaneId && over.id.toString().startsWith('droppable-')) {
        targetLaneId = over.id.toString().replace('droppable-', '');
        const targetLane = swimLanes.find(l => l.id === targetLaneId);
        targetIndex = targetLane?.folders?.length || 0;
      }

      if (!targetLaneId) return;

      // Update local state optimistically
      const newSwimLanes = swimLanes.map(lane => ({
        ...lane,
        folders: lane.folders ? [...lane.folders] : []
      }));

      const sourceLaneIndex = newSwimLanes.findIndex(l => l.id === sourceLane.id);
      const targetLaneIndex = newSwimLanes.findIndex(l => l.id === targetLaneId);

      // Remove from source
      const sourceFolderIndex = newSwimLanes[sourceLaneIndex].folders.findIndex(f => f.id === activeFolderId);
      const [movedFolder] = newSwimLanes[sourceLaneIndex].folders.splice(sourceFolderIndex, 1);

      // Add to target
      if (sourceLane.id === targetLaneId) {
        // Same lane - just reorder
        newSwimLanes[targetLaneIndex].folders.splice(targetIndex, 0, movedFolder);
      } else {
        // Different lane - move between lanes
        movedFolder.swimLaneId = targetLaneId;
        newSwimLanes[targetLaneIndex].folders.splice(targetIndex, 0, movedFolder);
      }

      setSwimLanes(newSwimLanes);

      // Persist to backend
      try {
        await fetch('/api/folders/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderId: activeFolderId,
            targetSwimLaneId: targetLaneId,
            targetIndex: targetIndex
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
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
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