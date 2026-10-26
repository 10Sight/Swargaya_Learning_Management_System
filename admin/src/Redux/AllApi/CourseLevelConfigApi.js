import { createApi } from "@reduxjs/toolkit/query/react";
import axiosBaseQuery from "@/Helper/axiosBaseQuery";

const CourseLevelConfigApi = createApi({
  reducerPath: "courseLevelConfig",
  baseQuery: axiosBaseQuery,
  tagTypes: ["CourseLevelConfig"],
  endpoints: (builder) => ({
    // Get active configuration (accepts optional { unit, departmentId })
    getActiveConfig: builder.query({
      query: (params) => ({
        url: "/api/course-level-config/active",
        method: "GET",
        params: params || {},
      }),
      providesTags: ["CourseLevelConfig"],
    }),

    // Get hierarchy matrix (Global + all Units + all Departments)
    getHierarchyMatrix: builder.query({
      query: () => ({
        url: "/api/course-level-config/hierarchy-matrix",
        method: "GET",
      }),
      providesTags: ["CourseLevelConfig"],
    }),
    
    // Get all configurations (optional filters: { scopeType, unit, departmentId })
    getAllConfigs: builder.query({
      query: (params) => ({
        url: "/api/course-level-config",
        method: "GET",
        params: params || {},
      }),
      providesTags: ["CourseLevelConfig"],
    }),
    
    // Get configuration by ID
    getConfigById: builder.query({
      query: (id) => ({
        url: `/api/course-level-config/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "CourseLevelConfig", id }],
    }),
    
    // Create new configuration or override
    createConfig: builder.mutation({
      query: (data) => ({
        url: "/api/course-level-config",
        method: "POST",
        data: data,
      }),
      invalidatesTags: ["CourseLevelConfig"],
    }),
    
    // Update configuration
    updateConfig: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/api/course-level-config/${id}`,
        method: "PATCH",
        data: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        "CourseLevelConfig",
        { type: "CourseLevelConfig", id },
      ],
    }),
    
    // Delete configuration
    deleteConfig: builder.mutation({
      query: (id) => ({
        url: `/api/course-level-config/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["CourseLevelConfig"],
    }),

    // Delete a scope override (reverts Unit or Department to parent inheritance)
    deleteScopeOverride: builder.mutation({
      query: (data) => ({
        url: "/api/course-level-config/scope-override",
        method: "DELETE",
        data: data,
      }),
      invalidatesTags: ["CourseLevelConfig"],
    }),
    
    // Set configuration as default (Global only)
    setAsDefault: builder.mutation({
      query: (id) => ({
        url: `/api/course-level-config/${id}/set-default`,
        method: "PATCH",
      }),
      invalidatesTags: ["CourseLevelConfig"],
    }),
    
    // Validate compatibility
    validateCompatibility: builder.mutation({
      query: (data) => ({
        url: "/api/course-level-config/validate-compatibility",
        method: "POST",
        data: data,
      }),
    }),
    
    // Migrate levels
    migrateLevels: builder.mutation({
      query: (data) => ({
        url: "/api/course-level-config/migrate-levels",
        method: "POST",
        data: data,
      }),
      invalidatesTags: ["CourseLevelConfig"],
    }),
  }),
});

export const {
  useGetActiveConfigQuery,
  useGetHierarchyMatrixQuery,
  useGetAllConfigsQuery,
  useGetConfigByIdQuery,
  useCreateConfigMutation,
  useUpdateConfigMutation,
  useDeleteConfigMutation,
  useDeleteScopeOverrideMutation,
  useSetAsDefaultMutation,
  useValidateCompatibilityMutation,
  useMigrateLevelsMutation,
} = CourseLevelConfigApi;

export default CourseLevelConfigApi;
