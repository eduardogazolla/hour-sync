import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  getDoc,
  updateDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { Switch } from "@mui/material";
import { useAuth } from "../contexts/AuthContext";
import {
  Edit,
  Add,
  ExitToApp,
  Menu,
  MenuOpen,
  AccessTime,
} from "@mui/icons-material";
import EmployeeFormModal from "./EmployeeFormModal";
import EditEmployeeModal from "./EditEmployeeModal";
import { auth, db } from "../firebaseConfig";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Employee {
  id: string;
  name: string;
  cpf: string;
  email: string;
  sector: string;
  role: string;
  birthDate: string;
  address: {
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  status: string;
  isAdmin: boolean;
}

const AdminDashboard = () => {
  const [adminSortConfig, setAdminSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [collabSortConfig, setCollabSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [selectedMonth] = useState<string>(
    `${new Date().getFullYear()}-${(new Date().getMonth() + 1)
      .toString()
      .padStart(2, "0")}`
  );

  const sortTable = (key: string, isAdmin: boolean) => {
    const sortConfig = isAdmin ? adminSortConfig : collabSortConfig;
    const setSortConfig = isAdmin ? setAdminSortConfig : setCollabSortConfig;

    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }

    setSortConfig({ key, direction });

    // Ordenar os dados
    const sortEmployees = (employees: Employee[]) => {
      return [...employees].sort((a, b) => {
        const valueA = a[key as keyof Employee]?.toString().toLowerCase() || "";
        const valueB = b[key as keyof Employee]?.toString().toLowerCase() || "";

        if (valueA < valueB) return direction === "asc" ? -1 : 1;
        if (valueA > valueB) return direction === "asc" ? 1 : -1;
        return 0;
      });
    };

    if (isAdmin) {
      setAdministrators(sortEmployees(administrators));
    } else {
      setCollaborators(sortEmployees(collaborators));
    }
  };

  const getSortIndicator = (key: string, isAdmin: boolean) => {
    const sortConfig = isAdmin ? adminSortConfig : collabSortConfig;

    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? "▲" : "▼";
  };

  const { user } = useAuth();
  const navigate = useNavigate();
  const [administrators, setAdministrators] = useState<Employee[]>([]);
  const [collaborators, setCollaborators] = useState<Employee[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
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

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prevSelected) =>
      prevSelected.includes(userId)
        ? prevSelected.filter((id) => id !== userId)
        : [...prevSelected, userId]
    );
  };

  const exportSelectedReports = async () => {
    for (const userId of selectedUsers) {
      try {
        // Fetch employee details
        const userDocRef = doc(db, "employees", userId);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const employeeDetails = userDoc.data();

          // Fetch time logs
          const logsRef = collection(db, "timeLogs");
          const logsQuery = query(logsRef, where("userId", "==", userId));
          const logsSnapshot = await getDocs(logsQuery);

          const logs = logsSnapshot.docs.map((doc) => ({
            id: doc.id,
            date: doc.data().date || "",
            entries: doc.data().entries || {},
          }));

          // Generate days of the month
          const generateDaysOfMonth = (month: string): string[] => {
            const [year, monthIndex] = month.split("-").map(Number);
            const daysInMonth = new Date(year, monthIndex, 0).getDate();
            return Array.from(
              { length: daysInMonth },
              (_, i) =>
                `${year}-${String(monthIndex).padStart(2, "0")}-${String(
                  i + 1
                ).padStart(2, "0")}`
            );
          };

          // Calculate daily hours
          const calculateDailyHours = (entries: any) => {
            const parseTime = (time: string) => {
              const [hours, minutes, seconds] = time.split(":").map(Number);
              return hours * 3600 + minutes * 60 + (seconds || 0);
            };

            let totalSeconds = 0;

            // Morning hours
            if (
              entries.entradaManha &&
              entries.saidaManha &&
              entries.entradaManha !== "--:--" &&
              entries.saidaManha !== "--:--"
            ) {
              totalSeconds +=
                parseTime(entries.saidaManha) - parseTime(entries.entradaManha);
            }

            // Afternoon hours
            if (
              entries.entradaTarde &&
              entries.saidaTarde &&
              entries.entradaTarde !== "--:--" &&
              entries.saidaTarde !== "--:--"
            ) {
              totalSeconds +=
                parseTime(entries.saidaTarde) - parseTime(entries.entradaTarde);
            }

            // Convert to hours and minutes
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            return totalSeconds > 0 ? `${hours}h ${minutes}m` : "0h 0m";
          };

          const daysOfMonth = generateDaysOfMonth(selectedMonth);

          // Generate PDF
          const docPdf = new jsPDF();
          docPdf.setFontSize(18);
          docPdf.text("Relatório de Pontos", 105, 10, { align: "center" });

          const address = employeeDetails.address
            ? `${employeeDetails.address.street}, ${
                employeeDetails.address.number
              }${
                employeeDetails.address.complement
                  ? ` - ${employeeDetails.address.complement}`
                  : ""
              }, ${employeeDetails.address.neighborhood}, ${
                employeeDetails.address.city
              } - ${employeeDetails.address.state}, CEP: ${
                employeeDetails.address.zipCode
              }`
            : "Não informado";

          // Employee information
          const userInfo = [
            `Nome: ${employeeDetails.name || "Não informado"}`,
            `Email: ${employeeDetails.email || "Não informado"}`,
            `Endereço: ${address}`,
            `Setor: ${employeeDetails.sector || "Não informado"}`,
            `Função: ${employeeDetails.role || "Não informado"}`,
            `Status: ${employeeDetails.status || "Não informado"}`,
          ];

          docPdf.setFontSize(12);
          let yOffset = 20;
          userInfo.forEach((info) => {
            const lines = docPdf.splitTextToSize(info, 190);
            docPdf.text(lines, 10, yOffset);
            yOffset += lines.length * 6;
          });

          // Table configuration
          const tableColumns = [
            "Data",
            "Entrada Manhã",
            "Saída Manhã",
            "Entrada Tarde",
            "Saída Tarde",
            "Horas Trabalhadas",
          ];

          // Table rows
          const tableRows = daysOfMonth.map((date) => {
            const log = logs.find((log) => log.date === date);
            const dateObj = new Date(date);
            const dayOfWeek = (dateObj.getDay() + 1) % 7;
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const weekendLabel =
              dayOfWeek === 0 ? "Domingo" : dayOfWeek === 6 ? "Sábado" : "";

            const formatField = (
              field: string | undefined,
              justification?: string
            ) => {
              if (field && field !== "--:--") {
                return field;
              } else if (justification) {
                return "Justificado";
              }
              return "--:--";
            };

            const dailyHours = log
              ? calculateDailyHours(log.entries)
              : isWeekend
              ? ""
              : "0h 0m";

            return [
              date,
              isWeekend
                ? weekendLabel
                : formatField(
                    log?.entries.entradaManha,
                    log?.entries.entradaManhaJustification
                  ),
              isWeekend
                ? weekendLabel
                : formatField(
                    log?.entries.saidaManha,
                    log?.entries.saidaManhaJustification
                  ),
              isWeekend
                ? weekendLabel
                : formatField(
                    log?.entries.entradaTarde,
                    log?.entries.entradaTardeJustification
                  ),
              isWeekend
                ? weekendLabel
                : formatField(
                    log?.entries.saidaTarde,
                    log?.entries.saidaTardeJustification
                  ),
              dailyHours,
            ];
          });

          // Render table in PDF
          docPdf.autoTable({
            head: [tableColumns],
            body: tableRows,
            startY: yOffset + 10,
          });

          // Calculate total monthly hours
          const totalMonthlyHours = logs.reduce((totalSeconds, log) => {
            const dateObj = new Date(log.date);
            const dayOfWeek = (dateObj.getDay() + 1) % 7; // 0 = Saturday, 6 = Sunday
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            if (!isWeekend) {
              const parseTime = (time: string) => {
                if (!time || time === "--:--") return 0;
                const [hours, minutes, seconds] = time.split(":").map(Number);
                return hours * 3600 + minutes * 60 + (seconds || 0);
              };

              const entries = log.entries;

              // Morning hours
              if (
                entries.entradaManha &&
                entries.saidaManha &&
                entries.entradaManha !== "--:--" &&
                entries.saidaManha !== "--:--"
              ) {
                totalSeconds +=
                  parseTime(entries.saidaManha) -
                  parseTime(entries.entradaManha);
              }

              // Afternoon hours
              if (
                entries.entradaTarde &&
                entries.saidaTarde &&
                entries.entradaTarde !== "--:--" &&
                entries.saidaTarde !== "--:--"
              ) {
                totalSeconds +=
                  parseTime(entries.saidaTarde) -
                  parseTime(entries.entradaTarde);
              }
            }

            return totalSeconds;
          }, 0);

          // Convert total seconds into hours and minutes
          const totalHours = Math.floor(totalMonthlyHours / 3600);
          const totalMinutes = Math.floor((totalMonthlyHours % 3600) / 60);

          // Format total monthly hours as "Xh Ym"
          const formattedTotalMonthlyHours = `${totalHours}h ${totalMinutes}m`;

          // Add total to the PDF
          docPdf.text(
            `Total Mensal: ${formattedTotalMonthlyHours}`,
            10,
            docPdf.lastAutoTable.finalY + 10
          );

          // Save the PDF
          docPdf.save(`Relatorio_${employeeDetails.name || "Usuario"}_${selectedMonth}.pdf`);
        }
      } catch (error) {
        console.error("Erro ao exportar relatório:", error);
      }
    }
  };

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
            state: {
              userId: user.uid,
              userName: userData?.name || user.displayName,
            },
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
        } fixed top-0 left-0 h-screen bg-gray-800 flex flex-col justify-between transition-all duration-300`}
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

      <div
        className={`transition-all duration-300 ${
          isMenuOpen ? "ml-64" : "ml-16"
        } flex-1 overflow-y-auto h-screen p-8`}
      >
        <h1 className="text-3xl font-semibold mb-6">
          Bem-vindo, {user?.displayName || "Administrador"}
        </h1>
        {message && (
          <div className="mb-4 text-green-500 text-center">{message}</div>
        )}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={exportSelectedReports}
            disabled={selectedUsers.length === 0}
            className={`py-2 px-4 rounded ${
              selectedUsers.length === 0
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            Exportar PDFs Selecionados
          </button>
        </div>

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
                <th
                  onClick={() => sortTable("name", true)}
                  className="cursor-pointer"
                >
                  Nome {getSortIndicator("name", true)}
                </th>
                <th
                  onClick={() => sortTable("email", true)}
                  className="cursor-pointer"
                >
                  Email {getSortIndicator("email", true)}
                </th>
                <th
                  onClick={() => sortTable("sector", true)}
                  className="cursor-pointer"
                >
                  Setor {getSortIndicator("sector", true)}
                </th>
                <th
                  onClick={() => sortTable("role", true)}
                  className="cursor-pointer"
                >
                  Função {getSortIndicator("role", true)}
                </th>
                <th
                  onClick={() => sortTable("status", true)}
                  className="cursor-pointer"
                >
                  Status {getSortIndicator("status", true)}
                </th>
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
                    className="py-2 flex items-center space-x-2 cursor-pointer"
                    onClick={() =>
                      navigate("/employee-report", {
                        state: {
                          employeeId: admin.id,
                          employeeName: admin.name,
                        },
                      })
                    }
                  >
                    <div
                      className="flex items-center px-1"
                      onClick={(e) => {
                        e.stopPropagation(); // Impede o redirecionamento ao clicar no avatar
                        toggleUserSelection(admin.id); // Alterna seleção
                      }}
                    >
                      {selectedUsers.includes(admin.id) ? (
                        // Ícone de "check" quando selecionado
                        <div className="bg-blue-500 text-white w-8 h-8 flex items-center justify-center rounded-full">
                          ✓
                        </div>
                      ) : (
                        // Avatar normal quando não selecionado
                        <div className="bg-blue-500 text-white w-8 h-8 flex items-center justify-center rounded-full">
                          {admin.name[0].toUpperCase()}
                        </div>
                      )}
                      <span className="ml-2">{admin.name}</span>
                    </div>
                  </td>
                  <td
                    className="cursor-pointer"
                    onClick={() =>
                      navigate("/employee-report", {
                        state: {
                          employeeId: admin.id,
                          employeeName: admin.name,
                        },
                      })
                    }
                  >
                    {admin.email}
                  </td>
                  <td
                    className="cursor-pointer"
                    onClick={() =>
                      navigate("/employee-report", {
                        state: {
                          employeeId: admin.id,
                          employeeName: admin.name,
                        },
                      })
                    }
                  >
                    {admin.sector}
                  </td>
                  <td
                    className="cursor-pointer"
                    onClick={() =>
                      navigate("/employee-report", {
                        state: {
                          employeeId: admin.id,
                          employeeName: admin.name,
                        },
                      })
                    }
                  >
                    {admin.role}
                  </td>
                  <td
                    className="cursor-pointer"
                    onClick={() =>
                      navigate("/employee-report", {
                        state: {
                          employeeId: admin.id,
                          employeeName: admin.name,
                        },
                      })
                    }
                  >
                    {admin.status}
                  </td>
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
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-8 overflow-x-auto">
          <table className="table-auto w-full text-left text-white">
            <thead>
              <tr>
                <th
                  onClick={() => sortTable("name", false)}
                  className="cursor-pointer"
                >
                  Nome {getSortIndicator("name", false)}
                </th>
                <th
                  onClick={() => sortTable("email", false)}
                  className="cursor-pointer"
                >
                  Email {getSortIndicator("email", false)}
                </th>
                <th
                  onClick={() => sortTable("sector", false)}
                  className="cursor-pointer"
                >
                  Setor {getSortIndicator("sector", false)}
                </th>
                <th
                  onClick={() => sortTable("role", false)}
                  className="cursor-pointer"
                >
                  Função {getSortIndicator("role", false)}
                </th>
                <th
                  onClick={() => sortTable("status", false)}
                  className="cursor-pointer"
                >
                  Status {getSortIndicator("status", false)}
                </th>
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
                    className="py-2 flex items-center space-x-2 cursor-pointer"
                    onClick={() =>
                      navigate("/employee-report", {
                        state: {
                          employeeId: collaborator.id,
                          employeeName: collaborator.name,
                        },
                      })
                    }
                  >
                    <div
                      className="flex items-center px-1"
                      onClick={(e) => {
                        e.stopPropagation(); // Impede o redirecionamento ao clicar no avatar
                        toggleUserSelection(collaborator.id); // Alterna seleção
                      }}
                    >
                      {selectedUsers.includes(collaborator.id) ? (
                        // Ícone de "check" quando selecionado
                        <div className="bg-green-500 text-white w-8 h-8 flex items-center justify-center rounded-full">
                          ✓
                        </div>
                      ) : (
                        // Avatar normal quando não selecionado
                        <div className="bg-green-500 text-white w-8 h-8 flex items-center justify-center rounded-full">
                          {collaborator.name[0].toUpperCase()}
                        </div>
                      )}
                      <span className="ml-2">{collaborator.name}</span>
                    </div>
                  </td>
                  <td
                    onClick={() =>
                      navigate("/employee-report", {
                        state: {
                          employeeId: collaborator.id,
                          employeeName: collaborator.name,
                        },
                      })
                    }
                    className="py-1 flex items-center space-x-2 cursor-pointer"
                  ></td>
                  <td
                    className="cursor-pointer"
                    onClick={() =>
                      navigate("/employee-report", {
                        state: {
                          employeeId: collaborator.id,
                          employeeName: collaborator.name,
                        },
                      })
                    }
                  >
                    {collaborator.email}
                  </td>
                  <td
                    className="cursor-pointer"
                    onClick={() =>
                      navigate("/employee-report", {
                        state: {
                          employeeId: collaborator.id,
                          employeeName: collaborator.name,
                        },
                      })
                    }
                  >
                    {collaborator.sector}
                  </td>
                  <td
                    className="cursor-pointer"
                    onClick={() =>
                      navigate("/employee-report", {
                        state: {
                          employeeId: collaborator.id,
                          employeeName: collaborator.name,
                        },
                      })
                    }
                  >
                    {collaborator.role}
                  </td>
                  <td
                    className="cursor-pointer"
                    onClick={() =>
                      navigate("/employee-report", {
                        state: {
                          employeeId: collaborator.id,
                          employeeName: collaborator.name,
                        },
                      })
                    }
                  >
                    {collaborator.status}
                  </td>
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
