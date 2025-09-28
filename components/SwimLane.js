'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, Text, Button, Flex, TextField } from '@radix-ui/themes';
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
    <Card
      ref={setNodeRef}
      style={style}
      className="min-w-80 max-w-80 h-fit"
      {...attributes}
    >
      <Flex direction="column" gap="3" p="4">
        <Flex align="center" justify="between">
          <Flex align="center" gap="2">
            <Button
              variant="ghost"
              size="1"
              {...listeners}
              style={{ cursor: 'grab' }}
            >
              <GripVertical size={16} />
            </Button>
            {isEditing ? (
              <TextField.Root
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={handleKeyPress}
                autoFocus
                size="2"
              />
            ) : (
              <Text size="4" weight="bold">
                {swimLane.name}
              </Text>
            )}
          </Flex>
          <Flex gap="1">
            <Button
              variant="ghost"
              size="1"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 size={14} />
            </Button>
            <Button
              variant="ghost"
              size="1"
              color="red"
              onClick={() => onDelete(swimLane.id)}
            >
              <Trash2 size={14} />
            </Button>
          </Flex>
        </Flex>

        <Flex direction="column" gap="2">
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
        </Flex>

        <Button
          variant="soft"
          size="2"
          onClick={() => onAddFolder(swimLane.id)}
        >
          <Plus size={16} />
          Add Folder
        </Button>
      </Flex>
    </Card>
  );
}