const success = (res, data, message = 'Operación exitosa', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data
    });
};

const error = (res, message = 'Error en el servidor', statusCode = 500, errors = null) => {
    return res.status(statusCode).json({
        success: false,
        message,
        errors
    });
};

module.exports = {
    success,
    error
};
