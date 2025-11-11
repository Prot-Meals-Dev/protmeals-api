# Fleet Manager Order Management Endpoints

## Overview
Two new endpoints have been added to the Fleet Manager API for managing customer orders: **Delete Order** and **Edit Order** (enhanced).

---

## 1. Delete Order

### Endpoint
```
DELETE /fleet-manager/delete-order/:orderId
```

### Description
Allows fleet managers to delete orders that are in `pending` or `cancelled` status. This endpoint includes comprehensive validation to prevent data integrity issues.

### Authorization
- **Required Role:** `fleet_manager`
- **Region Access:** Fleet manager can only delete orders from their assigned region

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| orderId | string | Yes | UUID of the order to delete |

### Validation Rules
1. ✅ **Order must exist** - Returns 404 if order not found
2. ✅ **Region check** - Fleet manager can only delete orders from their region
3. ✅ **Status validation** - Only `pending` or `cancelled` orders can be deleted
4. ✅ **Transaction check** - Cannot delete orders with successful/paid transactions
5. ✅ **Cascading deletion** - Automatically deletes related data:
   - `daily_deliveries`
   - `delivery_assignments`
   - `order_pauses`
   - `order_meal_preferences`
   - Pending/failed transactions

### Success Response (200)
```json
{
  "message": "Order deleted successfully",
  "orderId": "uuid-of-deleted-order"
}
```

### Error Responses

#### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Order not found"
}
```

#### 400 Bad Request (Wrong Region)
```json
{
  "statusCode": 400,
  "message": "You do not have permission to delete this order"
}
```

#### 400 Bad Request (Paid Transaction)
```json
{
  "statusCode": 400,
  "message": "Cannot delete order with paid transactions. Please refund first or cancel the order instead."
}
```

#### 400 Bad Request (Invalid Status)
```json
{
  "statusCode": 400,
  "message": "Cannot delete order with status \"active\". Only pending or cancelled orders can be deleted."
}
```

### Usage Example
```bash
curl -X DELETE \
  https://api.example.com/fleet-manager/delete-order/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 2. Edit Order (Enhanced)

### Endpoint
```
PATCH /fleet-manager/update-customer-order/:orderId
```

### Description
Enhanced endpoint for updating customer orders with comprehensive validation to prevent data corruption and maintain system integrity.

### Authorization
- **Required Role:** `fleet_manager`
- **Region Access:** Implicit (through order data)

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| orderId | string | Yes | UUID of the order to update |

### Request Body
```json
{
  "delivery_address": "string (optional)",
  "phone": "string (optional)",
  "address": "string (optional)",
  "delivery_partner_id": "string (optional)",
  "remarks": "string (optional)"
}
```

### Field Descriptions
| Field | Type | Description | Affects |
|-------|------|-------------|---------|
| delivery_address | string | Order-specific delivery address | `orders.delevery_address` |
| phone | string | Customer's phone number | `users.phone` |
| address | string | Customer's permanent address | `users.address` |
| delivery_partner_id | string | New delivery partner UUID | `delivery_assignments` + `daily_deliveries` (future) |
| remarks | string | Order notes/remarks | `orders.remarks` |

### Enhanced Validation Rules

#### 1. Order Status Validation ✅
- **Cannot modify:** `completed` or `cancelled` orders
- **Can modify:** `active`, `pending`, or `paused` orders

```json
{
  "statusCode": 400,
  "message": "Cannot modify order with status \"completed\". Only active, pending, or paused orders can be edited."
}
```

#### 2. Transaction Check ✅
- Warns when changing delivery partner for orders with paid transactions
- Still allows changes but logs warning for audit purposes

#### 3. Region Validation ✅
When changing `delivery_partner_id`:
- Validates partner exists and has role `delivery_partner`
- **Enforces same region:** Partner must be in same region as customer

```json
{
  "statusCode": 400,
  "message": "Delivery partner must be in the same region as the customer"
}
```

#### 4. Cascading Updates ✅
When delivery partner is changed:
- Updates `delivery_assignments` for all meals
- Updates **future** `daily_deliveries` (from today onwards)
- Uses transaction to ensure atomicity

