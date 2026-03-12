const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'onboarding@brevo.com';
const SENDER_NAME = 'TaskFlow Platform';

const sendEmailViaBrevo = async ({ toEmail, toName, subject, htmlContent, textContent }) => {
  if (!BREVO_API_KEY) {
    console.warn('[Email Service] Missing BREVO_API_KEY. Emails will not be sent.');
    return;
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: toEmail, name: toName }],
        subject: subject,
        htmlContent: htmlContent,
        textContent: textContent
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`Email sent successfully to ${toEmail}. Message ID: ${data.messageId}`);
    } else {
      console.error('Brevo API Error:', data);
    }
  } catch (error) {
    console.error('Failed to send email via Brevo:', error);
  }
};

const sendTaskAssignmentEmail = async (toEmail, toName, taskTitle, assignedByName) => {
  const subject = `New Task Assigned: ${taskTitle}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #5e6ad2;">TaskFlow</h2>
      <p>Hello <strong>${toName}</strong>,</p>
      <p>You have been newly assigned to the task: <br/><strong style="font-size: 16px;">"${taskTitle}"</strong> <br/>by ${assignedByName || 'a team member'}.</p>
      <p>Please check your TaskFlow dashboard for details.</p>
      <br/>
      <p style="color: #666; font-size: 12px;">Best,<br/>TaskFlow Team</p>
    </div>
  `;
  const textContent = `Hello ${toName},\n\nYou have been assigned to: "${taskTitle}" by ${assignedByName}.\n\nBest, TaskFlow Team`;

  await sendEmailViaBrevo({ toEmail, toName, subject, htmlContent, textContent });
};

const sendRegistrationOtp = async (toEmail, toName, otp) => {
  const subject = `Your Registration OTP: ${otp}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px; max-width: 500px;">
      <h2 style="color: #5e6ad2; text-align: center;">TaskFlow Account Verification</h2>
      <p>Hello <strong>${toName}</strong>,</p>
      <p>Thank you for registering. Please use the following OTP to verify your email address. It is valid for exactly 10 minutes.</p>
      <div style="background-color: #f4f6fc; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0;">
        <span style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #1f6feb;">${otp}</span>
      </div>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">Best regards,<br/>TaskFlow Team</p>
    </div>
  `;
  const textContent = `Hello ${toName},\n\nYour OTP for registration is: ${otp}. It expires in 10 minutes.\n\nBest, TaskFlow Team`;

  // Always log the OTP to the console as a backup for the developer
  console.log(`[AUTH] OTP for ${toEmail}: ${otp}`);

  await sendEmailViaBrevo({ toEmail, toName, subject, htmlContent, textContent });
};

module.exports = { sendTaskAssignmentEmail, sendRegistrationOtp };
