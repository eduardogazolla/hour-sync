import { useState } from "react";
import { auth } from "../firebaseConfig";

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
    isAdmin: false,
  });
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false); // Estado para o loading

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, "") // Remove todos os caracteres que não são dígitos
      .replace(/(\d{3})(\d)/, "$1.$2") // Adiciona o primeiro ponto
      .replace(/(\d{3})(\d)/, "$1.$2") // Adiciona o segundo ponto
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2"); // Adiciona o traço
  };

  const formatDate = (value: string) => {
    return value
      .replace(/\D/g, "") // Remove caracteres não numéricos
      .replace(/(\d{2})(\d)/, "$1/$2") // Adiciona a barra após o dia
      .replace(/(\d{2})(\d)/, "$1/$2"); // Adiciona a barra após o mês
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;

    let formattedValue = value;

    // Aplica a formatação dependendo do campo
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
    setSuccessMessage("");

    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem!");
      return;
    }

    setLoading(true); // Ativar o loading

    try {
      const currentUser = auth.currentUser;
      const idToken = await currentUser?.getIdToken();

      const response = await fetch("http://localhost:5000/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          displayName: formData.name,
          cpf: formData.cpf,
          birthDate: formData.birthDate,
          address: formData.address,
          role: formData.role,
          isAdmin: formData.isAdmin,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao criar usuário");
      }

      // Sucesso na criação do usuário
      setSuccessMessage("Funcionário cadastrado com sucesso!");
      setFormData({
        name: "",
        cpf: "",
        email: "",
        password: "",
        confirmPassword: "",
        birthDate: "",
        address: "",
        role: "",
        isAdmin: false,
      });
      onEmployeeAdded();
    } catch (error: any) {
      console.error("Erro ao cadastrar funcionário:", error.message);
      setError("Erro ao cadastrar funcionário. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full text-white">
        <h2 className="text-2xl font-semibold mb-4">
          Cadastrar Novo Funcionário
        </h2>
        {error && (
          <div className="bg-red-600 p-2 rounded mb-4 text-center">{error}</div>
        )}
        {successMessage && (
          <div className="bg-green-600 p-2 rounded mb-4 text-center">
            {successMessage}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Nome"
            required
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="cpf"
            value={formData.cpf}
            onChange={handleInputChange}
            placeholder="CPF"
            maxLength={14}
            required
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Email"
            required
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Senha"
            required
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            placeholder="Confirmar Senha"
            required
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="birthDate"
            value={formData.birthDate}
            onChange={handleInputChange}
            placeholder="Data de Nascimento"
            maxLength={10}
            required
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="Endereço"
            required
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            required
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione o Cargo</option>
            <option value="Estagiário">Estagiário</option>
            <option value="Administrador">Administrador</option>
            <option value="Funcionário">Funcionário</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded font-bold transition ${
              loading
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
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
