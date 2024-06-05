import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import { WechatLoginService } from './wechat-login.service';
import { CallbackInsertRequest } from '@lowcode/share';

@Controller('wechat_login')
export class WechatLoginController {
  constructor(private readonly wechatLoginService: WechatLoginService) {}

  // 微信介入验证控制器
  @Get('callback')
  insert(@Query() params: CallbackInsertRequest) {
    return this.wechatLoginService.insert(params);
  }

  // 获取微信二维码控制器
  @Get('login')
  login() {
    return this.wechatLoginService.login();
  }

  /**
   * 接收微信回调的用户信息控制器
   */
  @Post('callback')
  wechatMessage(@Body() body) {
    return this.wechatLoginService.wechatMessage(body);
  }

  /**
   * 轮询用户是否扫码
   */
  @Get('check_scan')
  checkScan(@Query() param: { ticket: string }) {
    return this.wechatLoginService.checkScan(param);
  }
}
