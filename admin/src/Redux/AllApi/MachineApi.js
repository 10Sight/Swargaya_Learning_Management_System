import { createApi } from "@reduxjs/toolkit/query/react";
import axiosBaseQuery from "@/Helper/axiosBaseQuery";
import { userApi } from "./UserApi";
import { instructorApi } from "./InstructorApi";
import { departmentApi } from "./DepartmentApi";
import { LineApi } from "./LineApi";

// Machine operator assignment mirrors onto the operator's users.lines/machines columns
// server-side, so the Students page (and anything showing line/machine occupancy) needs
// its caches invalidated whenever a machine is created, updated, or deleted.
const invalidateRelatedCaches = async (_arg, { dispatch, queryFulfilled }) => {
    try {
        await queryFulfilled;
        dispatch(userApi.util.invalidateTags(['User']));
        dispatch(instructorApi.util.invalidateTags(['Instructor']));
        dispatch(departmentApi.util.invalidateTags(['Department']));
        dispatch(LineApi.util.invalidateTags(['Line']));
    } catch { }
};

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
            onQueryStarted: invalidateRelatedCaches,
        }),

        // Get Machine by ID
        getMachineById: builder.query({
            query: (id) => ({
                url: `/api/machines/${id}`,
                method: "GET",
            }),
            providesTags: ["Machine"],
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
            onQueryStarted: invalidateRelatedCaches,
        }),

        // Delete Machine
        deleteMachine: builder.mutation({
            query: (id) => ({
                url: `/api/machines/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Machine"],
            onQueryStarted: invalidateRelatedCaches,
        }),
    }),
});

export const {
    useCreateMachineMutation,
    useGetMachineByIdQuery,
    useGetMachinesByLineQuery,
    useLazyGetMachinesByLineQuery,
    useUpdateMachineMutation,
    useDeleteMachineMutation,
} = MachineApi;
