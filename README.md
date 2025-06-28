# STES - Swimming Pool Supply E-commerce Website

A complete e-commerce website for swimming pool supplies and installation services in Tunisia, built with React (frontend) and Node.js/Express (backend).

## 🌟 Features

### Frontend (React + Tailwind CSS)
- **Responsive Design**: Mobile-first design optimized for all devices
- **Multi-language Support**: Arabic, French, and English with RTL support
- **Product Catalog**: Browse products by categories (Motors, Filters, Chemicals)
- **Shopping Cart**: Add/remove items, quantity management
- **Checkout Process**: Complete order placement with customer details
- **Service Requests**: Quote request forms for installation services
- **Admin Dashboard**: Product and order management interface

### Backend (Node.js + Express + MongoDB)
- **RESTful API**: Complete API for products, orders, and forms
- **Authentication**: JWT-based admin authentication
- **Database**: MongoDB with Mongoose ODM
- **Security**: Helmet, rate limiting, input validation
- **File Upload**: Support for product images
- **Email Integration**: Contact form submissions

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd STES
```

2. **Install root dependencies**
```bash
npm install
```

3. **Install frontend dependencies**
```bash
cd frontend
npm install
cd ..
```

4. **Install backend dependencies**
```bash
cd backend
npm install
cd ..
```

5. **Environment Setup**
Create a `.env` file in the root directory:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/stes-ecommerce

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Admin Configuration
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@piscinefacile.tn
DEFAULT_ADMIN_PASSWORD=admin123456
```

6. **Database Setup**
Start MongoDB and run the seed script:
```bash
# Make sure MongoDB is running
cd backend
npm run seed
```

7. **Start the application**
```bash
# From the root directory
npm run dev
```

This will start:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## 📁 Project Structure

```
STES/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── context/         # React context providers
│   │   ├── pages/           # Page components
│   │   └── pages/admin/     # Admin panel pages
│   ├── public/              # Static assets
│   └── package.json
├── backend/                 # Node.js backend
│   ├── models/              # MongoDB models
│   ├── routes/              # API routes
│   ├── middleware/          # Custom middleware
│   ├── scripts/             # Utility scripts
│   └── package.json
├── .env                     # Environment variables
└── package.json            # Root package.json
```

## 🔧 Available Scripts

### Root Level
- `npm run dev` - Start both frontend and backend in development mode
- `npm run dev:frontend` - Start only frontend
- `npm run dev:backend` - Start only backend
- `npm run build` - Build frontend for production
- `npm run install:all` - Install all dependencies

### Backend
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run seed` - Seed database with sample data

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🛠 API Endpoints

### Products
- `GET /api/products` - Get all products (with filtering)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Admin)
- `PUT /api/products/:id` - Update product (Admin)
- `DELETE /api/products/:id` - Delete product (Admin)

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get all orders (Admin)
- `GET /api/orders/:id` - Get single order
- `PUT /api/orders/:id/status` - Update order status (Admin)

### Forms
- `POST /api/forms/contact` - Submit contact form
- `POST /api/forms/quote` - Submit quote request
- `GET /api/forms` - Get all submissions (Admin)

### Authentication
- `POST /api/auth/login` - Admin login
- `GET /api/auth/me` - Get current admin info
- `PUT /api/auth/profile` - Update admin profile

## 👤 Admin Access

### Default Admin Credentials
- **Username**: admin
- **Password**: admin123456
- **Access URL**: http://localhost:5173/admin

### Admin Features
- Dashboard with statistics
- Product management (CRUD operations)
- Order management and status updates
- Form submission management
- User management (for super admins)

## 🌍 Multi-language Support

The website supports three languages:
- **French** (default)
- **Arabic** (with RTL support)
- **English**

Language switching is available in the navigation bar.

## 💰 Payment Methods

The checkout process supports:
- Cash on Delivery (COD)
- Bank Transfer
- Paymee.tn (Tunisian payment gateway)

## 📱 Mobile Responsiveness

The website is fully responsive and optimized for:
- Mobile phones (320px and up)
- Tablets (768px and up)
- Desktop computers (1024px and up)

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS protection
- Helmet.js security headers

## 🚀 Deployment

### Frontend (Vercel)
1. Build the frontend: `cd frontend && npm run build`
2. Deploy to Vercel or any static hosting service

### Backend (Heroku/Railway)
1. Set environment variables on your hosting platform
2. Deploy the backend folder
3. Ensure MongoDB connection is configured

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-production-jwt-secret
FRONTEND_URL=your-frontend-domain
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support or questions about this project:
- Email: info@piscinefacile.tn
- Phone: +216 12 345 678
- WhatsApp: +216 12 345 678

## 🔄 Future Enhancements

- Real-time notifications
- Advanced analytics dashboard
- Inventory management
- Customer accounts and order history
- Email marketing integration
- Mobile app development
- Payment gateway integration
- Multi-vendor support

---

**Built with ❤️ for the Tunisian swimming pool industry**
