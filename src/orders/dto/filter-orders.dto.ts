export class FilterOrdersDto {
  date?: string; // ISO or YYYY-MM-DD
  paymentStatus?: string;
  orderStatus?: string;
  page?: number;
  limit?: number;
}
