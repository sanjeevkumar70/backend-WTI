require("dotenv").config();

const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const rateLimit = require("express-rate-limit");

const app = express();

// ========================================
// RENDER / PROXY CONFIGURATION
// ========================================

app.set("trust proxy", 1);

// ========================================
// CORS CONFIGURATION
// ========================================

const allowedOrigins = [
  "https://worldtextileindia.com",
  "https://www.worldtextileindia.com",

  // Render backend self-origin
  "https://backend-wti.onrender.com",

  // Local development
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests without Origin (Postman, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    // Sanitize origin by removing any trailing slashes
    const sanitizedOrigin = origin.replace(/\/$/, "");

    // Check against allowed origins list
    if (allowedOrigins.includes(sanitizedOrigin)) {
      return callback(null, true);
    }

    console.log("CORS Blocked Origin:", origin);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },

  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
  ],

  credentials: true,
  optionsSuccessStatus: 204,
};

// Apply CORS globally (Handles preflight OPTIONS requests automatically)
app.use(cors(corsOptions));

// ========================================
// REQUEST LOGGING
// ========================================

app.use((req, res, next) => {
  console.log("---------------------------------");
  console.log("Request Method:", req.method);
  console.log("Request URL:", req.originalUrl);
  console.log("Request Origin:", req.headers.origin || "No Origin");
  console.log("---------------------------------");

  next();
});

// ========================================
// BODY PARSER
// ========================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log("CORS configured successfully");

// ========================================
// RATE LIMITER
// ========================================

const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many submissions from this IP, please try again later.",
  },
});

// ========================================
// NODEMAILER
// ========================================

const transporter = nodemailer.createTransport({
  host: "relay-hosting.secureserver.net",
  port: 25,
  secure: false,

  // Optional authentication if your GoDaddy SMTP requires it:
  // auth: {
  //   user: process.env.EMAIL_USER,
  //   pass: process.env.EMAIL_PASSWORD,
  // },
});

// ========================================
// SMTP CONNECTION TEST
// ========================================

transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP Connection Error:", error);
  } else {
    console.log("SMTP Server Ready");
  }
});

// ========================================
// HEALTH CHECK ROUTES
// ========================================

app.get("/", (req, res) => {
  res.status(200).send("Server Running Successfully");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is running",
    environment: process.env.NODE_ENV || "production",
  });
});

// ========================================
// CORS TEST ROUTE
// ========================================

app.get("/auth/connect/cors-test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CORS is working",
    origin: req.headers.origin || null,
  });
});

// ========================================
// CONTACT FORM ROUTE
// ========================================

app.post("/auth/connect/contact", formLimiter, async (req, res) => {
  try {
    console.log("Contact form request received");

    const { name, email, phone, company, message } = req.body;

    // Validation
    if (!name || !email || !phone || !company || !message) {
      return res.status(400).json({
        success: false,
        message: "Please fill all fields",
      });
    }

    if (!process.env.EMAIL_USER) {
      console.error("EMAIL_USER is missing");

      return res.status(500).json({
        success: false,
        message: "Email configuration is missing",
      });
    }

    // Send Admin Email
    const adminEmail = transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "New Enquiry - World Textile India",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>New Website Enquiry</title>
        </head>
        <body>
          <h2>New Website Enquiry</h2>
          <table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse;">
            <tr><td><strong>Name</strong></td><td>${name}</td></tr>
            <tr><td><strong>Email</strong></td><td>${email}</td></tr>
            <tr><td><strong>Phone</strong></td><td>${phone}</td></tr>
            <tr><td><strong>Company</strong></td><td>${company}</td></tr>
            <tr><td><strong>Message</strong></td><td>${message}</td></tr>
          </table>
        </body>
        </html>
      `,
    });

    // Send Customer Confirmation Email
    const customerEmail = transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Thank You for Contacting World Textile India",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Thank You</title>
        </head>
        <body>
          <h2>Hello ${name},</h2>
          <p>Thank you for contacting <strong>World Textile India</strong>.</p>
          <p>We have received your enquiry successfully.</p>
          <p>Our team will contact you shortly.</p>
          <br>
          <p>Regards,<br><strong>World Textile India Team</strong></p>
        </body>
        </html>
      `,
    });

    // Wait for both emails to send
    await Promise.all([adminEmail, customerEmail]);

    console.log("Both emails sent successfully");

    return res.status(200).json({
      success: true,
      message: "Your enquiry has been submitted successfully.",
    });
  } catch (error) {
    console.error("Contact Form Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// ========================================
// 404 HANDLER
// ========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

// ========================================
// GLOBAL ERROR HANDLER
// ========================================

app.use((error, req, res, next) => {
  console.error("Global Error:", error);

  if (error.message && error.message.includes("Not allowed by CORS")) {
    return res.status(403).json({
      success: false,
      message: "CORS policy blocked this request",
      error: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

// ========================================
// LISTEN
// ========================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("=================================");
  console.log("Production Server Started");
  console.log("PORT:", PORT);
  console.log("HOST: 0.0.0.0");
  console.log("Environment:", process.env.NODE_ENV || "production");
  console.log("=================================");
});
