export const UserRolesEnum = {
    ADMIN: "ADMIN",
    INSTRUCTOR: "INSTRUCTOR",
    STUDENT: "STUDENT",
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