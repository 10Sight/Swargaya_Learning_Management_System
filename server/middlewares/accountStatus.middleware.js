import { ApiError } from "../utils/ApiError.js";
import { UserStatusEnum } from "../constants.js";

/**
 * Middleware to check user account status and restrict access accordingly
 * - PENDING: Can only access profile-related routes
 * - SUSPENDED/BANNED: Cannot access any student routes
 * - ACTIVE: Full access
 */
const checkAccountStatus = (allowedForPending = false) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError("User not authenticated", 401);
    }

    const userStatus = req.user.status;
    const userRole = req.user.role;

    // Only apply restrictions to STUDENT role
    if (userRole !== "STUDENT") {
      return next();
    }

    switch (userStatus) {
      case UserStatusEnum.ACTIVE:
        // Active users have full access
        return next();
        
      case UserStatusEnum.PENDING:
        // Pending users can only access specific routes (profile, etc.)
        if (allowedForPending) {
          return next();
        }
        throw new ApiError(
          "Your account is currently pending approval. You can only access your profile page. Please contact your instructor for more information.",
          403
        );
        
      case UserStatusEnum.SUSPENDED:
        throw new ApiError(
          "Your account has been suspended. Please contact your instructor for more information.",
          403
        );
        
      case UserStatusEnum.BANNED:
        throw new ApiError(
          "Your account has been banned. Please contact your instructor for more information.",
          403
        );
        
      default:
        throw new ApiError("Invalid account status", 400);
    }
  };
};

export default checkAccountStatus;
