import axiosBaseQuery from "@/Helper/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";

export const authApi = createApi({
    reducerPath: "authApi",
    baseQuery: axiosBaseQuery,
    tagTypes: ['Auth', 'User'],
    endpoints: (builder) => ({
        userRegister: builder.mutation({
            query: ({ fullName, userName, email, phoneNumber, role = "STUDENT", password, unit }) => ({
                url: "/api/v1/auth/register",
                method: "POST",
                data: { userName, fullName, email, phoneNumber, role, password, unit }
            }),
            invalidatesTags: ['User'],
        }),

        userLogin: builder.mutation({
            query: ({ email, userName, password }) => ({
                url: "/api/v1/auth/login",
                method: "POST",
                data: email
                    ? { email, password }        
                    : { userName, password }     
            }),
            invalidatesTags: ['Auth'],
        }),

        userLogout: builder.mutation({
            query: () => ({
                url: "/api/v1/auth/logout",
                method: "GET",
            }),
            invalidatesTags: ['Auth'],
        }),

        getUserProfile: builder.query({
            query: () => ({
                url: "/api/v1/auth/profile",
                method: "GET",
            }),
            providesTags: ['Auth'],
        }),

        forgotPassword: builder.mutation({
            query: ({ email }) => ({
                url: "/api/v1/auth/forgot-password",
                method: "POST",
                data: { email }
            }),
        }),

        resetPassword: builder.mutation({
            query: ({ token, password }) => ({
                url: `/api/v1/auth/reset-password/${token}`,
                method: "POST",
                data: { password }
            }),
        }),
    }),
});

export const {
    useUserRegisterMutation,
    useUserLoginMutation,
    useUserLogoutMutation,
    useGetUserProfileQuery,
    useForgotPasswordMutation,
    useResetPasswordMutation,
} = authApi;