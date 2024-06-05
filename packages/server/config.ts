import { JwtModuleOptions } from '@nestjs/jwt';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { RedisOptions } from 'ioredis';

// typeORM 链接数据库配置
export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: '139.224.34.183',
  port: 3306,
  username: 'root',
  password: '123456',
  database: 'lowcode',
  entities: ['dist/**/*.entity{.ts,.js}'],
  autoLoadEntities: true,
  synchronize: true,
};

// redis 配置
export const redisConfig: RedisOptions = {
  port: 6379,
  host: '8.134.163.0',
  password: 'xdclass.net168',
};

// 短信服务参数
export const xdclassConfig = {
  appid: 'GSs03c0jyWIWxVqRVK',
  appSecret: 'EKuQ1rfa2w5MX2Tue55GeTR9U1URoMJe',
};

// token 参数配置
export const jwtConfig: JwtModuleOptions = {
  secret: 'xdclass.net',
  signOptions: { expiresIn: '7d' },
  global: true,
};

// 微信登录参数配置
export const wechatLoginConfig = {
  appId: 'GSs03c0jyWIWxVqRVK',
  appSecret: 'EKuQ1rfa2w5MX2Tue55GeTR9U1URoMJe',
  qrUrl: 'https://mp.weixin.qq.com/cgi-bin/showqrcode',
  token: 'testxdclass',
};

// 阿里云 oss 配置
export const aliOssConfig = {
  region: 'oss-cn-guangzhou',
  accessKeyId: 'LTAI5tSoRsrqbtDz3ZCPLmZ5',
  accessKeySecret: 'xxxxxxx',
  bucket: 'lowcode-res',
};

export const aliOssDomain = 'http://lowcode.16web.net';
