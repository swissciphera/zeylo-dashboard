import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class SetupAdminDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(10, { message: 'Le mot de passe doit faire au moins 10 caractères.' })
  password!: string;
}

// Self-service client registration (creates a Company + OWNER user).
export class RegisterClientDto {
  @IsString()
  @IsNotEmpty()
  companyName!: string;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(10, { message: 'Le mot de passe doit faire au moins 10 caractères.' })
  password!: string;

  @IsOptional()
  @IsString()
  referralCode?: string;
}
