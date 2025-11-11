# Quick Reference - Fleet Manager Order Endpoints

## 🗑️ Delete Order

```http
DELETE /fleet-manager/delete-order/:orderId
Authorization: Bearer <JWT_TOKEN>
```

### ✅ Allowed
- Pending orders
- Cancelled orders

### ❌ Not Allowed
- Active orders
- Paused orders
- Completed orders
- Orders with paid transactions

---

## ✏️ Edit Order (Enhanced)

```http
PATCH /fleet-manager/update-customer-order/:orderId
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "delivery_address": "string (optional)",
  "phone": "string (optional)",
  "address": "string (optional)",
  "delivery_partner_id": "uuid (optional)",
  "remarks": "string (optional)"
}
```

### ✅ Allowed
- Active orders
- Pending orders
- Paused orders

### ❌ Not Allowed
- Completed orders
- Cancelled orders

### ⚠️ Important
- Delivery partner must be in same region as customer
- Changing partner updates future deliveries automatically
- Past deliveries remain unchanged

---

## Common Error Codes

| Code | Meaning |
|------|---------|
| 400 | Invalid status, region mismatch, or paid transaction |
| 404 | Order or delivery partner not found |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Wrong region or insufficient permissions |

---

## Data That Gets Updated

### Delete Operation
- ❌ Orders
- ❌ Daily deliveries (all)
- ❌ Delivery assignments (all)
- ❌ Order pauses (all)
- ❌ Order preferences (all)
- ❌ Pending/failed transactions

### Edit Operation
- ✏️ Order (delivery_address, remarks)
- ✏️ User (phone, address)
- ✏️ Delivery assignments (partner_id)
- ✏️ Future daily deliveries (partner_id)

---

## Quick Validation Checklist

### Before Delete
- [ ] Order status is pending or cancelled?
- [ ] No paid transactions exist?
- [ ] Fleet manager in same region?

### Before Edit
- [ ] Order status is active, pending, or paused?
- [ ] If changing partner: same region as customer?
- [ ] Order not completed or cancelled?

---

## Tips

💡 **Tip 1:** Always cancel an active order before deleting it

💡 **Tip 2:** Completed orders cannot be edited - they're archived

💡 **Tip 3:** Changing delivery partner updates all future deliveries, not just one

💡 **Tip 4:** Delivery address changes won't affect user's permanent address

💡 **Tip 5:** Remarks can be updated anytime (even with paid transactions)
