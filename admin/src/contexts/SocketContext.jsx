import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';

const SocketContext = createContext();

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [notifications, setNotifications] = useState([]);
    
    // Get user data from Redux store
    const user = useSelector((state) => state.auth.user);
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

    useEffect(() => {
        // Only initialize socket if user is authenticated
        if (isAuthenticated && user) {
            const newSocket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:5000', {
                withCredentials: true,
                autoConnect: true,
            });

            // Connection event handlers
            newSocket.on('connect', () => {
                console.log('Connected to Socket.IO server:', newSocket.id);
                setIsConnected(true);
                
                // Authenticate user with socket
                newSocket.emit('authenticate', {
                    userId: user._id,
                    name: user.name,
                    role: user.role,
                    batches: user.batches || [], // Assuming user has batches array
                });
            });

            newSocket.on('disconnect', () => {
                console.log('Disconnected from Socket.IO server');
                setIsConnected(false);
            });

            newSocket.on('authenticated', (data) => {
                console.log('Socket authenticated:', data);
                toast.success('Real-time notifications enabled');
            });

            // Real-time notification handlers
            newSocket.on('notification', (data) => {
                console.log('New notification:', data);
                setNotifications(prev => [data, ...prev.slice(0, 49)]); // Keep last 50 notifications
                
                // Show toast notification
                toast(data.message, {
                    description: `From: ${data.from} • ${new Date(data.timestamp).toLocaleTimeString()}`,
                    action: {
                        label: 'View',
                        onClick: () => console.log('Notification clicked:', data),
                    },
                });
            });

            // Quiz notifications
            newSocket.on('quiz-started', (data) => {
                console.log('Quiz started:', data);
                setNotifications(prev => [data, ...prev.slice(0, 49)]);
                toast.info(data.message, {
                    description: `Quiz: ${data.quiz?.title}`,
                    duration: 6000,
                });
            });

            newSocket.on('quiz-submitted', (data) => {
                console.log('Quiz submitted:', data);
                setNotifications(prev => [data, ...prev.slice(0, 49)]);
                toast.success(data.message, {
                    description: 'Quiz submission received',
                });
            });

            // Assignment notifications
            newSocket.on('assignment-created', (data) => {
                console.log('New assignment:', data);
                setNotifications(prev => [data, ...prev.slice(0, 49)]);
                toast.info(data.message, {
                    description: `Due: ${data.assignment?.dueDate ? new Date(data.assignment.dueDate).toLocaleDateString() : 'No due date'}`,
                    duration: 8000,
                });
            });

            newSocket.on('assignment-submitted', (data) => {
                console.log('Assignment submitted:', data);
                setNotifications(prev => [data, ...prev.slice(0, 49)]);
                toast.success(data.message);
            });

            // Grade notifications
            newSocket.on('grade-updated', (data) => {
                console.log('Grade updated:', data);
                setNotifications(prev => [data, ...prev.slice(0, 49)]);
                toast.success(data.message, {
                    description: `Score: ${data.grade?.score || 'N/A'}`,
                    duration: 6000,
                });
            });

            // Announcement notifications
            newSocket.on('new-announcement', (data) => {
                console.log('New announcement:', data);
                setNotifications(prev => [data, ...prev.slice(0, 49)]);
                toast.info('📢 New Announcement', {
                    description: data.message,
                    duration: 10000,
                });
            });

            // User activity notifications
            newSocket.on('user-joined', (data) => {
                console.log('User joined room:', data);
                if (data.userName) {
                    toast(`${data.userName} joined`, {
                        description: `Room: ${data.roomId}`,
                        duration: 3000,
                    });
                }
            });

            newSocket.on('user-left', (data) => {
                console.log('User left room:', data);
                if (data.userName) {
                    toast(`${data.userName} left`, {
                        description: `Room: ${data.roomId}`,
                        duration: 3000,
                    });
                }
            });

            // Typing indicators (for future chat features)
            newSocket.on('user-typing', (data) => {
                console.log('User typing:', data);
                // Handle typing indicator display
            });

            newSocket.on('user-stopped-typing', (data) => {
                console.log('User stopped typing:', data);
                // Handle typing indicator removal
            });

            // Error handling
            newSocket.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
                toast.error('Connection error', {
                    description: 'Failed to connect to real-time notifications',
                });
            });

            setSocket(newSocket);

            // Cleanup on unmount
            return () => {
                newSocket.disconnect();
                setSocket(null);
                setIsConnected(false);
            };
        } else {
            // Disconnect socket if user logs out
            if (socket) {
                socket.disconnect();
                setSocket(null);
                setIsConnected(false);
                setNotifications([]);
            }
        }
    }, [isAuthenticated, user]);

    // Helper functions
    const joinRoom = (roomId) => {
        if (socket && isConnected) {
            socket.emit('join-room', roomId);
        }
    };

    const leaveRoom = (roomId) => {
        if (socket && isConnected) {
            socket.emit('leave-room', roomId);
        }
    };

    const sendNotification = (targetRoom, message, type = 'info') => {
        if (socket && isConnected) {
            socket.emit('send-notification', {
                targetRoom,
                message,
                type,
                from: user?.name || 'Unknown User'
            });
        }
    };

    const notifyQuizStarted = (batchId, quizData) => {
        if (socket && isConnected) {
            socket.emit('quiz-started', {
                batchId,
                quizData
            });
        }
    };

    const notifyQuizSubmitted = (batchId, submissionData) => {
        if (socket && isConnected) {
            socket.emit('quiz-submitted', {
                batchId,
                submissionData
            });
        }
    };

    const notifyAssignmentCreated = (batchId, assignmentData) => {
        if (socket && isConnected) {
            socket.emit('assignment-created', {
                batchId,
                assignmentData
            });
        }
    };

    const notifyAssignmentSubmitted = (batchId, submissionData) => {
        if (socket && isConnected) {
            socket.emit('assignment-submitted', {
                batchId,
                submissionData
            });
        }
    };

    const clearNotifications = () => {
        setNotifications([]);
    };

    const removeNotification = (index) => {
        setNotifications(prev => prev.filter((_, i) => i !== index));
    };

    const contextValue = {
        socket,
        isConnected,
        notifications,
        joinRoom,
        leaveRoom,
        sendNotification,
        notifyQuizStarted,
        notifyQuizSubmitted,
        notifyAssignmentCreated,
        notifyAssignmentSubmitted,
        clearNotifications,
        removeNotification,
    };

    return (
        <SocketContext.Provider value={contextValue}>
            {children}
        </SocketContext.Provider>
    );
};

export default SocketContext;
