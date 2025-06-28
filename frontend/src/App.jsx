import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { AnimationProvider } from './components/animations/AnimationProvider';
import { CartProvider } from './context/CartContext';
import { AdminProvider } from './context/AdminContext';
import { CustomerProvider } from './context/CustomerContext';
import { WishlistProvider } from './context/WishlistContext';
import { OrderTrackingProvider } from './context/OrderTrackingContext';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartSidebar from './components/CartSidebar';

// Pages
import Home from './pages/Home';
import Shop from './pages/Shop';
import EnhancedShop from './pages/EnhancedShop';
import ProductDetails from './pages/ProductDetails';
import Services from './pages/Services';
import About from './pages/About';
import Contact from './pages/Contact';
import Cart from './pages/Cart';
import CheckoutSimple from './pages/CheckoutSimple';
import CustomerDashboard from './pages/CustomerDashboard';
import Wishlist from './pages/Wishlist';
import OrderTracking from './pages/OrderTracking';
import PaymentResult from './pages/PaymentResult';
// Admin Components
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './components/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Products from './pages/admin/Products';
import Categories from './pages/admin/Categories';
import Brands from './pages/admin/Brands';
import Orders from './pages/admin/Orders';
import Customers from './pages/admin/Customers';
import Forms from './pages/admin/Forms';
import Pages from './pages/admin/Pages';
import TrackingDashboard from './pages/admin/TrackingDashboard';
import TrackOrder from './pages/TrackOrder';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <ThemeProvider>
      <AnimationProvider>
        <LanguageProvider>
          <CartProvider>
            <CustomerProvider>
              <WishlistProvider>
                <OrderTrackingProvider>
                  <AdminProvider>
                <Router>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={
                <div className="min-h-screen flex flex-col">
                  <Navbar />
                  <main className="flex-grow">
                    <Home />
                  </main>
                  <Footer />
                  <CartSidebar />
                </div>
                    } />
                    <Route path="/shop" element={
                      <div className="min-h-screen flex flex-col">
                        <Navbar />
                        <main className="flex-grow">
                          <Shop />
                        </main>
                        <Footer />
                        <CartSidebar />
                      </div>
                    } />
                    <Route path="/boutique" element={
                      <div className="min-h-screen flex flex-col">
                        <Navbar />
                        <main className="flex-grow">
                          <EnhancedShop />
                        </main>
                        <Footer />
                        <CartSidebar />
                      </div>
                    } />
                    <Route path="/product/:id" element={
                      <div className="min-h-screen flex flex-col">
                        <Navbar />
                        <main className="flex-grow">
                          <ProductDetails />
                        </main>
                        <Footer />
                        <CartSidebar />
                      </div>
                    } />
                    <Route path="/services" element={
                      <div className="min-h-screen flex flex-col">
                        <Navbar />
                        <main className="flex-grow">
                          <Services />
                        </main>
                        <Footer />
                        <CartSidebar />
                      </div>
                    } />
                    <Route path="/about" element={
                      <div className="min-h-screen flex flex-col">
                        <Navbar />
                        <main className="flex-grow">
                          <About />
                        </main>
                        <Footer />
                        <CartSidebar />
                      </div>
                    } />
                    <Route path="/contact" element={
                      <div className="min-h-screen flex flex-col">
                        <Navbar />
                        <main className="flex-grow">
                          <Contact />
                        </main>
                        <Footer />
                        <CartSidebar />
                      </div>
                    } />
                    <Route path="/cart" element={
                      <div className="min-h-screen flex flex-col">
                        <Navbar />
                        <main className="flex-grow">
                          <Cart />
                        </main>
                        <Footer />
                        <CartSidebar />
                      </div>
                    } />
                    <Route path="/checkout" element={
                      <div className="min-h-screen flex flex-col">
                        <Navbar />
                        <main className="flex-grow">
                          <CheckoutSimple />
                        </main>
                        <Footer />
                        <CartSidebar />
                      </div>
                    } />
                    <Route path="/account" element={
                      <div className="min-h-screen flex flex-col">
                        <Navbar />
                        <main className="flex-grow">
                          <CustomerDashboard />
                        </main>
                        <Footer />
                        <CartSidebar />
                      </div>
                    } />
                    <Route path="/wishlist" element={
                      <div className="min-h-screen flex flex-col">
                        <Navbar />
                        <main className="flex-grow">
                          <Wishlist />
                        </main>
                        <Footer />
                        <CartSidebar />
                      </div>
                    } />
                    <Route path="/track-order" element={
                      <div className="min-h-screen flex flex-col">
                        <Navbar />
                        <main className="flex-grow">
                          <TrackOrder />
                        </main>
                        <Footer />
                        <CartSidebar />
                      </div>
                    } />
                    <Route path="/payment/success" element={
                      <div className="min-h-screen flex flex-col">
                        <Navbar />
                        <main className="flex-grow">
                          <PaymentResult />
                        </main>
                        <Footer />
                        <CartSidebar />
                      </div>
                    } />
                    <Route path="/payment/failed" element={
                      <div className="min-h-screen flex flex-col">
                        <Navbar />
                        <main className="flex-grow">
                          <PaymentResult />
                        </main>
                        <Footer />
                        <CartSidebar />
                      </div>
                    } />
                    <Route path="/payment/cancel" element={
                      <div className="min-h-screen flex flex-col">
                        <Navbar />
                        <main className="flex-grow">
                          <PaymentResult />
                        </main>
                        <Footer />
                        <CartSidebar />
                      </div>
                    } />


                    {/* Admin Routes */}
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/admin" element={
                      <ProtectedRoute>
                        <AdminLayout />
                      </ProtectedRoute>
                    }>
                      <Route index element={<Dashboard />} />
                      <Route path="dashboard" element={<Dashboard />} />
                      <Route path="products" element={<Products />} />
                      <Route path="categories" element={<Categories />} />
                      <Route path="brands" element={<Brands />} />
                      <Route path="orders" element={<Orders />} />
                      <Route path="tracking" element={<TrackingDashboard />} />
                      <Route path="customers" element={<Customers />} />
                      <Route path="forms" element={<Forms />} />
                      <Route path="pages" element={<Pages />} />
                      <Route path="users" element={<div className="p-6"><h1 className="text-2xl font-bold">Admin Users Management</h1><p className="text-gray-600">Coming soon...</p></div>} />
                      <Route path="settings" element={<div className="p-6"><h1 className="text-2xl font-bold">Settings</h1><p className="text-gray-600">Coming soon...</p></div>} />
                    </Route>
                  </Routes>
                </Router>
                  </AdminProvider>
                </OrderTrackingProvider>
              </WishlistProvider>
            </CustomerProvider>
          </CartProvider>
        </LanguageProvider>
      </AnimationProvider>
    </ThemeProvider>
  );
}

export default App;
