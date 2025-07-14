/**
 * Task Service Tests
 * Testing task management, CRUD operations, and event handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskService } from './core/TaskService.js';

describe('TaskService', () => {
  let taskService;

  beforeEach(() => {
    taskService = new TaskService();
    taskService.initialize();
  });

  describe('Initialization', () => {
    it('should initialize with empty task map', () => {
      expect(taskService.tasks.size).toBe(0);
      expect(taskService.initialized).toBe(true);
    });

    it('should have required service methods', () => {
      expect(typeof taskService.createTask).toBe('function');
      expect(typeof taskService.updateStatus).toBe('function');
      expect(typeof taskService.getTask).toBe('function');
      expect(typeof taskService.getAllTasks).toBe('function');
    });
  });

  describe('Task CRUD Operations', () => {
    it('should create a new task', () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test Description'
      };

      const task = taskService.createTask(taskData);
      
      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.title).toBe(taskData.title);
      expect(task.status).toBe('TODO'); // Default status from TASK_STATUS
      expect(taskService.tasks.size).toBe(1);
    });

    it('should update task status', () => {
      const task = taskService.createTask({
        title: 'Original Title',
        description: 'Original Description'
      });

      taskService.updateStatus(task.id, 'DOING');
      const updatedTask = taskService.getTask(task.id);

      expect(updatedTask.status).toBe('DOING');
      expect(updatedTask.title).toBe('Original Title'); // Preserved
    });

    it('should retrieve a task by ID', () => {
      const task = taskService.createTask({
        title: 'Retrievable Task'
      });

      const retrieved = taskService.getTask(task.id);
      expect(retrieved).toBeDefined();
      expect(retrieved.title).toBe('Retrievable Task');
    });

    it('should retrieve all tasks', () => {
      taskService.createTask({ title: 'Task 1' });
      taskService.createTask({ title: 'Task 2' });

      const tasks = taskService.getAllTasks();
      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe('Task 1');
      expect(tasks[1].title).toBe('Task 2');
    });
  });

  describe('Task Filtering', () => {
    beforeEach(() => {
      // Create test tasks with different statuses
      const task1 = taskService.createTask({ title: 'Todo Task' }); // Default TODO
      const task2 = taskService.createTask({ title: 'Progress Task' });
      const task3 = taskService.createTask({ title: 'Done Task' });
      
      // Update statuses
      taskService.updateStatus(task2.id, 'DOING');
      taskService.updateStatus(task3.id, 'DONE');
    });

    it('should filter tasks by status', () => {
      const todoTasks = taskService.getTasksByStatus('TODO');
      const progressTasks = taskService.getTasksByStatus('DOING');
      const doneTasks = taskService.getTasksByStatus('DONE');

      expect(todoTasks).toHaveLength(1);
      expect(progressTasks).toHaveLength(1);
      expect(doneTasks).toHaveLength(1);
    });

    it('should return empty array for non-existent status', () => {
      const nonExistentTasks = taskService.getTasksByStatus('NON_EXISTENT');
      expect(nonExistentTasks).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when updating non-existent task', () => {
      expect(() => {
        taskService.updateStatus('non-existent-id', 'DOING');
      }).toThrow('Task not found: non-existent-id');
    });

    it('should return null for non-existent task retrieval', () => {
      const result = taskService.getTask('non-existent-id');
      expect(result).toBeNull();
    });

    it('should handle task creation with minimal data', () => {
      const task = taskService.createTask({ title: 'Minimal Task' });
      expect(task).toBeDefined();
      expect(task.title).toBe('Minimal Task');
      expect(task.description).toBe(''); // Default empty
    });
  });

  describe('Event System Integration', () => {
    it('should emit events on task operations', () => {
      const mockGlobalEvents = {
        emit: vi.fn()
      };
      
      // Mock the global events
      taskService.globalEvents = mockGlobalEvents;

      const task = taskService.createTask({
        title: 'Event Test Task'
      });

      expect(mockGlobalEvents.emit).toHaveBeenCalledWith('task:created', expect.objectContaining({
        task: expect.objectContaining({ id: task.id })
      }));
    });

    it('should emit status change events', () => {
      const mockGlobalEvents = {
        emit: vi.fn()
      };
      
      taskService.globalEvents = mockGlobalEvents;
      
      const task = taskService.createTask({ title: 'Status Test Task' });
      
      // Clear the creation event call
      mockGlobalEvents.emit.mockClear();
      
      taskService.updateStatus(task.id, 'DOING');

      expect(mockGlobalEvents.emit).toHaveBeenCalledWith('task:status-changed', expect.objectContaining({
        taskId: task.id,
        oldStatus: 'TODO',
        newStatus: 'DOING'
      }));
    });
  });
});