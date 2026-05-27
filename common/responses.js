const functions = require("./functions");

module.exports = () => (req, res, next) => {
    // success response
    res.success = (message, data) => {
        message = functions.prettyCase(message);
        return res.status(200).send({ statusCode: 200,status: true, message, data: data || {}});
    };

    // No data success response
    res.no_data_success = (message, data) => {
        message = functions.prettyCase(message);
        return res.status(201).send({ statusCode: 201, message, data: data || {} });
    };

    // error resposne
    res.error = (code, message, data) => {
        message = functions.prettyCase(message);
        res.status(code).send({ statusCode: code,status: false, message, data: data || {} });
    };

    // error resposne
    res.custom = (code, message, data) => {
        message = functions.prettyCase(message);
    };

    // proceed forward
    next();
};


