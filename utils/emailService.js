import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "dimondswebdesign@gmail.com",
    pass: "omcqucviqfdfzckk"
  }
});
const emailTemplates = {
  ticketConfirmation: (data) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4f46e5;">Support Ticket Created Successfully</h2>
      <p>Dear ${data.userName},</p>
      <p>Thank you for contacting our support team. We have received your support ticket and are looking into your matter.</p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0;">Ticket Details:</h3>
        <p><strong>Ticket ID:</strong> #${data.ticketId}</p>
        <p><strong>Subject:</strong> ${data.subject}</p>
        <p><strong>Category:</strong> ${data.category}</p>
        <p><strong>Priority:</strong> ${data.priority}</p>
      </div>
      
      <p>Our support team will review your ticket and respond as soon as possible. You can track the status of your ticket in your dashboard.</p>
      
      <p>Best regards,<br>Smart Camping Equipment Support Team</p>
    </div>
  `,
  
  ticketReply: (data) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4f46e5;">Reply to Your Support Ticket</h2>
      <p>Dear ${data.userName},</p>
      <p>We have responded to your support ticket #${data.ticketId}.</p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0;">Ticket: ${data.subject}</h3>
        <h4 style="margin: 15px 0 10px 0;">Reply from ${data.repliedBy}:</h4>
        <p style="background-color: white; padding: 15px; border-radius: 4px;">${data.adminReply}</p>
      </div>
      
      <p>You can view the full conversation and respond in your dashboard.</p>
      
      <p>Best regards,<br>Smart Camping Equipment Support Team</p>
    </div>
  `
};

export const sendEmail = async ({ to, subject, template, data }) => {
  try {
    const html = emailTemplates[template](data);
    
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to,
      subject,
      html
    });
    
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};