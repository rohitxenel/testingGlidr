const allowedOrigins = [
    "http://localhost:3000",
    "https://glidr-admin.vercel.app/",
    "https://glidr-admin.vercel.app"

];


module.exports.corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.error('Blocked by CORS:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    optionsSuccessStatus: 200
};