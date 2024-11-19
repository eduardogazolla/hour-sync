import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuth, AuthProvider } from "./contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import TimeTrackingPage from "./pages/TimeTrackingPage";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

function AppRoutes() {
  const { user, loading } = useAuth();

  // Exibir um estado de carregamento enquanto verifica autenticação
  if (loading) {
    return <div className="text-white text-center mt-8">Carregando...</div>;
  }

  return (
    <Routes>
      {/* Página de login */}
      <Route
        path="/"
        element={
          user ? (
            <Navigate to={user.isAdmin ? "/admin" : "/time-tracking"} />
          ) : (
            <LoginPage />
          )
        }
      />

      {/* Página do admin */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />

      {/* Página de controle de ponto */}
      <Route
        path="/time-tracking"
        element={
          <ProtectedRoute>
            <TimeTrackingPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
