const nodemailer = require("nodemailer");
const asyncHandler = require("express-async-handler");
const smtpTransport = require("nodemailer-smtp-transport");

const sendEmail = asyncHandler(async (data, req, res) => {
  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.MAIL_ID, // ethereal user
      pass: process.env.MP, // ethereal password
    },
  });
  let info = await transporter.sendMail({
    from: '"Hey 👻" <abc@gmail.com.com>', // sender address
    to: data.to, // list of receivers
    subject: data.subject, // Subject line
    text: data.text, // plain text body
    html: data.html, // html body
  });

  console.log("Message sent: %s", info.messageId);
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
});

const sendOTPByEmail = asyncHandler(async (email, otp) => {
  const transporter = nodemailer.createTransport(
    smtpTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: "vyamstoree@gmail.com",
        pass: "gtwl pyih lnjw eieu",
      },
    })
  );
  const mailOptions = {
    from: "vyamstoree@gmail.com",
    to: email,
    subject: " OTP Verification",
    text: `Your OTP for login  is: ${otp} `,
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log("OTP send successfully");
  } catch (error) {
    console.log("Error sending OPT", error);
    throw new Error("Failed to send OPT ");
  }
});

module.exports = { sendEmail, sendOTPByEmail };
