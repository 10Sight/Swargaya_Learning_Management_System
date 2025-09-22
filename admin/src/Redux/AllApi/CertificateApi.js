import axiosBaseQuery from "@/Helper/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";

export const certificateApi = createApi({
    reducerPath: "certificateApi",
    baseQuery: axiosBaseQuery,
    tagTypes: ['Certificate'],
    endpoints: (builder) => ({
        issueCertificate: builder.mutation({
            query: ({ courseId, studentId }) => ({
                url: "/api/certificates",
                method: "POST",
                data: { courseId, studentId }
            }),
            invalidatesTags: ['Certificate'],
        }),

        getCertificateById: builder.query({
            query: (id) => ({
                url: `/api/certificates/${id}`,
                method: "GET",
            }),
            providesTags: (result, error, id) => [{ type: 'Certificate', id }],
        }),

        getStudentCertificates: builder.query({
            query: () => ({
                url: "/api/certificates/student",
                method: "GET",
            }),
            providesTags: ['Certificate'],
        }),

        getCourseCertificates: builder.query({
            query: (courseId) => ({
                url: `/api/certificates/course/${courseId}`,
                method: "GET",
            }),
            providesTags: (result, error, courseId) => [{ type: 'Certificate', id: courseId }],
        }),

        revokeCertificate: builder.mutation({
            query: (id) => ({
                url: `/api/certificates/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ['Certificate'],
        }),
    }),
});

export const {
    useIssueCertificateMutation,
    useGetCertificateByIdQuery,
    useGetStudentCertificatesQuery,
    useGetCourseCertificatesQuery,
    useRevokeCertificateMutation,
} = certificateApi;