### Success Response (200)
```json
{
  "orderId": "uuid-of-updated-order",
  "message": "Order updated successfully"
}
```

### Error Responses

#### 404 Not Found (Order)
```json
{
  "statusCode": 404,
  "message": "Order not found"
}
```

#### 404 Not Found (Partner)
```json
{
  "statusCode": 404,
  "message": "Delivery partner not found"
}
```

#### 400 Bad Request (Status)
```json
{
  "statusCode": 400,
  "message": "Cannot modify order with status \"cancelled\". Only active, pending, or paused orders can be edited."
}
```

#### 400 Bad Request (Region Mismatch)
```json
{
  "statusCode": 400,
  "message": "Delivery partner must be in the same region as the customer"
}
```

### Usage Examples

#### Update delivery address only
```bash
curl -X PATCH \
  https://api.example.com/fleet-manager/update-customer-order/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "delivery_address": "New Street, Building 5, Apt 3B"
  }'
```

#### Change delivery partner
```bash
curl -X PATCH \
  https://api.example.com/fleet-manager/update-customer-order/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "delivery_partner_id": "987e6543-e89b-12d3-a456-426614174999"
  }'
```

#### Update multiple fields
```bash
curl -X PATCH \
  https://api.example.com/fleet-manager/update-customer-order/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "delivery_address": "New Street, Building 5, Apt 3B",
    "phone": "+91 9876543210",
    "delivery_partner_id": "987e6543-e89b-12d3-a456-426614174999",
    "remarks": "Customer requested contactless delivery"
  }'
```

---

## Data Integrity Protections

### Critical Safeguards Implemented

1. **No Deletion of Active Orders**
   - Only pending/cancelled orders can be deleted
   - Active/paused orders must be cancelled first

2. **Transaction Protection**
   - Cannot delete orders with paid transactions
   - Logs warnings when modifying orders with payments

3. **Region Enforcement**
   - Fleet managers limited to their region
   - Delivery partners must match customer region

4. **Cascading Operations**
   - All related data handled atomically
   - Prevents orphaned records in database

5. **Status-Based Restrictions**
   - Completed orders are immutable
   - Prevents accidental modification of historical data

6. **Future Delivery Updates**
   - Only updates future deliveries when changing partner
   - Past deliveries remain unchanged for audit trail

---

## Impact on Application Workflow

### ✅ Safe Operations
- Updating delivery addresses
- Changing phone numbers
- Adding/modifying remarks
- Reassigning delivery partners (with region validation)

### ⚠️ Operations with Warnings
- Changing delivery partner on paid orders (logged but allowed)

### ❌ Prevented Operations
- Deleting orders with paid transactions
- Deleting active/paused/completed orders
- Modifying completed/cancelled orders
- Assigning delivery partner from different region

---

## Database Relations Affected

### Delete Order Cascade
```
orders (deleted)
  └── daily_deliveries (deleted)
  └── delivery_assignments (deleted)
  └── order_pauses (deleted)
  └── order_meal_preferences (deleted)
  └── transactions (only pending/failed, deleted)
```

### Update Order Cascade
```
orders (updated: delevery_address, remarks)
users (updated: phone, address)
delivery_assignments (updated: delivery_partner_id)
daily_deliveries (updated: delivery_partner_id for future dates)
```

---

## Testing Recommendations

### Test Cases for Delete
1. ✅ Delete pending order without transactions
2. ✅ Delete cancelled order
3. ❌ Try to delete active order
4. ❌ Try to delete order with paid transaction
5. ❌ Try to delete order from different region

### Test Cases for Update
1. ✅ Update delivery address on active order
2. ✅ Change delivery partner (same region)
3. ❌ Try to update completed order
4. ❌ Try to assign partner from different region
5. ✅ Update multiple fields simultaneously
6. ✅ Verify future deliveries updated when partner changed

---

## Notes for Developers

- Both endpoints use transactions for atomic operations
- All validations happen before any database modifications
- Errors are descriptive to help frontend display appropriate messages
- Audit logging recommended for production (log all delete/update operations)
- Consider adding soft delete option for compliance requirements
