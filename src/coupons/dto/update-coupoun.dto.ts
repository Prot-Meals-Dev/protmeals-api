import { PartialType } from '@nestjs/mapped-types';
import { CreateCouponDto } from './create-coupoun.dto';

export class UpdateCoupounDto extends PartialType(CreateCouponDto) {}
