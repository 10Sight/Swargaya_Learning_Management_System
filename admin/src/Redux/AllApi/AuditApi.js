import axiosBaseQuery from "@/Helper/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";

export const auditApi = createApi({
    reducerPath: "auditApi",
    baseQuery: axiosBaseQuery,
    tagTypes: ['Audit'],
    endpoints: (builder) => ({
        getAllAudits: builder.query({
            query: ({ page = 1, limit = 20, userId = "", action = "" } = {}) => ({
                url: "/api/audits",
                method: "GET",
                params: { page, limit, ...(userId && { userId }), ...(action && { action }) }
            }),
            providesTags: ['Audit'],
        }),

        getAuditById: builder.query({
            query: (id) => ({
                url: `/api/audits/${id}`,
                method: "GET",
            }),
            providesTags: (result, error, id) => [{ type: 'Audit', id }],
        }),

        deleteAudit: builder.mutation({
            query: (id) => ({
                url: `/api/audits/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ['Audit'],
        }),
    }),
});

export const {
    useGetAllAuditsQuery,
    useGetAuditByIdQuery,
    useDeleteAuditMutation,
} = auditApi;
