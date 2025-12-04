const jwt = require("jsonwebtoken");
const config = require("../config.json");

const authToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

  
    if (!authHeader) {
      return res.status(401).json({ error: "Authorization header missing" });
    }


    const [scheme, token] = authHeader.split(" ");

    if (!scheme || !token) {
      return res.status(401).json({ error: "Invalid Authorization format" });
    }

    if (scheme.toLowerCase() !== "bearer") {
      return res.status(401).json({ error: "Authorization must start with Bearer" });
    }


    jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      req.user = decoded; 
      next();
    });

  } catch (error) {
    return res.status(500).json({ error: "Server error during authentication" });
  }
};

module.exports = { authToken };
