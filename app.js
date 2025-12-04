


const express = require("express");
const cors = require("cors");

const mainRouter = require("./routes/index.js");
const config = require("./config.json");



const app = express();
const port = config.PORT || 3000;

app.use(express.json());
                
app.use(express.urlencoded({ extended: true }))

const allowedOrigins = [
  "http://localhost:5173",      
  "http://127.0.0.1:5173",
  "http://localhost:3000",      
  "http://192.168.1.48:5173",
  "http://192.168.1.34:5173",
  "http://192.168.1.35:5173",
  "http://192.168.1.42:5173",
   "http://192.168.1.41:5173",
     "http://192.168.1.33:5173",
  "https://dashboard.busybox.in", 
 
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
