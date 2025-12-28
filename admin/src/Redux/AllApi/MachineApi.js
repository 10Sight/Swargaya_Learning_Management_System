import { createApi } from "@reduxjs/toolkit/query/react";
import axiosBaseQuery from "@/Helper/axiosBaseQuery";

export const MachineApi = createApi({
    reducerPath: "MachineApi",
    baseQuery: axiosBaseQuery,
    tagTypes: ["Machine"],
    endpoints: (builder) => ({
        // Create Machine
        createMachine: builder.mutation({
            query: (data) => ({
                url: "/api/machines",
                method: "POST",
                data,
            }),
            invalidatesTags: ["Machine"],
        }),

        // Get Machines by Line
        getMachinesByLine: builder.query({
            query: (lineId) => ({
                url: `/api/machines/line/${lineId}`,
                method: "GET",
            }),
            providesTags: ["Machine"],
        }),

        // Update Machine
        updateMachine: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/api/machines/${id}`,
                method: "PUT",
                data,
            }),
            invalidatesTags: ["Machine"],
        }),

        // Delete Machine
        deleteMachine: builder.mutation({
            query: (id) => ({
                url: `/api/machines/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Machine"],
        }),
    }),
});

export const {
    useCreateMachineMutation,
    useGetMachinesByLineQuery,
    useUpdateMachineMutation,
    useDeleteMachineMutation,
} = MachineApi;
