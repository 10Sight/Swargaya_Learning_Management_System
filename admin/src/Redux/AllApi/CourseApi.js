import axiosBaseQuery from "@/Helper/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";

export const courseApi = createApi({
    reducerPath: "courseApi",
    baseQuery: axiosBaseQuery,
    tagTypes: ['Course', 'Quiz', 'Assignment'], // Add Assignment to tagTypes
    endpoints: (builder) => ({
        createCourse: builder.mutation({
            query: ({ title, description, category, level, modules, instructor, quizzes, assignments }) => ({
                url: "/api/courses",
                method: "POST",
                data: { title, description, category, level, modules, instructor, quizzes, assignments }
            }),
            invalidatesTags: ['Course'],
        }),

        getCourses: builder.query({
            query: ({ page = 1, limit = 10, category = "", level = "", search = "", status = "" } = {}) => ({
                url: "/api/courses",
                method: "GET",
                params: { page, limit, category, level, search, status }
            }),
            providesTags: ['Course'],
        }),

        getCourseById: builder.query({
            query: (id) => ({
                url: `/api/courses/${id}`,
                method: "GET",
            }),
            providesTags: (result, error, id) => [
                { type: 'Course', id },
                'Quiz', // Add Quiz tag to ensure course data refreshes when quizzes change
                'Assignment' // Add Assignment tag to ensure course data refreshes when assignments change
            ],
        }),

        updateCourse: builder.mutation({
            query: ({ id, ...updateData }) => ({
                url: `/api/courses/${id}`,
                method: "PUT",
                data: updateData
            }),
            invalidatesTags: ['Course'],
        }),

        deleteCourse: builder.mutation({
            query: (id) => ({
                url: `/api/courses/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ['Course'],
        }),

        togglePublishCourse: builder.mutation({
            query: (id) => ({
                url: `/api/courses/${id}/toggle-publish`,
                method: "PATCH",
            }),
            invalidatesTags: ['Course'],
        }),
    }),
});

export const {
    useCreateCourseMutation,
    useGetCoursesQuery,
    useGetCourseByIdQuery,
    useUpdateCourseMutation,
    useDeleteCourseMutation,
    useTogglePublishCourseMutation,
} = courseApi;
