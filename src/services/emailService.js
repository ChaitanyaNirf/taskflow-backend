const nodemailer = require('nodemailer');

// To use a real email, set these environment variables (EMAIL_USER and EMAIL_PASS).
let transporter;

const getTransporter = async () => {
  if (transporter) return transporter;

  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.warn('[Email Service] Missing email credentials (EMAIL_USER, EMAIL_PASS). Emails will not be sent.');
    return null;
  }

  const transportConfig = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use STARTTLS
    auth: { user, pass },
  };

  transporter = nodemailer.createTransport(transportConfig);

  return transporter;
};

const sendTaskAssignmentEmail = async (toEmail, toName, taskTitle, assignedByName) => {
  try {
    const t = await getTransporter();
    if (!t) return;

    const fromUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const fromAddress = `"TaskFlow Platform" <${fromUser}>`;
    
    // send mail with defined transport object
    const info = await t.sendMail({
      from: fromAddress, // sender address
      to: toEmail, // list of receivers
      subject: `New Task Assigned: ${taskTitle}`, // Subject line
      text: `Hello ${toName},\n\nYou have been newly assigned to the task: "${taskTitle}" by ${assignedByName || 'a team member'}.\n\nPlease check your TaskFlow dashboard for details.\n\nBest,\nTaskFlow Team`, // plain text body
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #5e6ad2;">TaskFlow</h2>
          <p>Hello <strong>${toName}</strong>,</p>
          <p>You have been newly assigned to the task: <br/><strong style="font-size: 16px;">"${taskTitle}"</strong> <br/>by ${assignedByName || 'a team member'}.</p>
          <p>Please check your TaskFlow dashboard for details.</p>
          <br/>
          <p style="color: #666; font-size: 12px;">Best,<br/>TaskFlow Team</p>
        </div>
      `, // html body
    });

    console.log(`Email sent: ${info.messageId}`);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
};

const sendRegistrationOtp = async (toEmail, toName, otp) => {
  try {
    const t = await getTransporter();
    if (!t) return;

    const fromUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const fromAddress = `"TaskFlow Platform" <${fromUser}>`;
    
    const info = await t.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: `Your Registration OTP: ${otp}`,
      text: `Hello ${toName},\n\nYour OTP for registration is: ${otp}\nThis code will expire in 10 minutes.\n\nBest,\nTaskFlow Team`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px; max-width: 500px;">
          <h2 style="color: #5e6ad2; text-align: center;">TaskFlow Account Verification</h2>
          <p>Hello <strong>${toName}</strong>,</p>
          <p>Thank you for registering. Please use the following OTP to verify your email address. It is valid for exactly 10 minutes.</p>
          <div style="background-color: #f4f6fc; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #1f6feb;">${otp}</span>
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">Best regards,<br/>TaskFlow Team</p>
        </div>
      `,
    });

    console.log(`OTP Email sent: ${info.messageId}`);
  } catch (error) {
    console.error('Failed to send OTP email:', error);
  }
};

module.exports = { sendTaskAssignmentEmail, sendRegistrationOtp };
