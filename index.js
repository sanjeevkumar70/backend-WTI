const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    console.log("Request Origin:", origin);

    // Allow requests without Origin
    // and your local frontend
    if (!origin || origin === "http://localhost:5173") {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API is running"
  });
});

app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "CORS is working!",
    origin: req.headers.origin || null
  });
});

app.post("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "POST request received!",
    data: req.body
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API running on port ${PORT}`);
});