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

    if (active.id !== over?.id) {
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
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Folder',
          swimLaneId,
          order: 0
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