import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Package, 
  ShoppingCart, 
  MessageSquare, 
  Users, 
  TrendingUp,
  LogOut,
  Settings,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [adminUser, setAdminUser] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('adminToken');
    const user = localStorage.getItem('adminUser');
    
    if (!token || !user) {
      navigate('/admin');
      return;
    }
    
    setAdminUser(JSON.parse(user));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin');
  };

  // Sample data
  const stats = {
    totalProducts: 45,
    totalOrders: 128,
    pendingOrders: 12,
    totalRevenue: 15420,
    newMessages: 8
  };

  const recentOrders = [
    { id: 'ORD-001', customer: 'Ahmed Ben Ali', total: 850, status: 'pending', date: '2024-01-15' },
    { id: 'ORD-002', customer: 'Fatma Trabelsi', total: 1200, status: 'confirmed', date: '2024-01-15' },
    { id: 'ORD-003', customer: 'Mohamed Gharbi', total: 450, status: 'shipped', date: '2024-01-14' },
    { id: 'ORD-004', customer: 'Leila Mansouri', total: 680, status: 'delivered', date: '2024-01-14' },
  ];

  const recentProducts = [
    { id: 1, name: 'Moteur de Piscine 1.5HP', price: 850, stock: 15, category: 'motors' },
    { id: 2, name: 'Filtre à Sable Premium', price: 450, stock: 20, category: 'filters' },
    { id: 3, name: 'Chlore Granulé 5kg', price: 65, stock: 50, category: 'chemicals' },
    { id: 4, name: 'Pompe à Chaleur 12kW', price: 2500, stock: 5, category: 'motors' },
  ];

  const navigation = [
    { id: 'dashboard', name: 'Tableau de bord', icon: BarChart3 },
    { id: 'products', name: 'Produits', icon: Package },
    { id: 'orders', name: 'Commandes', icon: ShoppingCart },
    { id: 'messages', name: 'Messages', icon: MessageSquare },
    { id: 'users', name: 'Utilisateurs', icon: Users },
    { id: 'settings', name: 'Paramètres', icon: Settings },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Package className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Produits</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalProducts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <ShoppingCart className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Commandes</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">En attente</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pendingOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <BarChart3 className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Revenus</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalRevenue} TND</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <MessageSquare className="w-8 h-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Messages</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.newMessages}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders and Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Commandes récentes</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{order.id}</p>
                    <p className="text-sm text-gray-600">{order.customer}</p>
                    <p className="text-sm text-gray-500">{order.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{order.total} TND</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Products */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Produits populaires</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">{product.category}</p>
                    <p className="text-sm text-gray-500">Stock: {product.stock}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{product.price} TND</p>
                    <div className="flex space-x-2 mt-2">
                      <button className="text-blue-600 hover:text-blue-800">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-800">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-800">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'products':
        return <div className="bg-white rounded-lg shadow p-6"><h2 className="text-xl font-semibold">Gestion des Produits</h2><p className="text-gray-600 mt-2">Interface de gestion des produits à implémenter</p></div>;
      case 'orders':
        return <div className="bg-white rounded-lg shadow p-6"><h2 className="text-xl font-semibold">Gestion des Commandes</h2><p className="text-gray-600 mt-2">Interface de gestion des commandes à implémenter</p></div>;
      case 'messages':
        return <div className="bg-white rounded-lg shadow p-6"><h2 className="text-xl font-semibold">Messages</h2><p className="text-gray-600 mt-2">Interface de gestion des messages à implémenter</p></div>;
      case 'users':
        return <div className="bg-white rounded-lg shadow p-6"><h2 className="text-xl font-semibold">Gestion des Utilisateurs</h2><p className="text-gray-600 mt-2">Interface de gestion des utilisateurs à implémenter</p></div>;
      case 'settings':
        return <div className="bg-white rounded-lg shadow p-6"><h2 className="text-xl font-semibold">Paramètres</h2><p className="text-gray-600 mt-2">Interface des paramètres à implémenter</p></div>;
      default:
        return renderDashboard();
    }
  };

  if (!adminUser) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg">
          <div className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">P</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
                <p className="text-sm text-gray-600">PiscineFacile.tn</p>
              </div>
            </div>
          </div>

          <nav className="mt-6">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center px-6 py-3 text-left hover:bg-gray-50 transition-colors ${
                    activeTab === item.id ? 'bg-primary-50 text-primary-600 border-r-2 border-primary-600' : 'text-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </button>
              );
            })}
          </nav>

          <div className="absolute bottom-0 w-64 p-6 border-t border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">{adminUser.fullName}</p>
                <p className="text-xs text-gray-600">{adminUser.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-red-600 hover:text-red-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Déconnexion</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              {navigation.find(item => item.id === activeTab)?.name || 'Tableau de bord'}
            </h1>
            <p className="text-gray-600">
              Bienvenue dans votre espace d'administration, {adminUser.fullName}
            </p>
          </div>

          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
