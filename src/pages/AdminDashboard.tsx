import { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { Switch } from "@mui/material";
import { Edit } from "@mui/icons-material";
import EmployeeFormModal from "./EmployeeFormModal";

interface Employee {
  id: string;
  name: string;
  email: string;
  password: string;
  status: string;
  role: string;
}

const AdminDashboard = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddEmployeeClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleEmployeeAdded = async () => {
    await fetchEmployees();
    setIsModalOpen(false);
  };

  // Função para buscar os colaboradores do Firestore
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

  // Função para alternar o status do colaborador
  const toggleStatus = async (employeeId: string, currentStatus: string) => {
    try {
      const employeeRef = doc(db, "employees", employeeId);
      await updateDoc(employeeRef, {
        status: currentStatus === "ativo" ? "inativo" : "ativo",
      });
      fetchEmployees();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <h1 className="text-3xl font-semibold mb-6">Lista de colaboradores</h1>
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="p-2 rounded bg-gray-700 text-white focus:outline-none"
        />
        <button
          onClick={handleAddEmployeeClick}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          Adicionar
        </button>

        {isModalOpen && (
          <EmployeeFormModal
            onClose={handleCloseModal}
            onEmployeeAdded={handleEmployeeAdded}
          />
        )}
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
                <button className="text-blue-500 hover:text-blue-700">
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
  );
};

export default AdminDashboard;
