import axiosBaseQuery from "@/Helper/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";

export const instructorApi = createApi({
    reducerPath: "instructorApi",
    baseQuery: axiosBaseQuery,
    tagTypes: ['Instructor'],
    endpoints: (builder) => ({
        // Get all instructors with pagination, search and filters
        getAllInstructors: builder.query({
            query: ({ page = 1, limit = 10, search = "", status = "", sortBy = "createdAt", order = "desc" } = {}) => ({
                url: "/api/users/instructors",
                method: "GET",
                params: { page, limit, search, status, sortBy, order }
            }),
            providesTags: ['Instructor'],
        }),

        getAllStudents: builder.query({
            query: ({ page = 1, limit = 10, search = "", status = "", sortBy = "createdAt", order = "desc"} = {}) => ({
                url: `/api/users/students`,
                method: "GET",
                params: { page, limit, search, status, sortBy, order }
            }),
            providesTags: ['Instructor'],
        }),

        // Get instructor by ID
        getInstructorById: builder.query({
            query: (id) => ({
                url: `/api/users/${id}`,
                method: "GET",
            }),
            providesTags: (result, error, id) => [{ type: 'Instructor', id }],
        }),

        // Create new instructor
        createInstructor: builder.mutation({
            query: (instructorData) => ({
                url: "/api/users",
                method: "POST",
                data: { ...instructorData, role: "INSTRUCTOR" }
            }),
            invalidatesTags: ['Instructor'],
        }),

        // Update instructor
        updateInstructor: builder.mutation({
            query: ({ id, ...instructorData }) => ({
                url: `/api/users/${id}`,
                method: "PATCH",
                data: instructorData
            }),
            invalidatesTags: ['Instructor'],
        }),

        // Delete instructor
        deleteInstructor: builder.mutation({
            query: (id) => ({
                url: `/api/users/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ['Instructor'],
        }),

        // Update instructor status
        updateInstructorStatus: builder.mutation({
            query: ({ id, status }) => ({
                url: `/api/users/${id}`,
                method: "PATCH",
                data: { status }
            }),
            invalidatesTags: ['Instructor'],
        }),
    }),
});

export const {
    useGetAllInstructorsQuery,
    useGetInstructorByIdQuery,
    useGetAllStudentsQuery,
    useCreateInstructorMutation,
    useUpdateInstructorMutation,
    useDeleteInstructorMutation,
    useUpdateInstructorStatusMutation,
} = instructorApi;
