# Testing Blue Technology API Endpoints

## Supabase provides auto-generated REST API!

Your API is already live at: `https://ureebvpesbkbholidlrn.supabase.co/rest/v1/`

## Get Your API Keys

1. Go to: https://supabase.com/dashboard/project/ureebvpesbkbholidlrn/settings/api
2. Copy:
   - **Project URL**: `https://ureebvpesbkbholidlrn.supabase.co`
   - **anon public key**: (long JWT token)
   - **service_role key**: (for admin operations)

## Test with cURL or Postman

### Get All Products
```bash
curl 'https://ureebvpesbkbholidlrn.supabase.co/rest/v1/products?select=*' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Get Single Product
```bash
curl 'https://ureebvpesbkbholidlrn.supabase.co/rest/v1/products?id=eq.PRODUCT_UUID&select=*' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Create Booking
```bash
curl -X POST 'https://ureebvpesbkbholidlrn.supabase.co/rest/v1/bookings' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "full_name": "Test User",
    "phone_number": "254712345678",
    "device_type": "Laptop",
    "device_model": "MacBook Pro",
    "issue_description": "Screen not working",
    "fulfillment_type": "pickup",
    "pickup_address": "Nairobi CBD"
  }'
```

### Get Orders by Phone
```bash
curl 'https://ureebvpesbkbholidlrn.supabase.co/rest/v1/orders?phone_number=eq.254712345678&select=*' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Update Order Status (Admin - use service_role key)
```bash
curl -X PATCH 'https://ureebvpesbkbholidlrn.supabase.co/rest/v1/orders?id=eq.ORDER_UUID' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"status": "dispatched"}'
```

## Supabase API Documentation

Full auto-generated API docs:
https://supabase.com/dashboard/project/ureebvpesbkbholidlrn/api

This shows ALL available endpoints for your tables!

## Summary

✅ **No custom backend needed!**
✅ Supabase REST API is already running
✅ All CRUD operations available
✅ Real-time subscriptions available
✅ Row Level Security already configured

**Next step**: Start building the frontend that connects to these endpoints!
