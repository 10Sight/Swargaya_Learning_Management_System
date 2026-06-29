import axiosBaseQuery from "@/Helper/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";
import { moduleApi } from "./moduleApi";
import { courseApi } from "./CourseApi";

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
            onQueryStarted: async (args, { dispatch, queryFulfilled }) => {
                try {
                    await queryFulfilled;
                    dispatch(moduleApi.util.invalidateTags(['Module']));
                    dispatch(courseApi.util.invalidateTags(['Course']));
                } catch (error) {}
            },
        }),
        getResourcesByModule: builder.query({
            query: (moduleId) => ({ url: `/api/resources/module/${moduleId}` }),
            providesTags: (result, error, moduleId) => [
                { type: 'Resource', id: `module-${moduleId}` },
            ],
        }),
        getResourcesByCourse: builder.query({
            query: (courseId) => ({ url: `/api/resources/course/${courseId}` }),
            providesTags: (result, error, courseId) => [
                { type: 'Resource', id: `course-${courseId}` },
            ],
        }),
        getResourcesByLesson: builder.query({
            query: (lessonId) => ({ url: `/api/resources/lesson/${lessonId}` }),
            providesTags: (result, error, lessonId) => [
                { type: 'Resource', id: `lesson-${lessonId}` },
            ],
        }),
        deleteResource: builder.mutation({
            query: (resourceId) => ({
                url: `/api/resources/${resourceId}`,
                method: "DELETE",
            }),
            invalidatesTags: ['Resource'],
            onQueryStarted: async (args, { dispatch, queryFulfilled }) => {
                try {
                    await queryFulfilled;
                    dispatch(moduleApi.util.invalidateTags(['Module']));
                    dispatch(courseApi.util.invalidateTags(['Course']));
                } catch (error) {}
            },
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
            onQueryStarted: async (args, { dispatch, queryFulfilled }) => {
                try {
                    await queryFulfilled;
                    dispatch(moduleApi.util.invalidateTags(['Module']));
                    dispatch(courseApi.util.invalidateTags(['Course']));
                } catch (error) {}
            },
        }),
    }),
});

export const {
    useCreateResourceMutation,
    useGetResourcesByModuleQuery,
    useGetResourcesByCourseQuery,
    useGetResourcesByLessonQuery,
    useDeleteResourceMutation,
    useUpdateResourceMutation,
} = resourceApi;
