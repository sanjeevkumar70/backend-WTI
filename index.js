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

  // Local development
  "http://localhost:5173",
  "http://127.0.0.1:5173",

  // If you also use localhost:3000, uncomment this
  // "http://localhost:3000",
];

const corsOptions = {
  origin: function (origin, callback) {
    console.log("=================================");
    console.log("CORS REQUEST");
    console.log("Origin:", origin);
    console.log("=================================");

    // Allow requests without Origin
    // Example: Postman, curl, server-to-server
    if (!origin) {
      return callback(null, true);
    }

    // Check allowed origins
    if (allowedOrigins.includes(origin)) {
      console.log("CORS Allowed:", origin);
      return callback(null, true);
    }

    console.log("CORS Blocked:", origin);

    return callback(
      new Error(`Not allowed by CORS: ${origin}`)
    );
  },

  methods: [
    "GET",
    "HEAD",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
  ],

  optionsSuccessStatus: 204,
};

// ========================================
// CORS MIDDLEWARE
// MUST BE BEFORE ROUTES
// ========================================

app.use(cors(corsOptions));

// Explicitly handle OPTIONS / preflight requests
app.options(/.*/, cors(corsOptions));

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
    message:
      "Too many submissions from this IP, please try again later.",
  },
});

// ========================================
// NODEMAILER
// ========================================

const transporter = nodemailer.createTransport({
  host: "relay-hosting.secureserver.net",
  port: 25,
  secure: false,

  // Optional authentication if your GoDaddy SMTP requires it.
  // Uncomment if needed.
  //
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
// HEALTH CHECK
// ========================================

app.get("/", (req, res) => {
  res.status(200).send("Server Running Successfully");
});

// ========================================
// HEALTH CHECK JSON
// ========================================

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is running",
    environment: process.env.NODE_ENV || "production",
  });
});

// ========================================
// CORS TEST
// ========================================

app.get("/auth/connect/cors-test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CORS is working",
    origin: req.headers.origin || null,
  });
});

// ========================================
// CONTACT FORM
// ========================================

app.post(
  "/auth/connect/contact",
  formLimiter,
  async (req, res) => {
    try {
      console.log("Contact form request received");

      console.log("Request body:", {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        company: req.body.company,
        message: req.body.message,
      });

      // ========================================
      // GET FORM DATA
      // ========================================

      const {
        name,
        email,
        phone,
        company,
        message,
      } = req.body;

      // ========================================
      // VALIDATION
      // ========================================

      if (
        !name ||
        !email ||
        !phone ||
        !company ||
        !message
      ) {
        return res.status(400).json({
          success: false,
          message: "Please fill all fields",
        });
      }

      // ========================================
      // CHECK EMAIL CONFIG
      // ========================================

      if (!process.env.EMAIL_USER) {
        console.error("EMAIL_USER is missing");

        return res.status(500).json({
          success: false,
          message: "Email configuration is missing",
        });
      }

      // ========================================
      // ADMIN EMAIL
      // ========================================

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

            <table
              border="1"
              cellpadding="10"
              cellspacing="0"
              style="border-collapse: collapse;"
            >

              <tr>
                <td><strong>Name</strong></td>
                <td>${name}</td>
              </tr>

              <tr>
                <td><strong>Email</strong></td>
                <td>${email}</td>
              </tr>

              <tr>
                <td><strong>Phone</strong></td>
                <td>${phone}</td>
              </tr>

              <tr>
                <td><strong>Company</strong></td>
                <td>${company}</td>
              </tr>

              <tr>
                <td><strong>Message</strong></td>
                <td>${message}</td>
              </tr>

            </table>

          </body>
          </html>
        `,
      });

      // ========================================
      // CUSTOMER EMAIL
      // ========================================

      const customerEmail = transporter.sendMail({
        from: process.env.EMAIL_USER,

        to: email,

        subject:
          "Thank You for Contacting World Textile India",

        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Thank You</title>
          </head>

          <body>

            <h2>Hello ${name},</h2>

            <p>
              Thank you for contacting
              <strong>World Textile India</strong>.
            </p>

            <p>
              We have received your enquiry successfully.
            </p>

            <p>
              Our team will contact you shortly.
            </p>

            <br>

            <p>
              Regards,<br>
              <strong>World Textile India Team</strong>
            </p>

          </body>
          </html>
        `,
      });

      // ========================================
      // WAIT FOR BOTH EMAILS
      // ========================================

      await Promise.all([
        adminEmail,
        customerEmail,
      ]);

      console.log("Both emails sent successfully");

      // ========================================
      // SUCCESS RESPONSE
      // ========================================

      return res.status(200).json({
        success: true,
        message:
          "Your enquiry has been submitted successfully.",
      });

    } catch (error) {
      console.error(
        "Contact Form Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  }
);

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

  // CORS error
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
// SERVER
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