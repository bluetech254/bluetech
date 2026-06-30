# Blue Technology Backend API

FastAPI backend for testing Blue Technology endpoints with Swagger UI.

## Setup

1. Install Python dependencies:
```bash
cd backend
pip install -r requirements.txt
```

2. Configure environment:
- Copy `.env.example` to `.env`
- Add your Supabase keys from: https://supabase.com/dashboard/project/ureebvpesbkbholidlrn/settings/api

3. Run the server:
```bash
python main.py
```

## Access

- **API**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Endpoints

### Products
- `GET /api/v1/products` - List all products
- `GET /api/v1/products/{id}` - Get single product
- `POST /api/v1/products` - Create product
- `PUT /api/v1/products/{id}` - Update product
- `DELETE /api/v1/products/{id}` - Deactivate product

### Orders
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders` - List all orders
- `GET /api/v1/orders/{id}` - Get order details
- `GET /api/v1/orders/track/{phone}` - Track by phone
- `PUT /api/v1/orders/{id}/status` - Update status

### Bookings
- `POST /api/v1/bookings` - Create booking
- `GET /api/v1/bookings` - List all bookings
- `GET /api/v1/bookings/{id}` - Get booking details
- `GET /api/v1/bookings/track/{phone}` - Track by phone
- `PUT /api/v1/bookings/{id}/status` - Update status

### Delivery Zones
- `GET /api/v1/delivery-zones` - List zones

### Tracking
- `GET /api/v1/track/{phone}` - Get all orders + bookings for phone
