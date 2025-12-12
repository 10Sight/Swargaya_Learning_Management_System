import axiosBaseQuery from "@/Helper/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";

export const userApi = createApi({
    reducerPath: "userApi",
    baseQuery: axiosBaseQuery,
    tagTypes: ['User'],
    endpoints: (builder) => ({
        getAllUsers: builder.query({
            query: ({ page = 1, limit = 20, sortBy = "createdAt", order = "desc", search = "", role = "", unit = "" } = {}) => ({
                url: "/api/users",
                method: "GET",
                params: { page, limit, sortBy, order, search, role, unit }
            }),
            providesTags: ['User'],
        }),

        getUserById: builder.query({
            query: (id) => ({
                url: `/api/users/${id}`,
                method: "GET",
            }),
            providesTags: (result, error, id) => [{ type: 'User', id }],
        }),

        updateProfile: builder.mutation({
            query: ({ fullName, phoneNumber, email }) => ({
                url: "/api/users/profile",
                method: "PATCH",
                data: { fullName, phoneNumber, email }
            }),
            invalidatesTags: ['User'],
        }),

        updateAvatar: builder.mutation({
            query: (formData) => ({
                url: "/api/users/avatar",
                method: "PATCH",
                data: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            }),
            invalidatesTags: ['User'],
        }),

        updateUser: builder.mutation({
            query: ({ id, ...userData }) => ({
                url: `/api/users/${id}`,
                method: "PATCH",
                data: userData
            }),
            invalidatesTags: ['User'],
        }),

        deleteUser: builder.mutation({
            query: (id) => ({
                url: `/api/users/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ['User'],
        }),

        // Super Admin functions
        getSoftDeletedUsers: builder.query({
            query: ({ page = 1, limit = 20, sortBy = "updatedAt", order = "desc", search = "", role = "" } = {}) => ({
                url: "/api/users/deleted/all",
                method: "GET",
                params: { page, limit, sortBy, order, search, role }
            }),
            providesTags: ['User'],
        }),

        restoreUser: builder.mutation({
            query: (id) => ({
                url: `/api/users/deleted/${id}/restore`,
                method: "PATCH",
            }),
            invalidatesTags: ['User'],
        }),

        exportStudents: builder.query({
            query: ({ format = 'excel', search = '', status = '', departmentId = '' } = {}) => ({
                url: `/api/exports/students`,
                method: "GET",
                params: { format, search, status, departmentId },
                responseHandler: (response) => response.data
            }),
            keepUnusedDataFor: 0,
        }),

    }),
});

export const {
    useGetAllUsersQuery,
    useGetUserByIdQuery,
    useUpdateProfileMutation,
    useUpdateAvatarMutation,
    useUpdateUserMutation,
    useDeleteUserMutation,
    useGetSoftDeletedUsersQuery,
    useRestoreUserMutation,
    useLazyExportStudentsQuery,
} = userApi;
