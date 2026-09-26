import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';

const Fallback = ({ homePath, homeLabel }) => (
  <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
    <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-lg p-8">
      <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-red-500" />
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Un problème est survenu</h1>
      <p className="text-gray-600 mb-6">
        Cette page n'a pas pu s'afficher. Réessayez, ou revenez plus tard si le problème continue.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Réessayer
        </button>
        <Link
          to={homePath}
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
        >
          <Home className="w-4 h-4 mr-2" />
          {homeLabel}
        </Link>
      </div>
    </div>
  </div>
);

// Catches errors thrown while rendering the pages inside it, so one broken
// page shows a message instead of blanking the whole app.
class Boundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Page error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <Fallback homePath={this.props.homePath} homeLabel={this.props.homeLabel} />;
    }
    return this.props.children;
  }
}

// Resets on navigation, so leaving a broken page brings the app back
const ErrorBoundary = ({ children, homePath = '/', homeLabel = "Retour à l'accueil" }) => {
  const { pathname } = useLocation();
  return (
    <Boundary key={pathname} homePath={homePath} homeLabel={homeLabel}>
      {children}
    </Boundary>
  );
};

export default ErrorBoundary;
