import { useState } from "react";
import { registerUser } from "../services/authService";

const AdminDashboard = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registerUser(email, password, isAdmin);
      setMessage(`Usuário ${isAdmin ? "administrador" : "padrão"} criado com sucesso!`);
      setEmail("");
      setPassword("");
      setIsAdmin(false);
    } catch (error) {
      setMessage("Erro ao criar usuário.");
      console.error(error);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-100">
      <h2 className="text-2xl font-bold mb-4">Criar Usuário</h2>
      <form onSubmit={handleRegister} className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border mb-3 rounded"
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border mb-3 rounded"
          required
        />
        <label className="flex items-center space-x-2 mb-4">
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={() => setIsAdmin(!isAdmin)}
          />
          <span>Conceder privilégios de administrador</span>
        </label>
        <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded">
          Criar Usuário
        </button>
      </form>
      {message && <p className="mt-4 text-center">{message}</p>}
    </div>
  );
};

export default AdminDashboard;
