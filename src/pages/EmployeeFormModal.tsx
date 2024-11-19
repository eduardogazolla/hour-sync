import { useState } from "react";
import { db } from "../firebaseConfig";
import { collection, doc, setDoc } from "firebase/firestore";

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
    address: "",
    role: "",
    isAdmin: false,
  });
  const [error, setError] = useState("");

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

    let formattedValue = value;

    if (type === "checkbox") {
      setFormData({ ...formData, [name]: checked });
      return;
    }

    if (name === "cpf") {
      formattedValue = formatCPF(value);
    } else if (name === "birthDate") {
      formattedValue = formatDate(value);
    }

    setFormData({ ...formData, [name]: formattedValue });
  };

  const createFirebaseUser = async (email: string, password: string) => {
    const apiKey = process.env.REACT_APP_FIREBASE_API_KEY; // Substitua pelo seu API key
    const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error.message || "Erro ao criar usuário");
    }

    const data = await response.json();
    return data.localId; // UID do usuário criado
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem!");
      return;
    }

    if (formData.email !== formData.confirmEmail) {
      setError("Os emails não coincidem!");
      return;
    }

    try {
      // Cria o usuário no Firebase Authentication sem alterar o estado atual
      const uid = await createFirebaseUser(formData.email, formData.password);

      // Adiciona o usuário no Firestore
      await setDoc(doc(db, "employees", uid), {
        uid,
        name: formData.name,
        cpf: formData.cpf,
        email: formData.email,
        birthDate: formData.birthDate,
        address: formData.address,
        role: formData.role,
        isAdmin: formData.isAdmin,
        status: "ativo",
      });

      onEmployeeAdded();
      onClose();
    } catch (error: any) {
      console.error("Erro ao cadastrar funcionário:", error.message);
      setError(
        error.message === "EMAIL_EXISTS"
          ? "Email já está em uso. Tente outro."
          : "Erro ao cadastrar funcionário. Verifique os dados e tente novamente."
      );
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
            maxLength={14}
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
            placeholder="Data de Nascimento (DD/MM/AAAA)"
            required
            maxLength={10}
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none"
          />
          <input
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="Endereço completo"
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
          <div className="flex items-center">
            <input
              name="isAdmin"
              type="checkbox"
              checked={formData.isAdmin}
              onChange={handleInputChange}
              id="isAdmin"
              className="mr-2"
            />
            <label htmlFor="isAdmin" className="text-sm">
              É administrador
            </label>
          </div>
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
