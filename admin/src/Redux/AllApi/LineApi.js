import { createApi } from "@reduxjs/toolkit/query/react";
import axiosBaseQuery from "@/Helper/axiosBaseQuery";
import { departmentApi } from "./DepartmentApi";

const invalidateDepartmentCache = async (_arg, { dispatch, queryFulfilled }) => {
    try {
        await queryFulfilled;
        dispatch(departmentApi.util.invalidateTags(['Department']));
    } catch { }
};

export const LineApi = createApi({
    reducerPath: "LineApi",
    baseQuery: axiosBaseQuery,
    tagTypes: ["Line"],
    endpoints: (builder) => ({
        // Create Line
        createLine: builder.mutation({
            query: (data) => ({
                url: "/api/lines",
                method: "POST",
                data,
            }),
            invalidatesTags: ["Line"],
            onQueryStarted: invalidateDepartmentCache,
        }),

        // Get Lines by Department
        getLinesByDepartment: builder.query({
            query: (departmentId) => ({
                url: `/api/lines/department/${departmentId}`,
                method: "GET",
            }),
            providesTags: ["Line"],
        }),

        // Update Line
        updateLine: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/api/lines/${id}`,
                method: "PUT",
                data,
            }),
            invalidatesTags: ["Line"],
            onQueryStarted: invalidateDepartmentCache,
        }),

        // Delete Line
        deleteLine: builder.mutation({
            query: (id) => ({
                url: `/api/lines/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Line"],
            onQueryStarted: invalidateDepartmentCache,
        }),
    }),
});

export const {
    useCreateLineMutation,
    useGetLinesByDepartmentQuery,
    useLazyGetLinesByDepartmentQuery,
    useUpdateLineMutation,
    useDeleteLineMutation,
} = LineApi;
