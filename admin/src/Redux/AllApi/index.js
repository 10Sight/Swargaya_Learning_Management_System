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
    useDeleteUserMutation,
} from './UserApi';

// Instructor API exports
export {
    instructorApi,
    useGetAllInstructorsQuery,
    useGetInstructorByIdQuery,
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
} from './ProgressApi';

// Submission API exports
export {
    submissionApi,
    useCreateSubmissionMutation,
    useResubmitAssignmentMutation,
    useGetSubmissionByAssignmentQuery,
    useGetMySubmissionsQuery,
    useGradeSubmissionMutation,
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
} from './AttemptedQuizApi';
