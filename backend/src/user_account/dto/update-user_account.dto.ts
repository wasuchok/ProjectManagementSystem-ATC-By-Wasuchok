import { PartialType } from '@nestjs/mapped-types';
import { RegisterUserDto } from './register-user.dto';

export class UpdateUserAccountDto extends PartialType(RegisterUserDto) { }
