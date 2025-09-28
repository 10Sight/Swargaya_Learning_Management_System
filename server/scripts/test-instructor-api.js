import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testInstructorAPI() {
  console.log('Testing Instructor API endpoints...\n');

  try {
    // Step 1: Login as instructor
    console.log('1. Testing instructor login...');
    const loginResponse = await fetch(`${BASE_URL}/api/instructor/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'instructor@test.com',
        password: 'password123'
      })
    });

    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok) {
      console.error('Login failed:', loginData);
      return;
    }

    console.log('✅ Login successful!');
    console.log('Instructor:', loginData.data.instructor.fullName);
    console.log('Token:', loginData.data.token.substring(0, 20) + '...');
    
    const token = loginData.data.token;
    const cookies = loginResponse.headers.get('set-cookie');

    // Step 2: Test dashboard stats
    console.log('\n2. Testing dashboard stats...');
    const statsResponse = await fetch(`${BASE_URL}/api/instructor/dashboard/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cookie': cookies || ''
      }
    });

    const statsData = await statsResponse.json();
    
    if (!statsResponse.ok) {
      console.error('Dashboard stats failed:', statsData);
      return;
    }

    console.log('✅ Dashboard stats retrieved!');
    console.log('Courses:', statsData.data.courses.total);
    console.log('Batches:', statsData.data.batches.total);
    console.log('Students:', statsData.data.students.total);

    // Step 3: Test assigned courses
    console.log('\n3. Testing assigned courses...');
    const coursesResponse = await fetch(`${BASE_URL}/api/instructor/courses`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cookie': cookies || ''
      }
    });

    const coursesData = await coursesResponse.json();
    
    if (!coursesResponse.ok) {
      console.error('Assigned courses failed:', coursesData);
      return;
    }

    console.log('✅ Assigned courses retrieved!');
    console.log('Total courses:', coursesData.data.total);
    if (coursesData.data.courses.length > 0) {
      console.log('First course:', coursesData.data.courses[0].title);
    }

    // Step 4: Test assigned batches
    console.log('\n4. Testing assigned batches...');
    const batchesResponse = await fetch(`${BASE_URL}/api/instructor/batches`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cookie': cookies || ''
      }
    });

    const batchesData = await batchesResponse.json();
    
    if (!batchesResponse.ok) {
      console.error('Assigned batches failed:', batchesData);
      return;
    }

    console.log('✅ Assigned batches retrieved!');
    console.log('Total batches:', batchesData.data.total);
    
    if (batchesData.data.batches.length > 0) {
      const firstBatch = batchesData.data.batches[0];
      console.log('First batch:', firstBatch.name);
      console.log('Batch students:', firstBatch.students.length);

      // Step 5: Test batch students
      console.log('\n5. Testing batch students...');
      const studentsResponse = await fetch(`${BASE_URL}/api/instructor/batches/${firstBatch._id}/students`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cookie': cookies || ''
        }
      });

      const studentsData = await studentsResponse.json();
      
      if (!studentsResponse.ok) {
        console.error('Batch students failed:', studentsData);
        return;
      }

      console.log('✅ Batch students retrieved!');
      console.log('Students in batch:', studentsData.data.students.length);
      if (studentsData.data.students.length > 0) {
        console.log('First student:', studentsData.data.students[0].fullName);
      }

      // Step 6: Test quiz attempts
      console.log('\n6. Testing quiz attempts...');
      const quizAttemptsResponse = await fetch(`${BASE_URL}/api/instructor/batches/${firstBatch._id}/quiz-attempts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cookie': cookies || ''
        }
      });

      const quizAttemptsData = await quizAttemptsResponse.json();
      
      if (!quizAttemptsResponse.ok) {
        console.error('Quiz attempts failed:', quizAttemptsData);
        return;
      }

      console.log('✅ Quiz attempts retrieved!');
      console.log('Total quiz attempts:', quizAttemptsData.data.total);

      // Step 7: Test assignment submissions
      console.log('\n7. Testing assignment submissions...');
      const assignmentSubmissionsResponse = await fetch(`${BASE_URL}/api/instructor/batches/${firstBatch._id}/assignment-submissions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cookie': cookies || ''
        }
      });

      const assignmentSubmissionsData = await assignmentSubmissionsResponse.json();
      
      if (!assignmentSubmissionsResponse.ok) {
        console.error('Assignment submissions failed:', assignmentSubmissionsData);
        return;
      }

      console.log('✅ Assignment submissions retrieved!');
      console.log('Total assignment submissions:', assignmentSubmissionsData.data.total);
    }

    console.log('\n🎉 All instructor API tests passed!');

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testInstructorAPI();
