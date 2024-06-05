import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig, redisConfig, jwtConfig } from '../config';
import { UserModule } from './user/user.module';
import { RedisModule } from './utils/modules/redis.module';
import { JwtModule } from '@nestjs/jwt';
import { WechatLoginModule } from './wechat-login/wechat-login.module';
import { User } from './user/entities/user.entity';
import { LowCodeModule } from './low-code/low-code.module';
import { JWTstrategy } from './utils/JwtStrategyTool';
import { ResourcesModule } from './resources/resources.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig),
    UserModule,
    RedisModule.forRoot(redisConfig),
    JwtModule.register(jwtConfig),
    WechatLoginModule,
    { ...TypeOrmModule.forFeature([User]), global: true },
    LowCodeModule,
    ResourcesModule,
  ],
  controllers: [],
  providers: [JWTstrategy],
})
export class AppModule {}
