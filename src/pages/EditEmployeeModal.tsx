import { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";

interface Employee {
  id: string;
  name: string;
  cpf: string;
  email: string;
  password: string;
  status: string;
  role: string;
  birthDate: string;
  address: string;
}

interface EditEmployeeModalProps {
  employee: Employee | null; // Permite que o modal inicie vazio
  onClose: () => void;
  onEmployeeUpdated: () => void;
}

const EditEmployeeModal = ({
  employee,
  onClose,
  onEmployeeUpdated,
}: EditEmployeeModalProps) => {
  const [formData, setFormData] = useState<Employee | null>(employee);

  useEffect(() => {
    if (employee) {
      setFormData(employee); // Atualiza os dados ao abrir o modal
    }
  }, [employee]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (formData) {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      try {
        const employeeRef = doc(db, "employees", formData.id);
        await updateDoc(employeeRef, {...formData}); // Atualiza o Firestore
        onEmployeeUpdated(); // Atualiza a lista de funcionários
        onClose(); // Fecha o modal após salvar
      } catch (error) {
        console.error("Erro ao atualizar funcionário:", error);
      }
    }
  };

  if (!formData) {
    return null; // Retorna nada se o modal abrir sem dados
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full text-white">
        <h2 className="text-2xl font-semibold mb-4">Editar {formData.name}</h2>
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
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Senha"
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
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="Endereço Completo"
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
            Salvar Alterações
          </button>
        </form>
        <button
          onClick={onClose}
          className="mt-4 w-full bg-red-600 py-2 rounded hover:bg-red-700 transition text-white font-bold"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default EditEmployeeModal;
