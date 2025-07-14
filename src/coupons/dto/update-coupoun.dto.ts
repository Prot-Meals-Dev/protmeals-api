import { PartialType } from '@nestjs/mapped-types';
import { CreateCoupounDto } from './create-coupoun.dto';

export class UpdateCoupounDto extends PartialType(CreateCoupounDto) {}
