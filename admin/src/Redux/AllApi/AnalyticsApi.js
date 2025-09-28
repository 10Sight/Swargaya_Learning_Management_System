import axiosBaseQuery from "@/Helper/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";

export const analyticsApi = createApi({
    reducerPath: "analyticsApi",
    baseQuery: axiosBaseQuery,
    tagTypes: ['Analytics'],
    endpoints: (builder) => ({
        getDashboardStats: builder.query({
            query: () => ({
                url: "/api/analytics/dashboard",
                method: "GET",
            }),
            providesTags: ['Analytics'],
        }),

        getUserStats: builder.query({
            query: ({ period = '30d' } = {}) => ({
                url: "/api/analytics/users",
                method: "GET",
                params: { period }
            }),
            providesTags: ['Analytics'],
        }),

        getCourseStats: builder.query({
            query: ({ period = '30d' } = {}) => ({
                url: "/api/analytics/courses",
                method: "GET",
                params: { period }
            }),
            providesTags: ['Analytics'],
        }),

        getEngagementStats: builder.query({
            query: ({ period = '30d' } = {}) => ({
                url: "/api/analytics/engagement",
                method: "GET",
                params: { period }
            }),
            providesTags: ['Analytics'],
        }),
    }),
});

export const {
    useGetDashboardStatsQuery,
    useGetUserStatsQuery,
    useGetCourseStatsQuery,
    useGetEngagementStatsQuery,
} = analyticsApi;
