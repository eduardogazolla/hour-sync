import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

interface User {
  uid: string;
  email: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      if (firebaseUser) {
        try {
          // Primeiro verifica na coleção `users`
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              isAdmin: userData.isAdmin || false,
            });
          } else {
            // Caso não encontre em `users`, verifica na coleção `employees`
            const employeeDoc = await getDoc(
              doc(db, "employees", firebaseUser.uid)
            );
            if (employeeDoc.exists()) {
              const employeeData = employeeDoc.data();
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email || "",
                isAdmin: false, // Funcionários da coleção `employees` não são admin
              });
            } else {
              console.error(
                "Usuário autenticado não encontrado em nenhuma coleção."
              );
              setUser(null);
            }
          }
        } catch (error) {
          console.error("Erro ao buscar dados do usuário no Firestore:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};
