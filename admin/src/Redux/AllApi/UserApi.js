import axiosBaseQuery from "@/Helper/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";

export const userApi = createApi({
    reducerPath: "userApi",
    baseQuery: axiosBaseQuery,
    tagTypes: ['User'],
    endpoints: (builder) => ({
        getAllUsers: builder.query({
            query: ({ page = 1, limit = 20, sortBy = "createdAt", order = "desc", search = "", role = "" } = {}) => ({
                url: "/api/users",
                method: "GET",
                params: { page, limit, sortBy, order, search, role }
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

        deleteUser: builder.mutation({
            query: (id) => ({
                url: `/api/users/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ['User'],
        }),

    }),
});

export const {
    useGetAllUsersQuery,
    useGetUserByIdQuery,
    useUpdateProfileMutation,
    useUpdateAvatarMutation,
    useDeleteUserMutation,
} = userApi;
