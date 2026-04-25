/**
 * Centralized Error Handling Middleware
 */

class AppError extends Error {
    constructor(message, statusCode, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = 'Resource not found';
        error = new AppError(message, 404);
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const message = `Duplicate field value: ${field}. Please use another value!`;
        error = new AppError(message, 400);
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(val => val.message);
        const message = `Invalid input data. ${errors.join('. ')}`;
        error = new AppError(message, 400);
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        const message = 'Invalid token. Please log in again!';
        error = new AppError(message, 401);
    }

    if (err.name === 'TokenExpiredError') {
        const message = 'Your token has expired! Please log in again.';
        error = new AppError(message, 401);
    }

    // Firebase errors
    if (err.code && err.code.startsWith('auth/')) {
        const message = 'Authentication failed';
        error = new AppError(message, 401);
    }

    // Send error response
    if (process.env.NODE_ENV === 'development') {
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || 'Something went wrong!',
            stack: err.stack,
            status: error.statusCode || 500
        });
    } else {
        // Production: don't leak error details
        if (err.isOperational) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Something went wrong!'
            });
        } else {
            // Programming or other unknown error: don't leak error details
            console.error('ERROR 💥', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong!'
            });
        }
    }
};

/**
 * Handle unhandled promise rejections
 */
const handleUnhandledRejection = (err, server) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
};

/**
 * Handle uncaught exceptions
 */
const handleUncaughtException = (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    process.exit(1);
};

/**
 * Async error wrapper
 */
const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

module.exports = {
    AppError,
    errorHandler,
    handleUnhandledRejection,
    handleUncaughtException,
    catchAsync
};