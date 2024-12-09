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
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
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
  const [, setError] = useState("");

  useEffect(() => {
    if (employee) {
      setFormData(employee);
    }
  }, [employee]);

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
    const { name, value, type, checked } = e.target as HTMLInputElement;
    let newValue = type === "checkbox" ? checked : value;

    if (name === "cpf") {
      newValue = formatCPF(value);
    } else if (name === "birthDate") {
      newValue = formatDate(value);
    }

    if (formData) {
      if (name.startsWith("address.")) {
        const addressField = name.split(".")[1];
        setFormData({
          ...formData,
          address: {
            ...formData.address,
            [addressField]: newValue,
          },
        });
      } else {
        setFormData({ ...formData, [name]: newValue });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData) {
      setError("Dados inválidos. Por favor, revise o formulário.");
      return;
    }
    const today = new Date();
    const birthDate = new Date(
      formData.birthDate.split("/").reverse().join("-")
    );
    const age = today.getFullYear() - birthDate.getFullYear();
    const isValidDate = birthDate < today && age >= 16 && age <= 75;

    if (!isValidDate) {
      setError(
        "A data de nascimento deve ser válida e indicar pelo menos 16 anos de idade."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const employeeRef = doc(db, "employees", formData.id);
      await updateDoc(employeeRef, {
        name: formData.name,
        cpf: formData.cpf,
        email: formData.email,
        role: formData.role,
        sector: formData.sector,
        birthDate: formData.birthDate,
        address: {
          street: formData.address.street,
          number: formData.address.number,
          complement: formData.address.complement || "",
          neighborhood: formData.address.neighborhood,
          city: formData.address.city,
          state: formData.address.state,
          zipCode: formData.address.zipCode,
        },
        isAdmin: formData.isAdmin,
        status: formData.status,
      });
      const response = await fetch("https://hour-sync-backend.vercel.app/update-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: formData.id,
          email: formData.email,
          name: formData.name,
          cpf: formData.cpf,
          birthDate: formData.birthDate,
          address: {
            street: formData.address.street,
            number: formData.address.number,
            complement: formData.address.complement || "",
            neighborhood: formData.address.neighborhood,
            city: formData.address.city,
            state: formData.address.state,  
            zipCode: formData.address.zipCode,
          },
          role: formData.role,
          sector: formData.sector,
          isAdmin: formData.isAdmin,
          status: formData.status,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao atualizar o e-mail.");
      }
      onEmployeeUpdated();
      onClose();
    } catch (error) {
      console.error("Erro ao atualizar funcionário:", error);
      setError("Erro ao atualizar funcionário. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-3xl w-full text-white">
        <h2 className="text-2xl font-semibold mb-4">Editar {formData?.name}</h2>
        {loading && (
          <p className="mb-4 text-center text-blue-400">
            Salvando alterações...
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <label className="text-sm text-gray-400 mb-1">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                value={formData?.name}
                onChange={handleInputChange}
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-400 mb-1">
                CPF <span className="text-red-500">*</span>
              </label>
              <input
                name="cpf"
                value={formData?.cpf}
                onChange={handleInputChange}
                maxLength={14}
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-400 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                name="email"
                value={formData?.email}
                onChange={handleInputChange}
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-400 mb-1">
                Data de Nascimento <span className="text-red-500">*</span>
              </label>
              <input
                name="birthDate"
                value={formData?.birthDate}
                onChange={handleInputChange}
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-400 mb-1">
                Rua <span className="text-red-500">*</span>
              </label>
              <input
                name="address.street"
                value={formData?.address.street}
                onChange={handleInputChange}
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-400 mb-1">
                Número <span className="text-red-500">*</span>
              </label>
              <input
                name="address.number"
                value={formData?.address.number}
                onChange={handleInputChange}
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
                value={formData?.address.complement || ""}
                onChange={handleInputChange}
                placeholder="Apto 101"
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-400 mb-1">
                Bairro <span className="text-red-500">*</span>
              </label>
              <input
                name="address.neighborhood"
                value={formData?.address.neighborhood}
                onChange={handleInputChange}
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-400 mb-1">
                Cidade <span className="text-red-500">*</span>
              </label>
              <input
                name="address.city"
                value={formData?.address.city}
                onChange={handleInputChange}
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-400 mb-1">
                Estado <span className="text-red-500">*</span>
              </label>
              <input
                name="address.state"
                value={formData?.address.state}
                onChange={handleInputChange}
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-400 mb-1">
                CEP <span className="text-red-500">*</span>
              </label>
              <input
                name="address.zipCode"
                value={formData?.address.zipCode}
                onChange={handleInputChange}
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-m text-gray-400 mb-1">
                Setor <span className="text-red-500">*</span>
              </label>
              <input
                name="sector"
                value={formData?.sector}
                onChange={handleInputChange}
                placeholder="Administração"
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-m text-gray-400 mb-1">
                Função <span className="text-red-500">*</span>
              </label>
              <input
                name="role"
                value={formData?.role}
                onChange={handleInputChange}
                placeholder="Gerente"
                required
                className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <input
              type="checkbox"
              name="isAdmin"
              checked={formData?.isAdmin}
              onChange={handleInputChange}
              className="form-checkbox h-5 w-5 text-blue-500"
            />
            <label className="ml-2 text-gray-300">Administrador</label>
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-green-600 py-2 rounded text-white font-bold ${
              loading ? "opacity-50 cursor-not-allowed" : "hover:bg-green-700"
            }`}
          >
            {loading ? "Salvando..." : "Salvar Alterações"}
          </button>
        </form>
        <button
          onClick={onClose}
          className="mt-4 w-full bg-red-600 py-2 rounded text-white font-bold hover:bg-red-700"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default EditEmployeeModal;
