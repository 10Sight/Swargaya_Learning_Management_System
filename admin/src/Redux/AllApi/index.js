// Auth API exports
export {
    authApi,
    useUserRegisterMutation,
    useUserLoginMutation,
    useUserLogoutMutation,
    useGetUserProfileQuery,
    useForgotPasswordMutation,
    useResetPasswordMutation,
} from './AuthApi';

// User API exports
export {
    userApi,
    useGetAllUsersQuery,
    useGetUserByIdQuery,
    useUpdateProfileMutation,
    useUpdateAvatarMutation,
    useUpdateUserMutation,
    useDeleteUserMutation,
} from './UserApi';

// Instructor API exports
export {
    instructorApi,
    useGetAllInstructorsQuery,
    useGetInstructorByIdQuery,
    useGetAllStudentsQuery,
    useCreateInstructorMutation,
    useUpdateInstructorMutation,
    useDeleteInstructorMutation,
    useUpdateInstructorStatusMutation,
} from './InstructorApi';

// Course API exports
export {
    courseApi,
    useCreateCourseMutation,
    useGetCoursesQuery,
    useGetCourseByIdQuery,
    useUpdateCourseMutation,
    useDeleteCourseMutation,
    useTogglePublishCourseMutation,
} from './CourseApi';

// Assignment API exports
export {
    assignmentApi,
    useCreateAssignmentMutation,
    useGetAllAssignmentsQuery,
    useGetAssignmentByIdQuery,
    useUpdateAssignmentMutation,
    useDeleteAssignmentMutation,
} from './AssignmentApi';

// Batch API exports
export {
    batchApi,
    useCreateBatchMutation,
    useAssignInstructorMutation,
    useAddStudentToBatchMutation,
    useRemoveStudentFromBatchMutation,
    useGetAllBatchesQuery,
    useGetBatchByIdQuery,
    useUpdateBatchMutation,
    useDeleteBatchMutation,
} from './BatchApi';

// Quiz API exports
export {
    quizApi,
    useCreateQuizMutation,
    useGetAllQuizzesQuery,
    useGetQuizByIdQuery,
    useUpdateQuizMutation,
    useDeleteQuizMutation,
} from './QuizApi';

// Enrollment API exports
export {
    enrollmentApi,
    useEnrollStudentMutation,
    useUnenrollStudentMutation,
    useGetAllEnrollmentsQuery,
    useGetStudentEnrollmentsQuery,
    useGetCourseEnrollmentsQuery,
    useUpdateEnrollmentMutation,
    useDeleteEnrollmentMutation,
} from './EnrollmentApi';

// Progress API exports
export {
    progressApi,
    useInitializeProgressMutation,
    useUpdateProgressMutation,
    useUpgradeLevelMutation,
    useGetMyProgressQuery,
    useGetCourseProgressQuery,
    useGetStudentProgressQuery,
} from './ProgressApi';

// Submission API exports
export {
    submissionApi,
    useCreateSubmissionMutation,
    useResubmitAssignmentMutation,
    useGetSubmissionByAssignmentQuery,
    useGetMySubmissionsQuery,
    useGradeSubmissionMutation,
    useGetStudentSubmissionsQuery,
} from './SubmissionApi';

// Certificate API exports
export {
    certificateApi,
    useIssueCertificateMutation,
    useGetCertificateByIdQuery,
    useGetStudentCertificatesQuery,
    useGetCourseCertificatesQuery,
    useRevokeCertificateMutation,
} from './CertificateApi';

// Audit API exports
export {
    auditApi,
    useGetAllAuditsQuery,
    useGetAuditByIdQuery,
    useDeleteAuditMutation,
} from './AuditApi';

// Attempted Quiz API exports
export {
    attemptedQuizApi,
    useAttemptQuizMutation,
    useGetMyAttemptsQuery,
    useGetAttemptsQuizQuery,
    useGetAttemptByIdQuery,
    useDeleteAttemptMutation,
    useGetStudentAttemptsQuery,
    useStartQuizQuery,
    useSubmitQuizMutation,
    useGetQuizAttemptStatusQuery,
} from './AttemptedQuizApi';

// Analytics API exports
export {
    analyticsApi,
    useGetDashboardStatsQuery,
    useGetUserStatsQuery,
    useGetCourseStatsQuery,
    useGetEngagementStatsQuery,
} from './AnalyticsApi';

// Resource API exports
export {
    resourceApi,
    useCreateResourceMutation,
    useGetResourcesByModuleQuery,
    useDeleteResourceMutation,
    useUpdateResourceMutation,
} from './resourceApi';

// Module API exports
export {
    moduleApi,
    useCreateModuleMutation,
    useGetModulesByCourseQuery,
    useUpdateModuleMutation,
    useDeleteModuleMutation,
} from './moduleApi';

// Lesson API exports
export {
    lessonApi,
    useCreateLessonMutation,
    useGetLessonsByModuleQuery,
    useGetLessonByIdQuery,
    useUpdateLessonMutation,
    useDeleteLessonMutation,
} from './LessonApi';
