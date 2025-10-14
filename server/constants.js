export const UserRolesEnum = {
    ADMIN: "ADMIN",
    INSTRUCTOR: "INSTRUCTOR",
    STUDENT: "STUDENT",
    SUPERADMIN: "SUPERADMIN"
};

export const AvailableUserRoles = Object.values(UserRolesEnum);

export const UserStatusEnum = {
    ACTIVE: "ACTIVE",
    SUSPENDED: "SUSPENDED",
    PENDING: "PENDING",
    BANNED: "BANNED",
};

export const AvailableUserStatus = Object.values(UserStatusEnum);

export const UserLoginType = {
    FACEBOOK: "FACEBOOK",
    EMAIL_PASSWORD: "EMAIL_PASSWORD",
};

export const AvailableSocialLogins = Object.values(UserLoginType);

export const CourseType = {
    BEGGINER: "BEGGINER",
    INTERMEDIATE: "INTERMEDIATE",
    ADVANCED: "ADVANCED"
};

export const AvailableCourseDifficultyLevels = Object.values(CourseType);

export const CourseStatus = {
    DRAFT: "DRAFT",
    PUBLISHED: "PUBLISHED",
    ARCHIVED: "ARCHIVED"
};

export const AvailableCourseStatus = Object.values(CourseStatus);

export const StudentStatus = {
    PASSED: "PASSED",
    FAILED: "FAILED",
    IN_PROGRESS: "IN_PROGRESS"
};

export const AvailableStudentStatus = Object.values(StudentStatus);