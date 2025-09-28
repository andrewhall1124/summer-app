'use client';

import { useState, useEffect } from 'react';
import { Dialog, Card, Text, Flex, Badge, Button, TextField, TextArea, Select } from '@radix-ui/themes';
import { Calendar, Edit2, Trash2, Tag, Plus } from 'lucide-react';
import { format } from 'date-fns';

export default function Task({ task, onUpdate, onDelete }) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [dueDate, setDueDate] = useState(task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '');
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
          dueDate: dueDate ? new Date(dueDate).toISOString() : null
        }),
      });

      if (response.ok) {
        await updateTaskTags();
        onUpdate();
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

  return (
    <>
      <Flex align="center" justify="between" p="2" className="group hover:bg-gray-50 rounded">
        <Flex align="center" gap="2" className="flex-1">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={(e) => onUpdate({ completed: e.target.checked })}
          />
          <Text
            size="2"
            className="flex-1 cursor-pointer"
            style={{
              textDecoration: task.completed ? 'line-through' : 'none',
              color: task.completed ? 'var(--gray-10)' : 'inherit'
            }}
            onClick={() => setIsEditDialogOpen(true)}
          >
            {task.title}
          </Text>
        </Flex>
        <Flex align="center" gap="1">
          {task.dueDate && (
            <Badge size="1" color="blue">
              <Calendar size={10} />
              {format(new Date(task.dueDate), 'MMM dd')}
            </Badge>
          )}
          {task.tags?.map((taskTag) => (
            <Badge
              key={taskTag.tagId}
              size="1"
              style={{ backgroundColor: taskTag.tag.color }}
            >
              {taskTag.tag.name}
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="1"
            className="opacity-0 group-hover:opacity-100"
            onClick={() => setIsEditDialogOpen(true)}
          >
            <Edit2 size={12} />
          </Button>
          <Button
            variant="ghost"
            size="1"
            color="red"
            className="opacity-0 group-hover:opacity-100"
            onClick={handleDelete}
          >
            <Trash2 size={12} />
          </Button>
        </Flex>
      </Flex>

      <Dialog.Root open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <Dialog.Content style={{ maxWidth: 450 }}>
          <Dialog.Title>Edit Task</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Modify task details, add tags, and set due dates.
          </Dialog.Description>

          <Flex direction="column" gap="3">
            <label>
              <Text as="div" size="2" mb="1" weight="bold">
                Title
              </Text>
              <TextField.Root
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
              />
            </label>

            <label>
              <Text as="div" size="2" mb="1" weight="bold">
                Description
              </Text>
              <TextArea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Task description (optional)"
              />
            </label>

            <label>
              <Text as="div" size="2" mb="1" weight="bold">
                Due Date
              </Text>
              <TextField.Root
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </label>

            <div>
              <Text as="div" size="2" mb="2" weight="bold">
                Tags
              </Text>
              <Flex direction="column" gap="2">
                <Flex gap="1" wrap="wrap">
                  {availableTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      size="2"
                      className="cursor-pointer"
                      style={{
                        backgroundColor: selectedTagIds.includes(tag.id) ? tag.color : 'var(--gray-4)',
                        color: selectedTagIds.includes(tag.id) ? 'white' : 'var(--gray-11)'
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
                    </Badge>
                  ))}
                </Flex>
                <Button
                  variant="soft"
                  size="1"
                  onClick={() => {
                    const tagName = prompt('Enter tag name:');
                    if (tagName) createNewTag(tagName);
                  }}
                >
                  <Plus size={12} />
                  New Tag
                </Button>
              </Flex>
            </div>
          </Flex>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button onClick={handleSave}>Save</Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}