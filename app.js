


const express = require("express");
const cors = require("cors");

const mainRouter = require("./routes/index.js");
const config = require("./config.json");



const app = express();
const port = config.PORT || 3000;

app.use(express.json());
                
app.use(express.urlencoded({ extended: true }))

const allowedOrigins = [

  "http://192.168.1.34:5173",

 
 
];


const localhostRegex = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) {
        
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin) || localhostRegex.test(origin)) {
        callback(null, true);
      } else {
        console.warn("CORS blocked for origin:", origin);
 
        return callback(new Error("Not allowed by CORS"), false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS" , "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use("/v1", mainRouter);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
