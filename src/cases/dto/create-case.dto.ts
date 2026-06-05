import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateCaseDto {
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  clientName: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email address is required' })
  email: string;

  @IsOptional()
  @IsString()
  @Matches(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/, {
    message: 'Please provide a valid phone number',
  })
  phone?: string;

  @IsString()
  @IsNotEmpty({ message: 'Case description is required' })
  @MinLength(50, {
    message:
      'Please provide more detail about your situation (minimum 50 characters)',
  })
  @MaxLength(5000, {
    message: 'Description cannot exceed 5000 characters',
  })
  description: string;
}
