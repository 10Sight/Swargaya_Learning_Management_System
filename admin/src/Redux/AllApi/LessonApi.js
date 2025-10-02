import axiosBaseQuery from "@/Helper/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";

export const lessonApi = createApi({
  reducerPath: "lessonApi",
  baseQuery: axiosBaseQuery,
  tagTypes: ["Lesson"],
  endpoints: (builder) => ({
    createLesson: builder.mutation({
      query: ({ moduleId, title, content, duration, order }) => ({
        url: `/api/modules/${moduleId}/lessons`,
        method: "POST",
        data: { title, content, duration, order },
      }),
      invalidatesTags: ["Lesson"],
    }),

    getLessonsByModule: builder.query({
      query: (moduleId) => ({
        url: `/api/modules/${moduleId}/lessons`,
        method: "GET",
      }),
      providesTags: ["Lesson"],
    }),

    getLessonById: builder.query({
      query: ({ moduleId, lessonId }) => ({
        url: `/api/modules/${moduleId}/lessons/${lessonId}`,
        method: "GET",
      }),
      providesTags: ["Lesson"],
    }),

    updateLesson: builder.mutation({
      query: ({ moduleId, lessonId, title, content, duration, order }) => ({
        url: `/api/modules/${moduleId}/lessons/${lessonId}`,
        method: "PUT",
        data: { title, content, duration, order },
      }),
      invalidatesTags: ["Lesson"],
    }),

    deleteLesson: builder.mutation({
      query: ({ moduleId, lessonId }) => ({
        url: `/api/modules/${moduleId}/lessons/${lessonId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Lesson"],
    }),
  }),
});

export const {
  useCreateLessonMutation,
  useGetLessonsByModuleQuery,
  useGetLessonByIdQuery,
  useUpdateLessonMutation,
  useDeleteLessonMutation,
} = lessonApi;
