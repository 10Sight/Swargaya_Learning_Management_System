class ApiError extends Error{
    constructor(
        message = "Something went wrong",
        statuscode,
        errors = [],
        stack = ""
    ) {
        super(message)

        this.statuscode = statuscode;
        this.data = null;
        this.message = message;
        this.success = false;
        this.errors = errors;

        if(stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export { ApiError };