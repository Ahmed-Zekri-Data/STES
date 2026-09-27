import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { AnimationProvider } from './components/animations/AnimationProvider';
import { CartProvider } from './context/CartContext';
import { AdminProvider } from './context/AdminContext';
import { CustomerProvider } from './context/CustomerContext';
import { WishlistProvider } from './context/WishlistContext';
import { OrderTrackingProvider } from './context/OrderTrackingContext';
import { ShopSettingsProvider } from './context/ShopSettingsContext';

// Components
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import Footer from './components/Footer';
import CartSidebar from './components/CartSidebar';
import PageLoader from './components/PageLoader';
import ProtectedRoute from './components/ProtectedRoute';

// Browsing pages are in the main bundle, so the shop opens without waiting
import Home from './pages/Home';
import EnhancedShop from './pages/EnhancedShop';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';

// Everything else is downloaded when first opened. Shop visitors never
// download the admin.
const Services = lazy(() => import('./pages/Services'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Checkout = lazy(() => import('./pages/Checkout'));
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const TrackOrder = lazy(() => import('./pages/TrackOrder'));
const PaymentResult = lazy(() => import('./pages/PaymentResult'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));

const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Products = lazy(() => import('./pages/admin/Products'));
const Categories = lazy(() => import('./pages/admin/Categories'));
const Brands = lazy(() => import('./pages/admin/Brands'));
const Orders = lazy(() => import('./pages/admin/Orders'));
const Customers = lazy(() => import('./pages/admin/Customers'));
const Forms = lazy(() => import('./pages/admin/Forms'));
const Pages = lazy(() => import('./pages/admin/Pages'));
const TrackingDashboard = lazy(() => import('./pages/admin/TrackingDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));

// Shop pages share the header and footer; they stay in place while a page
// that is not loaded yet is being downloaded
const ShopLayout = () => (
  <div className="min-h-screen flex flex-col">
    <Navbar />
    <main className="flex-grow">
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </main>
    <Footer />
    <CartSidebar />
  </div>
);

// The shop used to live at /boutique; keep old links (and their filters) working
const RedirectToShop = () => {
  const { search } = useLocation();
  return <Navigate to={{ pathname: '/shop', search }} replace />;
};

function App() {
  return (
    <ThemeProvider>
      <AnimationProvider>
        <LanguageProvider>
          <ShopSettingsProvider>
          <CartProvider>
            <CustomerProvider>
              <WishlistProvider>
                <OrderTrackingProvider>
                  <AdminProvider>
                <Router>
                  <ErrorBoundary>
                  <Routes>
                    {/* Shop */}
                    <Route element={<ShopLayout />}>
                      <Route path="/" element={<Home />} />
                      <Route path="/shop" element={<EnhancedShop />} />
                      <Route path="/product/:id" element={<ProductDetails />} />
                      <Route path="/services" element={<Services />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/cart" element={<Cart />} />
                      <Route path="/checkout" element={<Checkout />} />
                      <Route path="/account" element={<CustomerDashboard />} />
                      <Route path="/wishlist" element={<Wishlist />} />
                      <Route path="/track-order" element={<TrackOrder />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/verify-email" element={<VerifyEmail />} />
                      <Route path="/payment/success" element={<PaymentResult />} />
                      <Route path="/payment/failed" element={<PaymentResult />} />
                      <Route path="/payment/cancel" element={<PaymentResult />} />
                    </Route>
                    <Route path="/boutique" element={<RedirectToShop />} />

                    {/* Admin Routes */}
                    <Route path="/admin/login" element={
                      <Suspense fallback={<PageLoader fullScreen />}>
                        <AdminLogin />
                      </Suspense>
                    } />
                    <Route path="/admin" element={
                      <ProtectedRoute>
                        <Suspense fallback={<PageLoader fullScreen />}>
                          <AdminLayout />
                        </Suspense>
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
                      <Route path="users" element={<AdminUsers />} />
                      <Route path="settings" element={<AdminSettings />} />
                    </Route>
                  </Routes>
                  </ErrorBoundary>
                </Router>
                  </AdminProvider>
                </OrderTrackingProvider>
              </WishlistProvider>
            </CustomerProvider>
          </CartProvider>
          </ShopSettingsProvider>
        </LanguageProvider>
      </AnimationProvider>
    </ThemeProvider>
  );
}

export default App;
