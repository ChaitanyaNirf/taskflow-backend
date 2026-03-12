const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Since we are using the free tier of Resend without a verified domain, 
// the "from" address must be "onboarding@resend.dev".
const FROM_EMAIL = 'onboarding@resend.dev';

const sendTaskAssignmentEmail = async (toEmail, toName, taskTitle, assignedByName) => {
  try {
    if (!resend) {
      console.warn('[Email Service] Missing RESEND_API_KEY. Emails will not be sent.');
      return;
    }

    const { data, error } = await resend.emails.send({
      from: `TaskFlow <${FROM_EMAIL}>`,
      to: [toEmail],
      subject: `New Task Assigned: ${taskTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #5e6ad2;">TaskFlow</h2>
          <p>Hello <strong>${toName}</strong>,</p>
          <p>You have been newly assigned to the task: <br/><strong style="font-size: 16px;">"${taskTitle}"</strong> <br/>by ${assignedByName || 'a team member'}.</p>
          <p>Please check your TaskFlow dashboard for details.</p>
          <br/>
          <p style="color: #666; font-size: 12px;">Best,<br/>TaskFlow Team</p>
        </div>
      `,
    });

    if (error) {
      console.error('Failed to send task assignment email:', error);
    } else {
      console.log('Task assignment email sent successfully:', data.id);
    }
  } catch (error) {
    console.error('Email service error:', error);
  }
};

const sendRegistrationOtp = async (toEmail, toName, otp) => {
  try {
    if (!resend) {
      console.warn('[Email Service] Missing RESEND_API_KEY. Emails will not be sent.');
      return;
    }

    const { data, error } = await resend.emails.send({
      from: `TaskFlow <${FROM_EMAIL}>`,
      to: [toEmail],
      subject: `Your Registration OTP: ${otp}`,
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

    if (error) {
      console.error('Failed to send OTP email:', error);
    } else {
      console.log('OTP email sent successfully:', data.id);
    }
  } catch (error) {
    console.error('OTP email service error:', error);
  }
};

module.exports = { sendTaskAssignmentEmail, sendRegistrationOtp };
