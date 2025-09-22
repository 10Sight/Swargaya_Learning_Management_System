import { ApiError } from "../utils/ApiError.js";

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new ApiError("You do not have permission to perform this action", 403);
    }
    next();
  };
};

export default authorizeRoles;

