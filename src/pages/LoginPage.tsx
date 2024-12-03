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
    <div className="h-screen flex flex-col justify-center items-center bg-gray-900">
      <div className="text-center mb-6">
    <div className="flex flex-col items-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-24 w-24 text-green-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v6l4 2m6-4A10 10 0 112 12a10 10 0 0116-8m-4 8h6"
        />
      </svg>
      <h1 className="text-6xl font-bold text-white mt-2">Hour Sync</h1>
    </div>
  </div>
      <div className="bg-gray-800 p-8 rounded-md shadow-md w-full max-w-sm">
        <h2 className="text-3xl font-bold text-center text-white mb-6">
          Login
        </h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <form onSubmit={handleLogin} className="space-y-4">
        <div className="flex flex-col mb-4">
        <label htmlFor="email" className="text-m text-gray-400 mb-1">
          Email
        </label>
          <input
            type="email"
            placeholder="email@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none"
          />
          </div>
          <div className="flex flex-col mb-4">
          <label htmlFor="password" className="text-m text-gray-400 mb-1">
            Senha
          </label>
          <input
            type="password"
            placeholder="••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none"
          />
          </div>
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
