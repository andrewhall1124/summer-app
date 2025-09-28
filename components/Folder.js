'use client';

import { useState } from 'react';
import { Card, Text, Flex, Badge, Button, TextField } from '@radix-ui/themes';
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

  const handleUpdateTask = async (taskId, updates) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  return (
    <Card variant="surface" className="w-full">
      <Flex direction="column" gap="2" p="3">
        <Flex align="center" justify="between">
          <Flex
            align="center"
            gap="2"
            className="cursor-pointer flex-1"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <Button variant="ghost" size="1">
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </Button>
            <FolderOpen size={16} />
            {isEditing ? (
              <TextField.Root
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={handleKeyPress}
                autoFocus
                size="1"
              />
            ) : (
              <Text size="3" weight="medium">
                {folder.name}
              </Text>
            )}
          </Flex>
          <Flex align="center" gap="1">
            <Badge color={completedTasks === totalTasks && totalTasks > 0 ? 'green' : 'gray'}>
              {completedTasks}/{totalTasks}
            </Badge>
            <Button
              variant="ghost"
              size="1"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
            >
              <Edit2 size={12} />
            </Button>
            <Button
              variant="ghost"
              size="1"
              color="red"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteFolder();
              }}
            >
              <Trash2 size={12} />
            </Button>
          </Flex>
        </Flex>

        {isExpanded && (
          <Flex direction="column" gap="1" ml="6">
            {folder.tasks?.length === 0 ? (
              <Text size="2" color="gray">
                No tasks yet
              </Text>
            ) : (
              folder.tasks?.map((task) => (
                <Task
                  key={task.id}
                  task={task}
                  onUpdate={(updates) => handleUpdateTask(task.id, updates)}
                  onDelete={() => onRefresh()}
                />
              ))
            )}
            <Button
              variant="soft"
              size="1"
              onClick={handleAddTask}
              mt="2"
            >
              <Plus size={12} />
              Add Task
            </Button>
          </Flex>
        )}
      </Flex>
    </Card>
  );
}