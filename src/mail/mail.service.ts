import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendTestMail(to: string) {
    await this.mailerService.sendMail({
      to,
      subject: 'Hello from NestJS!',
      text: 'This is a test email using Gmail SMTP.',
      html: '<b>This is a test email using Gmail SMTP.</b>',
    });
    return 'Email sent!';
  }

  async sendWelcomeEmail(to: string, name: string) {
    await this.mailerService.sendMail({
      to,
      subject: '🎉 Welcome to ProtMeals!',
      text: `Hi ${name}, welcome to ProtMeals! We're excited to have you onboard.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2 style="color: #2c3e50;">Welcome to <span style="color:#27ae60;">ProtMeals</span>, ${name} 🎉</h2>
          <p>
            We're so excited to have you join our community!  
            ProtMeals is here to bring you healthy, delicious meals at your convenience.
          </p>
          <p>
             Start exploring and place your first order today!
          </p>
          <br/>
          <p style="font-size: 0.9em; color: #7f8c8d;">
            Best regards,<br/>
            The ProtMeals Team
          </p>
        </div>
      `,
    });
    return 'Welcome email sent!';
  }

  async sendOtpEmail(to: string, name: string, otp: string) {
    await this.mailerService.sendMail({
      to,
      subject: '🔑 Your ProtMeals OTP Code',
      html: `
        <h3>Hello ${name},</h3>
        <p>Your OTP code is:</p>
        <div style="font-size: 22px; font-weight: bold; margin: 10px 0;">${otp}</div>
        <p>This code will expire in 15 minutes.</p>
        <p>If you didn’t request this, please ignore this email.</p>
        <br/>
        <p>— ProtMeals Team</p>
      `,
    });
  }
}
