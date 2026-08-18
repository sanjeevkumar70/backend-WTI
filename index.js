require("dotenv").config();

const nodemailer = require("nodemailer");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();

app.set("trust proxy", 1);

// ========================================
// CORS CONFIGURATION
// ========================================

// const allowedOrigin = "https://worldtextileindia.com";
const allowedOrigins = [
  "https://worldtextileindia.com",
  "https://www.worldtextileindia.com",
  "http://localhost:5173",
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests without Origin
    // Example: Postman, server-to-server requests
    if (!origin) {
      return callback(null, true);
    }

    if (origin === allowedOrigin) {
      return callback(null, true);
    }

    console.log("Blocked CORS Origin:", origin);

    return callback(
      new Error("Not allowed by CORS")
    );
  },

  credentials: true,

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

// Apply CORS BEFORE ROUTES
app.use(cors(corsOptions));

// Explicitly handle OPTIONS requests
app.options(/.*/, cors(corsOptions));

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
});

// ========================================
// HEALTH CHECK
// ========================================

app.get("/", (req, res) => {
  res.status(200).send("Server Running Successfully");
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
      // ADMIN EMAIL
      // ========================================

      const adminEmail = transporter.sendMail({
        from: process.env.EMAIL_USER,

        to: process.env.EMAIL_USER,

        subject:
          "New Enquiry - World Textile India",

        html: `
          <h2>New Website Enquiry</h2>

          <table
            border="1"
            cellpadding="10"
            cellspacing="0"
          >

            <tr>
              <td><b>Name</b></td>
              <td>${name}</td>
            </tr>

            <tr>
              <td><b>Email</b></td>
              <td>${email}</td>
            </tr>

            <tr>
              <td><b>Phone</b></td>
              <td>${phone}</td>
            </tr>

            <tr>
              <td><b>Company</b></td>
              <td>${company}</td>
            </tr>

            <tr>
              <td><b>Message</b></td>
              <td>${message}</td>
            </tr>

          </table>
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
          <h2>Hello ${name},</h2>

          <p>
            Thank you for contacting
            <b>World Textile India</b>.
          </p>

          <p>
            We have received your enquiry successfully.
          </p>

          <p>
            Our team will contact you shortly.
          </p>

          <br>

          Regards,<br>

          <b>World Textile India Team</b>
        `,
      });

      // Wait for both emails
      await Promise.all([
        adminEmail,
        customerEmail,
      ]);

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
// SERVER
// ========================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Production Server Started on port ${PORT}`
  );
});