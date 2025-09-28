import axiosBaseQuery from "@/Helper/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";

export const attemptedQuizApi = createApi({
    reducerPath: "attemptedQuizApi",
    baseQuery: axiosBaseQuery,
    tagTypes: ['AttemptedQuiz'],
    endpoints: (builder) => ({
        attemptQuiz: builder.mutation({
            query: ({ quizId, answers }) => ({
                url: "/api/attempts",
                method: "POST",
                data: { quizId, answers }
            }),
            invalidatesTags: ['AttemptedQuiz'],
        }),

        getMyAttempts: builder.query({
            query: () => ({
                url: "/api/attempts/my",
                method: "GET",
            }),
            providesTags: ['AttemptedQuiz'],
        }),

        getAttemptsQuiz: builder.query({
            query: (quizId) => ({
                url: `/api/attempts/quiz/${quizId}`,
                method: "GET",
            }),
            providesTags: (result, error, quizId) => [{ type: 'AttemptedQuiz', id: quizId }],
        }),

        getAttemptById: builder.query({
            query: (id) => ({
                url: `/api/attempts/${id}`,
                method: "GET",
            }),
            providesTags: (result, error, id) => [{ type: 'AttemptedQuiz', id }],
        }),

        deleteAttempt: builder.mutation({
            query: (id) => ({
                url: `/api/attempts/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ['AttemptedQuiz'],
        }),

        getStudentAttempts: builder.query({
            query: (studentId) => ({
                url: `/api/attempts/student/${studentId}`,
                method: "GET",
            }),
            providesTags: (result, error, studentId) => [{ type: 'AttemptedQuiz', id: `student-${studentId}` }],
        }),
    }),
});

export const {
    useAttemptQuizMutation,
    useGetMyAttemptsQuery,
    useGetAttemptsQuizQuery,
    useGetAttemptByIdQuery,
    useDeleteAttemptMutation,
    useGetStudentAttemptsQuery,
} = attemptedQuizApi;
