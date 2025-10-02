// Main BatchCourse orchestrator component
export { default as BatchCourse } from './BatchCourse';

// Individual stage components
export { default as ModuleLessons } from './ModuleLessons';
export { default as ModuleResources } from './ModuleResources';
export { default as ModuleQuiz } from './ModuleQuiz';
export { default as ModuleAssignment } from './ModuleAssignment';
export { default as FinalAssessments } from './FinalAssessments';

// Example usage component with sample data
export { default as BatchCourseExample } from './BatchCourseExample';
export { sampleCourseData } from './BatchCourseExample';
