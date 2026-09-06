export function otpEmailTemplate(otp: string) {
  return `
    <div style="font-family:Arial,sans-serif;padding:20px">
      <h2>Email Verification</h2>

      <p>Your verification code is</p>

      <div
        style="
          font-size:32px;
          font-weight:bold;
          letter-spacing:8px;
          color:#2563eb;
          margin:20px 0;
        "
      >
        ${otp}
      </div>

      <p>This OTP is valid for <b>5 minutes</b>.</p>

      <p>If you didn't request this email, you can safely ignore it.</p>
    </div>
  `;
}