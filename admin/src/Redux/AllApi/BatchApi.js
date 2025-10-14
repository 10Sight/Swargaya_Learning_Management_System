import axiosBaseQuery from "@/Helper/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";

export const batchApi = createApi({
    reducerPath: "batchApi",
    baseQuery: axiosBaseQuery,
    tagTypes: ['Batch'],
    endpoints: (builder) => ({
        createBatch: builder.mutation({
            query: ({ name, instructorId, courseId, startDate, endDate, capacity }) => ({
                url: "/api/batches",
                method: "POST",
                data: { name, instructorId, courseId, startDate, endDate, capacity }
            }),
            invalidatesTags: ['Batch'],
        }),

        assignInstructor: builder.mutation({
            query: ({ batchId, instructorId }) => ({
                url: "/api/batches/assign-instructor",
                method: "POST",
                data: { batchId, instructorId }
            }),
            invalidatesTags: ['Batch'],
        }),

        removeInstructor: builder.mutation({
            query: (batchId) => ({
                url: "/api/batches/remove-instructor",
                method: "POST",
                data: { batchId }
            }),
            invalidatesTags: ['Batch'],
        }),

        addStudentToBatch: builder.mutation({
            query: ({ batchId, studentId }) => ({
                url: "/api/batches/add-student",
                method: "POST",
                data: { batchId, studentId }
            }),
            invalidatesTags: ['Batch'],
        }),

        removeStudentFromBatch: builder.mutation({
            query: ({ batchId, studentId }) => ({
                url: "/api/batches/remove-student",
                method: "POST",
                data: { batchId, studentId }
            }),
            invalidatesTags: ['Batch'],
        }),

        getAllBatches: builder.query({
            query: ({ page = 1, limit = 20, search = "" } = {}) => ({
                url: "/api/batches",
                method: "GET",
                params: { page, limit, search }
            }),
            providesTags: ['Batch'],
        }),

        getBatchById: builder.query({
            query: (id) => ({
                url: `/api/batches/${id}`,
                method: "GET",
            }),
            providesTags: (result, error, id) => [{ type: 'Batch', id }],
        }),

        updateBatch: builder.mutation({
            query: ({ id, name, courseId, status, startDate, endDate, capacity }) => ({
                url: `/api/batches/${id}`,
                method: "PUT",
                data: { name, courseId, status, startDate, endDate, capacity }
            }),
            invalidatesTags: ['Batch'],
        }),

        deleteBatch: builder.mutation({
            query: (id) => ({
                url: `/api/batches/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ['Batch'],
        }),

        getBatchProgress: builder.query({
            query: (batchId) => ({
                url: `/api/batches/${batchId}/progress`,
                method: "GET",
            }),
            providesTags: (result, error, batchId) => [{ type: 'Batch', id: `progress-${batchId}` }],
        }),

        getBatchSubmissions: builder.query({
            query: (batchId) => ({
                url: `/api/batches/${batchId}/submissions`,
                method: "GET",
            }),
            providesTags: (result, error, batchId) => [{ type: 'Batch', id: `submissions-${batchId}` }],
        }),

        getBatchAttempts: builder.query({
            query: (batchId) => ({
                url: `/api/batches/${batchId}/attempts`,
                method: "GET",
            }),
            providesTags: (result, error, batchId) => [{ type: 'Batch', id: `attempts-${batchId}` }],
        }),

        // Super Admin functions
        getSoftDeletedBatches: builder.query({
            query: ({ page = 1, limit = 20, search = "" } = {}) => ({
                url: "/api/batches/deleted/all",
                method: "GET",
                params: { page, limit, search }
            }),
            providesTags: ['Batch'],
        }),

        restoreBatch: builder.mutation({
            query: (id) => ({
                url: `/api/batches/deleted/${id}/restore`,
                method: "PATCH",
            }),
            invalidatesTags: ['Batch'],
        }),

        cancelBatch: builder.mutation({
            query: ({ id, reason }) => ({
                url: `/api/batches/${id}/cancel`,
                method: "POST",
                data: { reason }
            }),
            invalidatesTags: ['Batch'],
        }),

        getMyBatches: builder.query({
            query: () => ({
                url: "/api/batches/me/my-batches",
                method: "GET",
            }),
            providesTags: ['Batch'],
        }),
    }),
});

export const {
    useCreateBatchMutation,
    useAssignInstructorMutation,
    useRemoveInstructorMutation,
    useAddStudentToBatchMutation,
    useRemoveStudentFromBatchMutation,
    useGetAllBatchesQuery,
    useGetBatchByIdQuery,
    useUpdateBatchMutation,
    useDeleteBatchMutation,
    useGetBatchProgressQuery,
    useGetBatchSubmissionsQuery,
    useGetBatchAttemptsQuery,
    useGetSoftDeletedBatchesQuery,
    useRestoreBatchMutation,
    useCancelBatchMutation,
    useGetMyBatchesQuery,
} = batchApi;
