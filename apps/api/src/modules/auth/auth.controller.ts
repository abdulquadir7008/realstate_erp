import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { registerOrganizationSchema, loginSchema, RegisterOrganizationInput, LoginInput } from '@re/shared';
import { Public } from '../../common/decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiTags, ApiBody, ApiResponse } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
@Public()
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('register')
  @ApiBody({ description: 'Organization registration' })
  @ApiResponse({ status: 201, description: 'Organization registered' })
  register(@Body(new ZodValidationPipe(registerOrganizationSchema)) body: RegisterOrganizationInput) {
    return this.service.register(body);
  }

  @Post('login')
  @ApiBody({ description: 'Login credentials' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput) {
    return this.service.login(body);
  }
}
