import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAdminCheck } from "../hooks/useAdminCheck";

const AdminRoute = ({ children }: { children: ReactNode }) => {
  const isAdmin = useAdminCheck();

  return isAdmin ? children : <Navigate to="/time-tracking" />;
};

export default AdminRoute;
