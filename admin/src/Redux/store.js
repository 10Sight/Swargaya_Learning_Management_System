import { configureStore } from "@reduxjs/toolkit";

// Slice imports
import authSliceReducer from './Slice/AuthSlice';
import userSliceReducer from './Slice/UserSlice';
import courseSliceReducer from './Slice/CourseSlice';

// API imports
import { authApi } from "./AllApi/AuthApi";
import { userApi } from "./AllApi/UserApi";
import { instructorApi } from "./AllApi/InstructorApi";
import { courseApi } from "./AllApi/CourseApi";
import { assignmentApi } from "./AllApi/AssignmentApi";
import { batchApi } from "./AllApi/BatchApi";
import { quizApi } from "./AllApi/QuizApi";
import { enrollmentApi } from "./AllApi/EnrollmentApi";
import { progressApi } from "./AllApi/ProgressApi";
import { submissionApi } from "./AllApi/SubmissionApi";
import { certificateApi } from "./AllApi/CertificateApi";
import { certificateTemplateApi } from "./AllApi/CertificateTemplateApi";
import { auditApi } from "./AllApi/AuditApi";
import { attemptedQuizApi } from "./AllApi/AttemptedQuizApi";
import { resourceApi } from "./AllApi/resourceApi";
import { moduleApi } from "./AllApi/moduleApi";
import { lessonApi } from "./AllApi/LessonApi";
import { analyticsApi } from "./AllApi/AnalyticsApi";
import { superAdminApi } from "./AllApi/SuperAdminApi";

const store = configureStore({
    reducer: {
        // Slice reducers
        auth: authSliceReducer,
        user: userSliceReducer,
        course: courseSliceReducer,
        
        // API reducers
        [authApi.reducerPath]: authApi.reducer,
        [userApi.reducerPath]: userApi.reducer,
        [instructorApi.reducerPath]: instructorApi.reducer,
        [courseApi.reducerPath]: courseApi.reducer,
        [assignmentApi.reducerPath]: assignmentApi.reducer,
        [batchApi.reducerPath]: batchApi.reducer,
        [quizApi.reducerPath]: quizApi.reducer,
        [enrollmentApi.reducerPath]: enrollmentApi.reducer,
        [progressApi.reducerPath]: progressApi.reducer,
        [submissionApi.reducerPath]: submissionApi.reducer,
        [certificateApi.reducerPath]: certificateApi.reducer,
        [certificateTemplateApi.reducerPath]: certificateTemplateApi.reducer,
        [auditApi.reducerPath]: auditApi.reducer,
        [attemptedQuizApi.reducerPath]: attemptedQuizApi.reducer,
        [resourceApi.reducerPath]: resourceApi.reducer,
        [moduleApi.reducerPath]: moduleApi.reducer,
        [lessonApi.reducerPath]: lessonApi.reducer,
        [analyticsApi.reducerPath]: analyticsApi.reducer,
        [superAdminApi.reducerPath]: superAdminApi.reducer,
    },
    middleware: (getDefaultMiddleware) => 
        getDefaultMiddleware().concat(
            authApi.middleware,
            userApi.middleware,
            instructorApi.middleware,
            courseApi.middleware,
            assignmentApi.middleware,
            batchApi.middleware,
            quizApi.middleware,
            enrollmentApi.middleware,
            progressApi.middleware,
            submissionApi.middleware,
            certificateApi.middleware,
            certificateTemplateApi.middleware,
            auditApi.middleware,
            attemptedQuizApi.middleware,
            resourceApi.middleware,
            moduleApi.middleware,
            lessonApi.middleware,
            analyticsApi.middleware,
            superAdminApi.middleware,
        ),
});

export default store
