import { useState } from "react";
import { auth, db } from "../firebaseConfig";
import { doc, setDoc } from "firebase/firestore";

const EmployeeFormModal = ({ onClose, onEmployeeAdded }: any) => {
  const [formData, setFormData] = useState({
    name: "",
    cpf: "",
    email: "",
    password: "",
    confirmPassword: "",
    birthDate: "",
    address: "",
    role: "",
    sector: "",
    isAdmin: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const formatDate = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "$1/$2")
      .replace(/(\d{2})(\d)/, "$1/$2");
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;
    let formattedValue = value;

    if (name === "cpf") {
      formattedValue = formatCPF(value);
    } else if (name === "birthDate") {
      formattedValue = formatDate(value);
    }

    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : formattedValue,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem!");
      return;
    }

    setLoading(true);

    try {
      const newEmployeeId = auth.currentUser?.uid || crypto.randomUUID();

      const employeeRef = doc(db, "employees", newEmployeeId);
      await setDoc(employeeRef, {
        uid: newEmployeeId,
        email: formData.email,
        name: formData.name,
        cpf: formData.cpf,
        birthDate: formData.birthDate,
        address: formData.address,
        role: formData.role,
        sector: formData.sector,
        isAdmin: formData.isAdmin,
        status: "ativo",
      });

      onEmployeeAdded();
      onClose();
    } catch (error: any) {
      console.error("Erro ao cadastrar funcionário:", error.message);
      setError("Erro ao cadastrar funcionário. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-lg w-full text-white">
        <h2 className="text-2xl font-semibold mb-4">Cadastrar Novo Funcionário</h2>
        {error && <div className="bg-red-600 p-2 rounded mb-4 text-center">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label htmlFor="name" className="text-m text-gray-400 mb-1">Nome</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="João Pedro"
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="cpf" className="text-m text-gray-400 mb-1">CPF</label>
              <input
                name="cpf"
                value={formData.cpf}
                onChange={handleInputChange}
                placeholder="123.456.789-10"
                maxLength={14}
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="email" className="text-m text-gray-400 mb-1">Email</label>
              <input
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="email@exemplo.com"
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="password" className="text-m text-gray-400 mb-1">Senha</label>
              <input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••"
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="confirmPassword" className="text-m text-gray-400 mb-1">Confirmar Senha</label>
              <input
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="••••••"
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="birthDate" className="text-m text-gray-400 mb-1">Data de Nascimento</label>
              <input
                name="birthDate"
                value={formData.birthDate}
                onChange={handleInputChange}
                placeholder="01/01/2000"
                maxLength={10}
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="address" className="text-m text-gray-400 mb-1">Endereço</label>
              <input
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Av. Brasil, 1234"
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="role" className="text-m text-gray-400 mb-1">Função</label>
              <input
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                placeholder="Gerente"
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="sector" className="text-m text-gray-400 mb-1">Setor</label>
              <input
                name="sector"
                value={formData.sector}
                onChange={handleInputChange}
                placeholder="Escritório"
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="isAdmin"
              checked={formData.isAdmin}
              onChange={handleInputChange}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <label htmlFor="isAdmin">Administrador</label>
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded font-bold transition ${
              loading ? "bg-gray-600 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {loading ? "Cadastrando..." : "Cadastrar Novo Funcionário"}
          </button>
        </form>
        <button
          onClick={onClose}
          className="mt-4 w-full bg-red-600 py-2 rounded hover:bg-red-700 transition text-white font-bold"
        >
          Fechar
        </button>
      </div>
    </div>
  );
  
};

export default EmployeeFormModal;
