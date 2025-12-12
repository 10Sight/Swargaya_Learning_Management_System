/**
 * Socket.IO Usage Examples for LMS Controllers
 * 
 * This file shows how to use Socket.IO in your existing controllers
 * to send real-time notifications when actions occur.
 */

import socketIOService from '../utils/socketIO.js';

// Example 1: In your Quiz Controller
export const startQuiz = async (req, res) => {
    try {
        const { departmentId, quizId } = req.body;

        // Your existing quiz logic...
        const quiz = await Quiz.findById(quizId);

        if (quiz) {
            // Notify all students in the department about the quiz start
            socketIOService.notifyQuizStarted(departmentId, {
                title: quiz.title,
                id: quiz._id,
                duration: quiz.duration,
                startTime: new Date()
            });
        }

        res.json({ success: true, quiz });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Example 2: In your Assignment Controller
export const createAssignment = async (req, res) => {
    try {
        const { departmentId, ...assignmentData } = req.body;

        // Your existing assignment creation logic...
        const assignment = await Assignment.create(assignmentData);

        if (assignment) {
            // Notify all students in the department about the new assignment
            socketIOService.notifyAssignmentCreated(departmentId, {
                title: assignment.title,
                id: assignment._id,
                dueDate: assignment.dueDate,
                description: assignment.description
            });
        }

        res.json({ success: true, assignment });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Example 3: In your Submission Controller
export const submitAssignment = async (req, res) => {
    try {
        const { departmentId, assignmentId } = req.body;
        const studentId = req.user._id;

        // Your existing submission logic...
        const submission = await Submission.create({
            assignmentId,
            studentId,
            ...req.body
        });

        if (submission) {
            // Notify instructors in the department about the submission
            socketIOService.notifyAssignmentSubmitted(departmentId, {
                assignmentId,
                studentName: req.user.name,
                studentId,
                submissionId: submission._id,
                submittedAt: submission.createdAt
            });
        }

        res.json({ success: true, submission });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Example 4: In your Grading Controller
export const updateGrade = async (req, res) => {
    try {
        const { studentId, score, itemName } = req.body;

        // Your existing grading logic...
        const grade = await Grade.findByIdAndUpdate(req.params.id, { score }, { new: true });

        if (grade) {
            // Notify the specific student about their grade update
            socketIOService.notifyGradeUpdated(studentId, {
                score,
                itemName,
                gradedBy: req.user.name,
                gradedAt: new Date()
            });
        }

        res.json({ success: true, grade });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Example 5: General notification function
export const sendAnnouncement = async (req, res) => {
    try {
        const { departmentId, message, title } = req.body;

        // Send announcement to all users in the department
        socketIOService.notifyNewAnnouncement(departmentId, {
            message,
            title,
            from: req.user.name,
            createdAt: new Date()
        });

        res.json({ success: true, message: 'Announcement sent' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Example 6: Using in middleware (like after authentication)
export const authenticateAndJoinRooms = async (req, res, next) => {
    try {
        // Your existing authentication logic...

        // Get socket.io instance from app
        const io = req.app.get('socketio');

        // Example: Force a user to join specific rooms programmatically
        // This would typically be done in the socket connection handler
        // but can also be triggered from API endpoints

        if (req.user && req.user.departments) {
            // This is just an example - actual room joining happens in socket connection
        }

        next();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * How to access Socket.IO in any controller:
 * 
 * Option 1: Using the singleton service (recommended)
 * import socketIOService from '../utils/socketIO.js';
 * socketIOService.notifyQuizStarted(departmentId, quizData);
 * 
 * Option 2: Getting io instance from Express app
 * const io = req.app.get('socketio');
 * io.to(`department-${departmentId}`).emit('quiz-started', data);
 * 
 * Option 3: Using the service instance from app
 * const socketService = req.app.get('socketIOService');
 * socketService.notifyQuizStarted(departmentId, quizData);
 */
