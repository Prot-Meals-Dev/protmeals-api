import { Controller, Get, Query } from '@nestjs/common';
import { MailService } from './mail.service';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get('send')
  async sendMail(@Query('to') to: string) {
    return this.mailService.sendTestMail(to);
  }
}
  