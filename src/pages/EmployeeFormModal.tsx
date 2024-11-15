import { useState } from "react";
import { db } from "../firebaseConfig";
import { collection, addDoc } from "firebase/firestore";

interface EmployeeFormModalProps {
  onClose: () => void;
  onEmployeeAdded: () => void;
}

const EmployeeFormModal = ({
  onClose,
  onEmployeeAdded,
}: EmployeeFormModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    cpf: "",
    email: "",
    confirmEmail: "",
    password: "",
    confirmPassword: "",
    birthDate: "",
    company: "",
    role: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "employees"), formData);
      onEmployeeAdded();
      onClose();
    } catch (error) {
      console.error("Erro ao adicionar funcionário:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full text-white">
        <h2 className="text-2xl font-semibold mb-4">
          Cadastrar Novo Funcionário
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Nome"
            required
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none"
          />
          <input
            name="cpf"
            value={formData.cpf}
            onChange={handleInputChange}
            placeholder="CPF"
            required
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none"
          />
          <input
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Email"
            required
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none"
          />
          <input
            name="confirmEmail"
            value={formData.confirmEmail}
            onChange={handleInputChange}
            placeholder="Confirmar Email"
            required
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none"
          />
          <input
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Senha"
            required
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none"
          />
          <input
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            placeholder="Confirmar Senha"
            required
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none"
          />
          <input
            name="birthDate"
            value={formData.birthDate}
            onChange={handleInputChange}
            placeholder="Data de Nascimento"
            required
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none"
          />
          <input
            name="company"
            value={formData.company}
            onChange={handleInputChange}
            placeholder="Empresa"
            required
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none"
          />
          <select
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            required
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none"
          >
            <option value="">Selecione um cargo</option>
            <option value="Estagiário">Estagiário</option>
            <option value="Administrador">Administrador</option>
          </select>
          <button
            type="submit"
            className="w-full bg-green-600 py-2 rounded hover:bg-green-700 transition text-white font-bold"
          >
            Cadastrar Novo Funcionário
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
