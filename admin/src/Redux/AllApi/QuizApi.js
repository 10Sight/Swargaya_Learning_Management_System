import axiosBaseQuery from "@/Helper/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";

export const quizApi = createApi({
    reducerPath: "quizApi",
    baseQuery: axiosBaseQuery,
    tagTypes: ['Quiz', 'Course'], // Add Course to tagTypes
    endpoints: (builder) => ({
        createQuiz: builder.mutation({
            query: ({ courseId, title, questions, passingScore = 70 }) => ({
                url: "/api/quizzes",
                method: "POST",
                data: { courseId, title, questions, passingScore }
            }),
            invalidatesTags: ['Quiz', 'Course'], // Invalidate both Quiz and Course caches
        }),

        getAllQuizzes: builder.query({
            query: ({ page = 1, limit = 20, search = "", courseId } = {}) => ({
                url: "/api/quizzes",
                method: "GET",
                params: { page, limit, search, ...(courseId && { courseId }) }
            }),
            providesTags: (result, error, arg) => {
                // Handle different response structures
                const quizzes = result?.data?.quizzes || result?.data || [];
                return [
                    'Quiz',
                    ...(Array.isArray(quizzes) ? quizzes.map(({ _id }) => ({ type: 'Quiz', id: _id })) : [])
                ];
            },
        }),

        getQuizById: builder.query({
            query: (id) => ({
                url: `/api/quizzes/${id}`,
                method: "GET",
            }),
            providesTags: (result, error, id) => [{ type: 'Quiz', id }],
        }),

        updateQuiz: builder.mutation({
            query: ({ id, title, questions, passingScore }) => ({
                url: `/api/quizzes/${id}`,
                method: "PUT",
                data: { title, questions, passingScore }
            }),
            invalidatesTags: ['Quiz', 'Course'],
        }),

        deleteQuiz: builder.mutation({
            query: (id) => ({
                url: `/api/quizzes/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ['Quiz', 'Course'],
        }),
    }),
});

export const {
    useCreateQuizMutation,
    useGetAllQuizzesQuery,
    useGetQuizByIdQuery,
    useUpdateQuizMutation,
    useDeleteQuizMutation,
} = quizApi;
