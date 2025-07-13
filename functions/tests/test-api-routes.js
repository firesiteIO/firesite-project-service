/**
 * Test script to verify API routes are working
 */

const { admin, db } = require('./config/firebase-admin');

// Test API routes by directly testing the underlying Firestore operations
async function testApiRoutes() {
  try {
    console.log('=== Testing API Routes Firestore Operations ===');
    
    // First, create a test task to ensure we have data to retrieve
    console.log('\nCreating test task in Firestore...');
    const taskData = {
      title: 'Test API Task',
      description: 'This is a test task for API routes',
      status: 'todo',
      priority: 'medium',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'test-script'
    };
    
    const taskRef = await db.collection('tasks').add(taskData);
    console.log(`Test task created with ID: ${taskRef.id}`);
    
    // Test 1: Get all tasks (similar to GET /api/tasks)
    console.log('\nTest 1: Get all tasks');
    try {
      const snapshot = await db.collection('tasks').get();
      console.log(`Found ${snapshot.size} tasks`);
      
      const tasks = [];
      snapshot.forEach(doc => {
        tasks.push({ id: doc.id, ...doc.data() });
      });
      
      console.log('Tasks:', JSON.stringify(tasks.slice(0, 2), null, 2), '...');
    } catch (error) {
      console.error('Error in Test 1:', error);
    }
    
    // Test 2: Get a specific task (similar to GET /api/tasks/:taskId)
    console.log('\nTest 2: Get a specific task');
    try {
      const doc = await db.collection('tasks').doc(taskRef.id).get();
      
      if (doc.exists) {
        console.log('Task found:', JSON.stringify({ id: doc.id, ...doc.data() }, null, 2));
      } else {
        console.log('Task not found');
      }
    } catch (error) {
      console.error('Error in Test 2:', error);
    }
    
    // Test 3: Update a task (similar to PUT /api/tasks/:taskId)
    console.log('\nTest 3: Update a task');
    try {
      const updates = {
        status: 'in-progress',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await db.collection('tasks').doc(taskRef.id).update(updates);
      console.log('Task updated successfully');
      
      // Verify the update
      const updatedDoc = await db.collection('tasks').doc(taskRef.id).get();
      console.log('Updated task:', JSON.stringify({ id: updatedDoc.id, ...updatedDoc.data() }, null, 2));
    } catch (error) {
      console.error('Error in Test 3:', error);
    }
    
    // Test 4: Create a project (similar to POST /api/projects)
    console.log('\nTest 4: Create a project');
    try {
      const projectData = {
        name: 'Test Project',
        description: 'This is a test project',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: 'test-script',
        tasks: [taskRef.id]
      };
      
      const projectRef = await db.collection('projects').add(projectData);
      console.log(`Project created with ID: ${projectRef.id}`);
      
      // Verify the project
      const projectDoc = await projectRef.get();
      console.log('Project data:', JSON.stringify({ id: projectDoc.id, ...projectDoc.data() }, null, 2));
    } catch (error) {
      console.error('Error in Test 4:', error);
    }
    
    // Test 5: Delete a task (similar to DELETE /api/tasks/:taskId)
    console.log('\nTest 5: Delete a task');
    try {
      // Create a temporary task to delete
      const tempTaskRef = await db.collection('tasks').add({
        title: 'Temporary Task',
        description: 'This task will be deleted',
        status: 'todo',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`Temporary task created with ID: ${tempTaskRef.id}`);
      
      // Delete the task
      await db.collection('tasks').doc(tempTaskRef.id).delete();
      console.log('Task deleted successfully');
      
      // Verify the deletion
      const deletedDoc = await db.collection('tasks').doc(tempTaskRef.id).get();
      console.log('Task exists after deletion:', deletedDoc.exists);
    } catch (error) {
      console.error('Error in Test 5:', error);
    }
    
    console.log('\nAPI routes testing completed!');
  } catch (error) {
    console.error('Error in test script:', error);
  }
}

// Run the tests
testApiRoutes()
  .then(() => console.log('All tests completed.'))
  .catch(error => console.error('Tests failed with error:', error));
