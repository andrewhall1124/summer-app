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
import { Flex, Button, Container, Text } from '@radix-ui/themes';
import { Plus } from 'lucide-react';
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
      <Container p="4">
        <Text>Loading...</Text>
      </Container>
    );
  }

  return (
    <Container p="4">
      <Flex direction="column" gap="4">
        <Flex align="center" justify="between">
          <Text size="6" weight="bold">Todo Board</Text>
          <Button onClick={addSwimLane}>
            <Plus size={16} />
            Add Swim Lane
          </Button>
        </Flex>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={swimLanes} strategy={horizontalListSortingStrategy}>
            <Flex gap="4" style={{ overflowX: 'auto', paddingBottom: '20px' }}>
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
            </Flex>
          </SortableContext>
        </DndContext>

        {swimLanes.length === 0 && (
          <Flex direction="column" align="center" gap="3" py="8">
            <Text color="gray" size="4">No swim lanes yet</Text>
            <Button onClick={addSwimLane}>
              <Plus size={16} />
              Create your first swim lane
            </Button>
          </Flex>
        )}
      </Flex>
    </Container>
  );
}