import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { Switch } from "@mui/material";
import { useAuth } from "../contexts/AuthContext"; // Certifique-se de que o contexto está importado corretamente
import {
  Edit,
  Add,
  ExitToApp,
  AccessAlarm,
  Menu,
  MenuOpen,
} from "@mui/icons-material";
import EmployeeFormModal from "./EmployeeFormModal";
import EditEmployeeModal from "./EditEmployeeModal"; // Novo modal para edição
import { auth, db } from "../firebaseConfig";

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

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // Novo estado para modal de edição
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null); // Dados do funcionário a ser editado
  const [message, setMessage] = useState(""); // Mensagem de sucesso ou erro

  // Alternar menu lateral
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  // Abrir modal para adicionar funcionário
  const handleAddEmployeeClick = () => setIsModalOpen(true);

  // Fechar modal de adicionar
  const handleCloseModal = () => setIsModalOpen(false);

  // Atualizar lista após adicionar
  const handleEmployeeAdded = () => fetchEmployees();

  // Abrir modal para editar funcionário
  const handleEditEmployeeClick = (employee: Employee) => {
    setEmployeeToEdit(employee);
    setIsEditModalOpen(true);
  };

  // Fechar modal de edição
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEmployeeToEdit(null);
  };

  // Atualizar lista após edição
  const handleEmployeeUpdated = () => fetchEmployees();

  // Buscar colaboradores do Firestore
  const fetchEmployees = async () => {
    const employeeList: Employee[] = [];
    const querySnapshot = await getDocs(collection(db, "employees"));
    querySnapshot.forEach((doc) => {
      const data = doc.data() as Omit<Employee, "id">;
      employeeList.push({ id: doc.id, ...data });
    });
    setEmployees(employeeList);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Alternar status do colaborador
  const toggleStatus = async (employeeId: string, currentStatus: string) => {
    try {
      const employeeRef = doc(db, "employees", employeeId);
      const newStatus = currentStatus === "ativo" ? "inativo" : "ativo";

      // Atualizar o status no Firestore
      await updateDoc(employeeRef, { status: newStatus });

      // Atualizar o status no Firebase Authentication via API backend
      const response = await fetch("http://localhost:5000/toggle-user-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: employeeId, // O ID do usuário no Firebase Authentication
          disabled: newStatus === "inativo", // Desabilitar se o status for "inativo"
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao atualizar status.");
      }

      const data = await response.json();
      setMessage(data.message);

      // Atualiza a lista de funcionários
      fetchEmployees();

      // Remove a mensagem após 5 segundos
      setTimeout(() => setMessage(""), 5000);
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      setMessage("Erro ao atualizar status do usuário.");
      setTimeout(() => setMessage(""), 5000);
    }
  };

  // Deslogar o administrador
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  if (!user || !user.isAdmin) {
    navigate("/"); // Redireciona para o login se o usuário não for admin
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-900 text-white">
      {/* Menu Lateral */}
      <div
        className={`${
          isMenuOpen ? "w-64" : "w-16"
        } bg-gray-800 transition-all duration-300 flex flex-col justify-between`}
      >
        <div className="mt-4">
          <button
            onClick={toggleMenu}
            className="flex items-center text-gray-300 hover:text-white p-4"
          >
            {isMenuOpen ? (
              <MenuOpen fontSize="large" />
            ) : (
              <Menu fontSize="large" />
            )}
            {isMenuOpen && <span className="ml-2">Menu</span>}
          </button>
          <div className="mt-6 space-y-4">
            <button
              onClick={handleAddEmployeeClick}
              className="flex items-center text-gray-300 hover:text-white pl-4"
            >
              <Add fontSize="large" />
              {isMenuOpen && <span className="ml-4">Adicionar</span>}
            </button>
            <button
              className="flex items-center text-gray-300 hover:text-white pl-4"
              onClick={() => console.log("Registrar Ponto")}
            >
              <AccessAlarm fontSize="large" />
              {isMenuOpen && <span className="ml-4">Bater Ponto</span>}
            </button>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center justify-start text-red-500 hover:text-red-700 p-4"
        >
          <ExitToApp fontSize="large" />
          {isMenuOpen && <span className="ml-4">Sair</span>}
        </button>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-semibold mb-6">Lista de colaboradores</h1>
        {message && (
          <div className="mb-4 text-green-500 text-center">{message}</div>
        )}
        <div className="flex justify-between mb-4">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="p-2 rounded bg-gray-700 text-white focus:outline-none"
          />
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
          <div className="grid grid-cols-6 gap-4 p-2 font-semibold border-b border-gray-700">
            <div>Nome</div>
            <div>Email</div>
            <div>Senha</div>
            <div>Status</div>
            <div>Função</div>
            <div>Ações</div>
          </div>
          {employees
            .filter((employee) =>
              employee.name.toLowerCase().includes(search.toLowerCase())
            )
            .map((employee) => (
              <div
                key={employee.id}
                className="grid grid-cols-6 gap-4 items-center p-2 border-b border-gray-700"
              >
                <div className="flex items-center space-x-2">
                  <span className="rounded-full bg-green-500 w-8 h-8 flex items-center justify-center text-white">
                    {employee.name[0].toUpperCase()}
                  </span>
                  <span>{employee.name}</span>
                </div>
                <div>{employee.email}</div>
                <div>{employee.password}</div>
                <div>{employee.status}</div>
                <div>{employee.role}</div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEditEmployeeClick(employee)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <Edit fontSize="small" />
                  </button>
                  <Switch
                    checked={employee.status === "ativo"}
                    color="primary"
                    onChange={() => toggleStatus(employee.id, employee.status)}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Modais */}
      {isModalOpen && (
        <EmployeeFormModal
          onClose={handleCloseModal}
          onEmployeeAdded={handleEmployeeAdded}
        />
      )}
      {isEditModalOpen && employeeToEdit && (
        <EditEmployeeModal
          employee={employeeToEdit}
          onClose={handleCloseEditModal}
          onEmployeeUpdated={handleEmployeeUpdated}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
