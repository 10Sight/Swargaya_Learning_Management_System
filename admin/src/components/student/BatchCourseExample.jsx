import React from 'react';
import BatchCourse from './BatchCourse';

// Sample course data structure
const sampleCourseData = {
  title: "React Fundamentals Masterclass",
  description: "Complete guide to React.js development",
  modules: [
    {
      id: "module-1",
      title: "Getting Started with React",
      lessons: [
        { 
          id: "lesson-1-1", 
          title: "What is React?", 
          description: "Introduction to React and its core concepts",
          duration: "15 min"
        },
        { 
          id: "lesson-1-2", 
          title: "Setting up Development Environment", 
          description: "Installing Node.js, npm, and create-react-app",
          duration: "20 min"
        },
        { 
          id: "lesson-1-3", 
          title: "Your First React Component", 
          description: "Creating and rendering your first component",
          duration: "25 min"
        }
      ],
      resources: [
        {
          id: "resource-1-1",
          title: "React Official Documentation",
          description: "Complete reference guide for React",
          type: "link",
          url: "https://reactjs.org/docs",
          size: "N/A"
        },
        {
          id: "resource-1-2", 
          title: "React Cheat Sheet",
          description: "Quick reference for React syntax and concepts",
          type: "pdf",
          url: "https://example.com/react-cheat-sheet.pdf",
          size: "2.3 MB"
        },
        {
          id: "resource-1-3",
          title: "Setup Guide Video",
          description: "Video walkthrough of development environment setup",
          type: "video",
          url: "https://example.com/setup-video.mp4",
          size: "150 MB"
        }
      ],
      quiz: {
        id: "quiz-1",
        title: "React Basics Quiz",
        questions: [
          { id: "q1", question: "What is JSX?", type: "multiple-choice" },
          { id: "q2", question: "How do you create a React component?", type: "multiple-choice" },
          { id: "q3", question: "What is the virtual DOM?", type: "essay" }
        ]
      },
      assignment: {
        id: "assignment-1",
        title: "Build Your First React App",
        description: "Create a simple to-do list application using React",
        dueDate: "2024-02-15T23:59:59Z"
      }
    },
    {
      id: "module-2", 
      title: "React Components and Props",
      lessons: [
        { 
          id: "lesson-2-1", 
          title: "Understanding Props", 
          description: "How to pass data between components",
          duration: "18 min"
        },
        { 
          id: "lesson-2-2", 
          title: "Component Composition", 
          description: "Building complex UIs with reusable components",
          duration: "30 min"
        }
      ],
      resources: [
        {
          id: "resource-2-1",
          title: "Props Best Practices Guide",
          description: "Guidelines for effective prop usage",
          type: "pdf",
          url: "https://example.com/props-guide.pdf",
          size: "1.8 MB"
        }
      ],
      quiz: {
        id: "quiz-2",
        title: "Components and Props Quiz",
        questions: [
          { id: "q4", question: "How do you pass props to a component?", type: "multiple-choice" },
          { id: "q5", question: "What are children props?", type: "essay" }
        ]
      }
      // No assignment for this module
    },
    {
      id: "module-3",
      title: "State Management with Hooks",
      lessons: [
        { 
          id: "lesson-3-1", 
          title: "useState Hook", 
          description: "Managing component state with useState",
          duration: "25 min"
        },
        { 
          id: "lesson-3-2", 
          title: "useEffect Hook", 
          description: "Side effects and lifecycle methods with useEffect",
          duration: "35 min"
        }
      ],
      resources: [
        {
          id: "resource-3-1",
          title: "Hooks Reference",
          description: "Complete guide to React Hooks",
          type: "link",
          url: "https://reactjs.org/docs/hooks-reference.html"
        }
      ],
      // No quiz for this module
      assignment: {
        id: "assignment-3",
        title: "State Management Practice",
        description: "Build a counter app with multiple state variables",
        dueDate: "2024-02-22T23:59:59Z"
      }
    }
  ],
  finalAssessments: {
    quiz: {
      id: "final-quiz",
      title: "React Fundamentals Final Exam",
      questions: Array.from({ length: 20 }, (_, i) => ({
        id: `final-q${i + 1}`,
        question: `Final question ${i + 1}`,
        type: i % 2 === 0 ? "multiple-choice" : "essay"
      }))
    },
    assignment: {
      id: "final-assignment",
      title: "Portfolio Project",
      description: "Build a complete React application showcasing all learned concepts",
      dueDate: "2024-03-01T23:59:59Z"
    }
  }
};

export default function BatchCourseExample() {
  const handleCourseComplete = () => {
    alert("Congratulations! You have successfully completed the React Fundamentals Masterclass!");
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <BatchCourse 
        course={sampleCourseData} 
        onCourseComplete={handleCourseComplete}
      />
    </div>
  );
}

// Export the sample data for use in other components if needed
export { sampleCourseData };
