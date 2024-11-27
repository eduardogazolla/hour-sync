import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

interface Employee {
  id: string;
  name: string;
  cpf: string;
  email: string;
  role: string;
  sector: string;
  birthDate: string;
  address: string;
  status: string;
  isAdmin: boolean;
}

interface EditEmployeeModalProps {
  employee: Employee | null;
  onClose: () => void;
  onEmployeeUpdated: () => void;
}

const EditEmployeeModal = ({
  employee,
  onClose,
  onEmployeeUpdated,
}: EditEmployeeModalProps) => {
  const [formData, setFormData] = useState<Employee | null>(employee);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData(employee);
    }
  }, [employee]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    const newValue = type === "checkbox" ? checked : value;

    if (formData) {
      setFormData({ ...formData, [name]: newValue });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData) {
      setLoading(true);
      try {
        const employeeRef = doc(db, "employees", formData.id);
        await updateDoc(employeeRef, { ...formData });

        onEmployeeUpdated();
        onClose();
      } catch (error) {
        console.error("Erro ao atualizar funcionário:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!formData) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-lg w-full text-white">
        <h2 className="text-2xl font-semibold mb-4">Editar {formData.name}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label htmlFor="name" className="text-m text-gray-400 mb-1">Nome</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Nome"
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
                placeholder="CPF"
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
                placeholder="Email"
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
                placeholder="Data de Nascimento"
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="address" className="text-m text-gray-400 mb-1">Endereço Completo</label>
              <input
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Endereço Completo"
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
                placeholder="Função"
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
                placeholder="Setor"
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
              className="form-checkbox h-5 w-5 text-green-600 focus:ring-2 focus:ring-blue-500 rounded"
            />
            <label className="text-white">Administrador</label>
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-green-600 py-2 rounded transition text-white font-bold ${
              loading ? "opacity-50 cursor-not-allowed" : "hover:bg-green-700"
            }`}
          >
            {loading ? "Salvando..." : "Salvar Alterações"}
          </button>
        </form>
        <button
          onClick={onClose}
          disabled={loading}
          className="mt-4 w-full bg-red-600 py-2 rounded hover:bg-red-700 transition text-white font-bold"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
  
};

export default EditEmployeeModal;
