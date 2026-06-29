import { createApi } from "@reduxjs/toolkit/query/react";
import axiosBaseQuery from "@/Helper/axiosBaseQuery";

export const unitApi = createApi({
    reducerPath: "unitApi",
    baseQuery: axiosBaseQuery,
    tagTypes: ["Unit"],
    endpoints: (builder) => ({
        getAllUnits: builder.query({
            query: () => ({ url: "/api/units", method: "GET" }),
            providesTags: ["Unit"],
        }),

        getUnitById: builder.query({
            query: (id) => ({ url: `/api/units/${id}`, method: "GET" }),
            providesTags: (result, error, id) => [{ type: "Unit", id }],
        }),

        createUnit: builder.mutation({
            query: (data) => ({ url: "/api/units", method: "POST", data }),
            invalidatesTags: ["Unit"],
        }),

        updateUnit: builder.mutation({
            query: ({ id, ...data }) => ({ url: `/api/units/${id}`, method: "PUT", data }),
            invalidatesTags: ["Unit"],
        }),

        deleteUnit: builder.mutation({
            query: (id) => ({ url: `/api/units/${id}`, method: "DELETE" }),
            invalidatesTags: ["Unit"],
        }),
    }),
});

export const {
    useGetAllUnitsQuery,
    useGetUnitByIdQuery,
    useCreateUnitMutation,
    useUpdateUnitMutation,
    useDeleteUnitMutation,
} = unitApi;
