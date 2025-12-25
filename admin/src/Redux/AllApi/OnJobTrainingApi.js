import { createApi } from "@reduxjs/toolkit/query/react";
import axiosBaseQuery from "@/Helper/axiosBaseQuery";

export const onJobTrainingApi = createApi({
    reducerPath: "onJobTrainingApi",
    baseQuery: axiosBaseQuery,
    tagTypes: ["OnJobTraining"],
    endpoints: (builder) => ({
        getOnJobTraining: builder.query({
            query: (studentId) => ({
                url: `/api/on-job-training/${studentId}`,
                method: "GET",
            }),
            providesTags: (result, error, studentId) => [{ type: "OnJobTraining", id: studentId }],
        }),
        saveOnJobTraining: builder.mutation({
            query: ({ studentId, data }) => ({
                url: `/api/on-job-training/${studentId}`,
                method: "POST",
                data: data,
            }),
            invalidatesTags: (result, error, { studentId }) => [{ type: "OnJobTraining", id: studentId }],
        }),
    }),
});

export const {
    useGetOnJobTrainingQuery,
    useSaveOnJobTrainingMutation,
} = onJobTrainingApi;
