import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { useState, useEffect } from "react";
import { collection, getDocs, getDoc, updateDoc, doc } from "firebase/firestore";
import { Switch } from "@mui/material";
import { useAuth } from "../contexts/AuthContext";
import { Edit, Add, ExitToApp, Menu, MenuOpen, AccessTime } from "@mui/icons-material";
import EmployeeFormModal from "./EmployeeFormModal";
import EditEmployeeModal from "./EditEmployeeModal";
import { auth, db } from "../firebaseConfig";

interface Employee {
  id: string;
  name: string;
  cpf: string;
  email: string;
  sector: string;
  role: string;
  birthDate: string;
  address: string;
  status: string;
  isAdmin: boolean;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [administrators, setAdministrators] = useState<Employee[]>([]);
  const [collaborators, setCollaborators] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [message, setMessage] = useState("");

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleAddEmployeeClick = () => setIsModalOpen(true);

  const handleCloseModal = () => setIsModalOpen(false);

  const handleEmployeeAdded = () => fetchEmployees();

  const handleEditEmployeeClick = (employee: Employee) => {
    setEmployeeToEdit(employee);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEmployeeToEdit(null);
  };

  const handleEmployeeUpdated = () => fetchEmployees();

  const fetchEmployees = async () => {
    const employeeList: Employee[] = [];
    const querySnapshot = await getDocs(collection(db, "employees"));
    querySnapshot.forEach((doc) => {
      const data = doc.data() as Omit<Employee, "id">;
      employeeList.push({ id: doc.id, ...data });
    });

    setAdministrators(employeeList.filter((employee) => employee.isAdmin));
    setCollaborators(employeeList.filter((employee) => !employee.isAdmin));
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const toggleStatus = async (employeeId: string, currentStatus: string) => {
    try {
      const employeeRef = doc(db, "employees", employeeId);
      const newStatus = currentStatus === "ativo" ? "inativo" : "ativo";

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

      setMessage(`Status atualizado com sucesso para ${newStatus}.`);
      fetchEmployees();

      setTimeout(() => setMessage(""), 5000);
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      setMessage("Erro ao atualizar status do usuário.");
      setTimeout(() => setMessage(""), 5000);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const handleGoToTimeTracking = async () => {
    try {
      if (user?.uid) {
        // Obtenha o documento do usuário logado no Firestore
        const userDocRef = doc(db, "employees", user.uid);
        const userDocSnapshot = await getDoc(userDocRef);
  
        // Verifique se o documento foi encontrado
        if (userDocSnapshot.exists()) {
          const userData = userDocSnapshot.data();
          
          // Redirecione para a página de time-tracking, passando o nome atualizado
          navigate("/time-tracking", {
            state: { userId: user.uid, userName: userData?.name || user.displayName },
          });
        } else {
          console.error("Usuário não encontrado no Firestore.");
        }
      }
    } catch (error) {
      console.error("Erro ao buscar dados do usuário:", error);
    }
  };
  

  const filterEmployees = (employees: Employee[]) =>
    employees.filter(
      (employee) =>
        employee.name.toLowerCase().includes(search.toLowerCase()) ||
        employee.email.toLowerCase().includes(search.toLowerCase()) ||
        employee.role.toLowerCase().includes(search.toLowerCase()) ||
        employee.sector.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="flex min-h-screen bg-gray-900 text-white">
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
              onClick={handleGoToTimeTracking}
              className="flex items-center text-gray-300 hover:text-white pl-4"
            >
              <AccessTime fontSize="large" />
              {isMenuOpen && <span className="ml-4">Registrar Ponto</span>}
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

      <div className="flex-1 p-8">
        <h1 className="text-3xl font-semibold mb-6">
          Bem-vindo, {user?.displayName || "Administrador"}
        </h1>
        {message && (
          <div className="mb-4 text-green-500 text-center">{message}</div>
        )}

        <div className="mb-4">
          <input
            type="text"
            placeholder="Pesquise por nome, e-mail, função ou setor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <h2 className="text-2xl font-semibold mb-4">Administradores</h2>
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-8 overflow-x-auto">
          <table className="table-auto w-full text-left text-white">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Setor</th>
                <th>Função</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filterEmployees(administrators).map((admin) => (
                <tr
                  key={admin.id}
                  className="border-b border-gray-700 hover:bg-gray-700 transition"
                >
                  <td
                    onClick={() =>
                      navigate("/employee-report", {
                        state: { employeeId: admin.id, employeeName: admin.name },
                      })
                    }
                    className="py-3 flex items-center space-x-2 cursor-pointer"
                  >
                    <div className="bg-blue-500 text-white w-8 h-8 flex items-center justify-center rounded-full">
                      {admin.name[0].toUpperCase()}
                    </div>
                    <span>{admin.name}</span>
                  </td>
                  <td>{admin.email}</td>
                  <td>{admin.sector}</td>
                  <td>{admin.role}</td>
                  <td>{admin.status}</td>
                  <td>
                    <button
                      onClick={() => handleEditEmployeeClick(admin)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit fontSize="small" />
                    </button>
                    <Switch
                      checked={admin.status === "ativo"}
                      color="primary"
                      onChange={() => toggleStatus(admin.id, admin.status)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl font-semibold mb-4">Colaboradores</h2>
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg overflow-x-auto">
          <table className="table-auto w-full text-left text-white">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Setor</th>
                <th>Função</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filterEmployees(collaborators).map((collaborator) => (
                <tr
                  key={collaborator.id}
                  className="border-b border-gray-700 hover:bg-gray-700 transition"
                >
                  <td
                    onClick={() =>
                      navigate("/employee-report", {
                        state: {
                          employeeId: collaborator.id,
                          employeeName: collaborator.name,
                        },
                      })
                    }
                    className="py-3 flex items-center space-x-2 cursor-pointer"
                  >
                    <div className="bg-green-500 text-white w-8 h-8 flex items-center justify-center rounded-full">
                      {collaborator.name[0].toUpperCase()}
                    </div>
                    <span>{collaborator.name}</span>
                  </td>
                  <td>{collaborator.email}</td>
                  <td>{collaborator.sector}</td>
                  <td>{collaborator.role}</td>
                  <td>{collaborator.status}</td>
                  <td>
                    <button
                      onClick={() => handleEditEmployeeClick(collaborator)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit fontSize="small" />
                    </button>
                    <Switch
                      checked={collaborator.status === "ativo"}
                      color="primary"
                      onChange={() =>
                        toggleStatus(collaborator.id, collaborator.status)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
