import { useState } from "react";

const EmployeeFormModal = ({ onClose, onEmployeeAdded }: any) => {
  const [formData, setFormData] = useState({
    name: "",
    cpf: "",
    uid: "",
    email: "",
    password: "",
    confirmPassword: "",
    birthDate: "",
    address: {
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: "",
    },
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
    const checked =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;

    if (name.startsWith("address.")) {
      const addressField = name.split(".")[1];
      setFormData((prevState) => ({
        ...prevState,
        address: {
          ...prevState.address,
          [addressField]: value,
        },
      }));
    } else {
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
    }
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validação das senhas
    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem!");
      return;
    }

    // Validação da data de nascimento
    const today = new Date();
    const birthDate = new Date(
      formData.birthDate.split("/").reverse().join("-")
    ); // Converte para o formato YYYY-MM-DD

    const age = today.getFullYear() - birthDate.getFullYear();
    const isValidDate =
      birthDate < today && // Data de nascimento no passado
      age >= 16 && // Pelo menos 16 anos de idade
      age <= 75; // No máximo 75 anos

    if (!isValidDate) {
      setError(
        "A data de nascimento deve ser válida e indicar pelo menos 16 anos de idade."
      );
      return;
    }

    setLoading(true);

    try {
      // Envia para o backend para criação de usuário
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/create-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
          sector: formData.sector,
        }),
      });

      const data = await response.json();

      if (response.status === 201) {
        // Depois de criar o usuário, chama o callback para atualizar a lista de funcionários
        onEmployeeAdded();
        onClose(); // Fecha o modal
      } else {
        setError(data.error || "Erro ao criar o usuário.");
      }
    } catch (error: any) {
      console.error("Erro ao cadastrar funcionário:", error.message);
      setError("Erro ao cadastrar funcionário. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-5xl w-full text-white">
        <h2 className="text-2xl font-semibold mb-4">Cadastrar Novo Funcionário</h2>
        {error && (
          <div className="bg-red-600 p-2 rounded mb-4 text-center">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Coluna 1 */}
            <div className="flex flex-col">
              <label htmlFor="name" className="text-m text-gray-400 mb-1">
                Nome <span className="text-red-500">*</span>
              </label>
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
              <label htmlFor="cpf" className="text-m text-gray-400 mb-1">
                CPF <span className="text-red-500">*</span>
              </label>
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
              <label htmlFor="email" className="text-m text-gray-400 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="email@exemplo.com"
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Campos restantes... */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <label htmlFor="password" className="text-m text-gray-400 mb-1">
                Senha <span className="text-red-500">*</span>
              </label>
              <input
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="********"
                type="password"
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label
                htmlFor="confirmPassword"
                className="text-m text-gray-400 mb-1"
              >
                Confirmar Senha <span className="text-red-500">*</span>
              </label>
              <input
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                type="password"
                placeholder="********"
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="birthDate" className="text-m text-gray-400 mb-1">
                Data de Nascimento <span className="text-red-500">*</span>
              </label>
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

            {/* Coluna 3 */}
            <div className="flex flex-col">
              <label htmlFor="address" className="text-m text-gray-400 mb-1">
                Rua <span className="text-red-500">*</span>
              </label>
              <input
                name="address.street"
                value={formData.address.street}
                onChange={handleInputChange}
                placeholder="Av. Brasil"
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="number" className="text-m text-gray-400 mb-1">
                Número <span className="text-red-500">*</span>
              </label>
              <input
                name="address.number"
                value={formData.address.number}
                onChange={handleInputChange}
                placeholder="1234"
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="complement" className="text-m text-gray-400 mb-1">
                Complemento
              </label>
              <input
                name="address.complement"
                value={formData.address.complement || ""}
                onChange={handleInputChange}
                placeholder="Apto 101"
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="bairro" className="text-m text-gray-400 mb-1">
                Bairro <span className="text-red-500">*</span>
              </label>
              <input
                name="address.neighborhood"
                value={formData.address.neighborhood}
                onChange={handleInputChange}
                placeholder="Centro"
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="city" className="text-m text-gray-400 mb-1">
                Cidade <span className="text-red-500">*</span>
              </label>
              <input
                name="address.city"
                value={formData.address.city}
                onChange={handleInputChange}
                placeholder="São Paulo"
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="state" className="text-m text-gray-400 mb-1">
                Estado <span className="text-red-500">*</span>
              </label>
              <input
                name="address.state"
                value={formData.address.state}
                onChange={handleInputChange}
                placeholder="SP"
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="cep" className="text-m text-gray-400 mb-1">
                CEP <span className="text-red-500">*</span>
              </label>
              <input
                name="address.zipCode"
                value={formData.address.zipCode}
                onChange={handleInputChange}
                maxLength={8}
                placeholder="12345-678"
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="sector" className="text-m text-gray-400 mb-1">
                Setor <span className="text-red-500">*</span>
              </label>
              <input
                name="sector"
                value={formData.sector}
                onChange={handleInputChange}
                placeholder="Administração"
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="role" className="text-m text-gray-400 mb-1">
                Função <span className="text-red-500">*</span>
              </label>
              <input
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                placeholder="Gerente"
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 mt-4">
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
