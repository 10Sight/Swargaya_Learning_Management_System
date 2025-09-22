import axiosBaseQuery from "@/Helper/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";

export const assignmentApi = createApi({
    reducerPath: "assignmentApi",
    baseQuery: axiosBaseQuery,
    tagTypes: ['Assignment', 'Course'], // Add Course to tagTypes
    endpoints: (builder) => ({
        createAssignment: builder.mutation({
            query: ({ courseId, title, description, dueDate }) => ({
                url: "/api/assignments",
                method: "POST",
                data: { courseId, title, description, dueDate }
            }),
            invalidatesTags: ['Assignment', 'Course'], // Invalidate both Assignment and Course caches
        }),

        getAllAssignments: builder.query({
            query: ({ courseId } = {}) => ({
                url: "/api/assignments",
                method: "GET",
                params: courseId ? { courseId } : {}
            }),
            providesTags: (result, error, arg) => {
                const assignments = result?.data || [];
                return [
                    'Assignment',
                    ...(Array.isArray(assignments) ? assignments.map(({ _id }) => ({ type: 'Assignment', id: _id })) : [])
                ];
            },
        }),

        getAssignmentById: builder.query({
            query: (id) => ({
                url: `/api/assignments/${id}`,
                method: "GET",
            }),
            providesTags: (result, error, id) => [{ type: 'Assignment', id }],
        }),

        updateAssignment: builder.mutation({
            query: ({ id, title, description, dueDate }) => ({
                url: `/api/assignments/${id}`,
                method: "PUT",
                data: { title, description, dueDate }
            }),
            invalidatesTags: ['Assignment', 'Course'],
        }),

        deleteAssignment: builder.mutation({
            query: (id) => ({
                url: `/api/assignments/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ['Assignment', 'Course'],
        }),
    }),
});

export const {
    useCreateAssignmentMutation,
    useGetAllAssignmentsQuery,
    useGetAssignmentByIdQuery,
    useUpdateAssignmentMutation,
    useDeleteAssignmentMutation,
} = assignmentApi;
