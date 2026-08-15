import { createApi } from "@reduxjs/toolkit/query/react";
import axiosBaseQuery from "@/Helper/axiosBaseQuery";

export const onJobTrainingApi = createApi({
    reducerPath: "onJobTrainingApi",
    baseQuery: axiosBaseQuery,
    tagTypes: ["OnJobTraining"],
    endpoints: (builder) => ({
        getAllOJTs: builder.query({
            query: ({ page = 1, limit = 10, search = "", unit, departmentId, lineId, machineId } = {}) => ({
                url: "/api/on-job-training",
                method: "GET",
                params: {
                    page, limit, search,
                    ...(unit ? { unit } : {}),
                    ...(departmentId ? { departmentId } : {}),
                    ...(lineId ? { lineId } : {}),
                    ...(machineId ? { machineId } : {}),
                },
            }),
            providesTags: (result) =>
                result?.data?.employees
                    ? [
                        ...result.data.employees.map(({ studentId }) => ({ type: "OnJobTraining", id: `LIST_${studentId}` })),
                        { type: "OnJobTraining", id: "LIST" },
                    ]
                    : [{ type: "OnJobTraining", id: "LIST" }],
        }),
        getStudentOJTs: builder.query({
            query: (studentId) => ({
                url: `/api/on-job-training/student/${studentId}`,
                method: "GET",
            }),
            providesTags: (result, error, studentId) => [{ type: "OnJobTraining", id: `LIST_${studentId}` }],
        }),
        getOnJobTrainingById: builder.query({
            query: (id) => ({
                url: `/api/on-job-training/${id}`,
                method: "GET",
            }),
            providesTags: (result, error, id) => [{ type: "OnJobTraining", id }],
        }),
        createOnJobTraining: builder.mutation({
            query: (data) => ({
                url: "/api/on-job-training/create",
                method: "POST",
                data,
            }),
            invalidatesTags: (result, error, { studentId }) => [
                { type: "OnJobTraining", id: `LIST_${studentId}` },
                { type: "OnJobTraining", id: "LIST" },
            ],
        }),
        updateOnJobTraining: builder.mutation({
            query: ({ id, data }) => ({
                url: `/api/on-job-training/${id}`,
                method: "PATCH",
                data,
            }),
            invalidatesTags: (result, error, { id, studentId }) => [
                { type: "OnJobTraining", id },
                { type: "OnJobTraining", id: `LIST_${studentId}` },
                { type: "OnJobTraining", id: "LIST" },
            ],
        }),
        deleteOnJobTraining: builder.mutation({
            query: ({ id }) => ({
                url: `/api/on-job-training/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: (result, error, { id, studentId }) => [
                { type: "OnJobTraining", id },
                { type: "OnJobTraining", id: `LIST_${studentId}` },
                { type: "OnJobTraining", id: "LIST" },
            ],
        }),
    }),
});

export const {
    useGetAllOJTsQuery,
    useGetStudentOJTsQuery,
    useGetOnJobTrainingByIdQuery,
    useCreateOnJobTrainingMutation,
    useUpdateOnJobTrainingMutation,
    useDeleteOnJobTrainingMutation,
} = onJobTrainingApi;
