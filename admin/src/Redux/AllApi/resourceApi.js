import axiosBaseQuery from "@/Helper/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";

export const resourceApi = createApi({
    reducerPath: "resourceApi",
    baseQuery: axiosBaseQuery,
    tagTypes: ['Resource'],
    endpoints: (builder) => ({
        createResource: builder.mutation({
            query: (data) => ({
                url: "/api/resources",
                method: "POST",
                data: data,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }),
            invalidatesTags: ['Resource'],
        }),
        getResourcesByModule: builder.query({
            query: (moduleId) => `/api/resources/module/${moduleId}`,
            providesTags: (result, error, moduleId) => [
                { type: 'Resource', id: moduleId },
            ],
        }),
        deleteResource: builder.mutation({
            query: (resourceId) => ({
                url: `/api/resources/${resourceId}`,
                method: "DELETE",
            }),
            invalidatesTags: ['Resource'],
        }),
        updateResource: builder.mutation({
            query: ({ resourceId, data }) => ({
                url: `/api/resources/${resourceId}`,
                method: "PUT",
                data: data,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }),
            invalidatesTags: ['Resource'],
        }),
    }),
});

export const {
    useCreateResourceMutation,
    useGetResourcesByModuleQuery,
    useDeleteResourceMutation,
    useUpdateResourceMutation,
} = resourceApi;