# Socket.IO Real-Time Integration

This guide explains how Socket.IO has been integrated into your Learning Management System for real-time notifications and updates.

## 🚀 Features Added

### Server-Side (Node.js + Express)
- ✅ Socket.IO server integrated with Express
- ✅ Real-time notification service
- ✅ Room-based communication (batch rooms, user rooms)
- ✅ Authentication for socket connections
- ✅ Comprehensive event handling

### Client-Side (React)
- ✅ Socket.IO client integration
- ✅ React Context for socket management
- ✅ Real-time notification component
- ✅ Toast notifications for live updates
- ✅ Connection status indicator

## 📁 Files Added/Modified

### Server Files
```
server/
├── index.js                    # Modified: Added Socket.IO server integration
├── utils/socketIO.js          # New: Socket.IO service utility
└── examples/
    └── socketio-usage-example.js # New: Usage examples for controllers
```

### Client Files
```
admin/
├── src/
│   ├── contexts/SocketContext.jsx           # New: Socket context and hooks
│   ├── components/common/NotificationCenter.jsx # New: Notification UI component
│   ├── Layout/HomeLayout.jsx                # Modified: Added notification center
│   └── main.jsx                             # Modified: Added SocketProvider
└── .env                                     # New: Environment variables
```

## 🔧 Setup Instructions

### 1. Server Setup
The server is already configured. Just start it:

```bash
cd server
npm start
```

The server will run on port 5000 with Socket.IO enabled.

### 2. Client Setup
The client is configured to connect to `http://localhost:5000`. Start the client:

```bash
cd admin
npm run dev
```

### 3. Environment Variables
Make sure your `.env` files are configured:

**Server (.env):**
```env
PORT=5000
# ... other existing variables
```

**Client (admin/.env):**
```env
VITE_SERVER_URL=http://localhost:5000
```

## 📡 How It Works

### Authentication Flow
1. User logs in through the web interface
2. Socket automatically connects when user is authenticated
3. User joins their relevant rooms (batches, courses)
4. Real-time notifications start flowing

### Room Structure
- `batch-{batchId}` - All users in a specific batch
- `user-{userId}` - Direct notifications to a specific user
- `course-{courseId}` - Course-specific notifications

## 🎯 Using Socket.IO in Controllers

### Example: Notify Quiz Started
```javascript
import socketIOService from '../utils/socketIO.js';

export const startQuiz = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        
        // Notify all students in the batch
        socketIOService.notifyQuizStarted(quiz.batchId, {
            title: quiz.title,
            id: quiz._id,
            duration: quiz.duration,
            startTime: new Date()
        });
        
        res.json({ success: true, quiz });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
```

### Example: Notify Assignment Created
```javascript
export const createAssignment = async (req, res) => {
    try {
        const assignment = await Assignment.create(req.body);
        
        // Notify students about new assignment
        socketIOService.notifyAssignmentCreated(assignment.batchId, {
            title: assignment.title,
            id: assignment._id,
            dueDate: assignment.dueDate,
            description: assignment.description
        });
        
        res.json({ success: true, assignment });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
```

## 🔔 Notification Types

### Supported Events
- **quiz-started** - Quiz has been started
- **quiz-submitted** - Student submitted a quiz
- **assignment-created** - New assignment posted
- **assignment-submitted** - Student submitted assignment
- **grade-updated** - Grade has been updated
- **new-announcement** - General announcements
- **user-joined** / **user-left** - User activity in rooms

### Client-Side Usage
```jsx
import { useSocket } from '../contexts/SocketContext';

function MyComponent() {
    const { 
        isConnected, 
        notifications, 
        notifyQuizStarted,
        joinRoom,
        leaveRoom 
    } = useSocket();
    
    const handleStartQuiz = () => {
        notifyQuizStarted(batchId, quizData);
    };
    
    return (
        <div>
            <span>Status: {isConnected ? 'Connected' : 'Disconnected'}</span>
            <div>Notifications: {notifications.length}</div>
        </div>
    );
}
```

## 🎨 UI Components

### Notification Center
A bell icon in the header shows:
- Live connection status (green/red dot)
- Notification count badge
- Dropdown with recent notifications
- Toast notifications for new events

### Toast Notifications
Real-time toast messages appear for:
- Quiz started/submitted
- Assignment created/submitted  
- Grade updates
- Announcements
- User activity

## 🛠️ Customization

### Adding New Event Types
1. **Server**: Add method to `server/utils/socketIO.js`
2. **Client**: Add event handler to `admin/src/contexts/SocketContext.jsx`
3. **UI**: Update notification styles in `NotificationCenter.jsx`

### Example: Add "Course Updated" Event
```javascript
// server/utils/socketIO.js
notifyCourseUpdated(batchId, courseData) {
    this.emitToRoom(`batch-${batchId}`, 'course-updated', {
        type: 'course-updated',
        message: `Course "${courseData.title}" has been updated`,
        course: courseData,
        timestamp: new Date()
    });
}

// admin/src/contexts/SocketContext.jsx
newSocket.on('course-updated', (data) => {
    console.log('Course updated:', data);
    setNotifications(prev => [data, ...prev.slice(0, 49)]);
    toast.info(data.message, {
        description: `Course: ${data.course?.title}`,
        duration: 6000,
    });
});
```

## 🔍 Testing

### Test Socket Connection
1. Start server: `cd server && npm start`
2. Start client: `cd admin && npm run dev`
3. Login to the application
4. Check browser console for connection messages
5. Check notification bell in header

### Manual Testing
You can test notifications by:
1. Opening browser console
2. Using the socket instance directly:
```javascript
// In browser console
window.socket.emit('send-notification', {
    targetRoom: 'batch-123',
    message: 'Test notification',
    type: 'info'
});
```

## 🚀 Production Deployment

### Environment Variables
Update your production environment:
```env
# Server
PORT=5000
NODE_ENV=production

# Client  
VITE_SERVER_URL=https://your-api-domain.com
```

### CORS Configuration
Update CORS origins in `server/index.js`:
```javascript
const io = new Server(server, {
    cors: {
        origin: [
            "https://your-frontend-domain.com",
            "http://localhost:5173" // Keep for development
        ],
        credentials: true,
        methods: ["GET", "POST"]
    }
});
```

## 📊 Monitoring

### Connection Tracking
- Check server logs for connection/disconnection events
- Monitor connected user count
- Track room membership

### Performance
- Socket.IO handles reconnection automatically
- Notifications are queued if connection is lost
- Memory usage is controlled (max 50 notifications per user)

## 🔧 Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check server is running on correct port
   - Verify CORS settings
   - Check environment variables

2. **Notifications Not Appearing**
   - Verify user is authenticated
   - Check user has joined correct rooms
   - Verify batch/course IDs are correct

3. **Multiple Connections**
   - Clear browser cache
   - Check for duplicate SocketProvider wrapping

### Debug Mode
Add to client environment:
```env
VITE_SOCKET_DEBUG=true
```

This enables additional console logging for debugging.

## 🎉 Next Steps

Now you can:
1. **Integrate into existing controllers** using the examples provided
2. **Customize notification types** for your specific needs  
3. **Add more UI components** for better user experience
4. **Implement chat features** using the typing indicators
5. **Add push notifications** for mobile users

The foundation is set - build amazing real-time features on top of it! 🚀
