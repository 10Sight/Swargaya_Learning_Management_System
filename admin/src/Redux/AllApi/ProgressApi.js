import axiosBaseQuery from "@/Helper/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";

export const progressApi = createApi({
    reducerPath: "progressApi",
    baseQuery: axiosBaseQuery,
    tagTypes: ['Progress'],
    endpoints: (builder) => ({
        initializeProgress: builder.mutation({
            query: ({ courseId }) => ({
                url: "/api/progress",
                method: "POST",
                data: { courseId }
            }),
            invalidatesTags: ['Progress'],
        }),

        updateProgress: builder.mutation({
            query: ({ courseId, moduleId, lessonId, completed }) => ({
                url: "/api/progress",
                method: "PATCH",
                data: { courseId, moduleId, lessonId, completed }
            }),
            invalidatesTags: ['Progress'],
        }),

        upgradeLevel: builder.mutation({
            query: ({ courseId }) => ({
                url: "/api/progress/upgrade-level",
                method: "PATCH",
                data: { courseId }
            }),
            invalidatesTags: ['Progress'],
        }),

        getMyProgress: builder.query({
            query: (courseId) => ({
                url: `/api/progress/my/${courseId}`,
                method: "GET",
            }),
            providesTags: (result, error, courseId) => [{ type: 'Progress', id: courseId }],
        }),

        getCourseProgress: builder.query({
            query: (courseId) => ({
                url: `/api/progress/course/${courseId}`,
                method: "GET",
            }),
            providesTags: (result, error, courseId) => [{ type: 'Progress', id: courseId }],
        }),
    }),
});

export const {
    useInitializeProgressMutation,
    useUpdateProgressMutation,
    useUpgradeLevelMutation,
    useGetMyProgressQuery,
    useGetCourseProgressQuery,
} = progressApi;
