import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth(); // Supondo que você tenha um hook para acessar o contexto de autenticação

  return user ? children : <Navigate to="/" />;
};

export default ProtectedRoute;
