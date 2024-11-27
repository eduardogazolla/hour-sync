import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Verifica na coleção `employees`
      const employeeDoc = await getDoc(doc(db, "employees", user.uid));
      if (employeeDoc.exists()) {
        const employeeData = employeeDoc.data();
        if (employeeData.isAdmin) {
          navigate("/admin"); // Redireciona para a página do administrador
        } else {
          navigate("/time-tracking"); // Redireciona para a página de controle de ponto
        }
        return;
      }

      setError("Usuário não encontrado na coleção de funcionários.");
    } catch (error: any) {
      console.error("Erro ao fazer login:", error.message);
      setError("Credenciais inválidas. Tente novamente.");
    }
  };

  return (
    <div className="h-screen flex justify-center items-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-md shadow-md w-full max-w-sm">
        <h2 className="text-3xl font-bold text-center text-white mb-6">
          Login
        </h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none"
          />
          <div className="text-right">
            <button
              type="button"
              onClick={() => navigate("/redefinir-senha")}
              className="text-blue-400 hover:text-blue-500 text-sm"
            >
              Esqueceu a senha?
            </button>
          </div>
          <button
            type="submit"
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;