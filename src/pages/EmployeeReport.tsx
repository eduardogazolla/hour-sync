import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface Entry {
  entradaManha: string;
  entradaTarde: string;
  saidaManha: string;
  saidaTarde: string;
}

interface TimeLog {
  id: string;
  date: string;
  entries: Entry;
}

const EmployeeReport = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = location as { state: { employeeId: string; employeeName: string } };
  const { employeeId, employeeName } = state;

  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [logToEdit, setLogToEdit] = useState<TimeLog | null>(null);
  const [employeeDetails, setEmployeeDetails] = useState<any>(null);

  const fetchEmployeeDetails = async () => {
    try {
      const docRef = doc(db, "employees", employeeId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setEmployeeDetails(docSnap.data());
      } else {
        console.error("Funcionário não encontrado!");
      }
    } catch (error) {
      console.error("Erro ao buscar detalhes do funcionário:", error);
    }
  };

  const fetchTimeLogs = async () => {
    const logs: TimeLog[] = [];
    const logsRef = collection(db, "timeLogs");
    const q = query(logsRef, where("userId", "==", employeeId));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      logs.push({
        id: doc.id,
        date: data.date,
        entries: data.entries,
      });
    });

    setTimeLogs(logs);
  };

  useEffect(() => {
    fetchEmployeeDetails();
    fetchTimeLogs();
  }, []);

  const handleEditClick = (log: TimeLog) => {
    setLogToEdit(log);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (updatedLog: TimeLog) => {
    try {
      const logRef = doc(db, "timeLogs", updatedLog.id);
      await updateDoc(logRef, { entries: updatedLog.entries });

      setTimeLogs((prevLogs) =>
        prevLogs.map((log) =>
          log.id === updatedLog.id ? { ...log, entries: updatedLog.entries } : log
        )
      );

      setIsEditModalOpen(false);
      setLogToEdit(null);
    } catch (error) {
      console.error("Erro ao atualizar o ponto:", error);
    }
  };

  const handleExportPDF = (employeeDetails: any, timeLogs: TimeLog[]) => {
    const doc = new jsPDF();
    // Cabeçalho do PDF
  doc.setFontSize(18);
  doc.text("Relatório de Pontos", 105, 10, { align: "center" });

  // Informações do funcionário
  const userInfo = [
    `Nome: ${employeeDetails.name || "Não informado"}`,
    `Email: ${employeeDetails.email || "Não informado"}`,
    `Setor: ${employeeDetails.sector || "Não informado"}`,
    `Função: ${employeeDetails.role || "Não informado"}`,
    `Status: ${employeeDetails.status || "Não informado"}`,
  ];

  doc.setFontSize(12);
  userInfo.forEach((info, index) => {
    doc.text(info, 10, 20 + index * 6);
  });

    // Configuração da tabela
  const tableColumns = [
    "Data",
    "Entrada Manhã",
    "Saída Manhã",
    "Entrada Tarde",
    "Saída Tarde",
  ];
  const tableRows = timeLogs.map((log) => [
    log.date,
    log.entries.entradaManha || "--:--",
    log.entries.saidaManha || "--:--",
    log.entries.entradaTarde || "--:--",
    log.entries.saidaTarde || "--:--",
  ]);
 // Renderiza a tabela no PDF
  doc.autoTable({
    head: [tableColumns],
    body: tableRows,
    startY: 60,
    margin: { top: 10 },
  });

     // Salva o PDF
  doc.save(`Relatorio_${employeeDetails.name || "Usuario"}.pdf`);
};

  const filteredLogs = timeLogs.filter((log) => {
    const logDate = new Date(log.date);
    const isSameDate = selectedDate
      ? logDate.toISOString().split("T")[0] === selectedDate
      : true;
    const isSameMonth = selectedMonth
      ? logDate.getMonth() + 1 === parseInt(selectedMonth.split("-")[1]) &&
        logDate.getFullYear() === parseInt(selectedMonth.split("-")[0])
      : true;

    return isSameDate && isSameMonth;
  });

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <button
        onClick={() => navigate(-1)}
        className="bg-gray-700 px-4 py-2 rounded hover:bg-gray-600 mb-4"
      >
        Voltar
      </button>
      <h1 className="text-3xl font-bold mb-6">
        Relatório de Pontos {employeeName}
      </h1>

      {employeeDetails && (
        <div className="bg-gray-800 p-4 rounded-lg shadow-md mb-6">
          <p><strong>Nome:</strong> {employeeDetails.name}</p>
          <p><strong>Email:</strong> {employeeDetails.email}</p>
          <p><strong>Setor:</strong> {employeeDetails.sector || "Não informado"}</p>
          <p><strong>Função:</strong> {employeeDetails.role || "Não informado"}</p>
          <p><strong>Status:</strong> {employeeDetails.status || "Não informado"}</p>
        </div>
      )}

      <div className="flex space-x-4 mb-4">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="p-2 bg-gray-700 rounded"
        />
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="p-2 bg-gray-700 rounded"
        />
        <button
          onClick={() => handleExportPDF(employeeDetails, timeLogs)}
          className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
        >
          Exportar PDF
        </button>
      </div>

      <table className="w-full text-left border-collapse">
        <thead>
          <tr>
            <th className="border-b p-2">Data</th>
            <th className="border-b p-2">Entrada Manhã</th>
            <th className="border-b p-2">Saída Manhã</th>
            <th className="border-b p-2">Entrada Tarde</th>
            <th className="border-b p-2">Saída Tarde</th>
            <th className="border-b p-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {filteredLogs.map((log) => (
            <tr key={log.id}>
              <td className="p-2">{log.date}</td>
              <td className="p-2">{log.entries.entradaManha || "--:--"}</td>
              <td className="p-2">{log.entries.saidaManha || "--:--"}</td>
              <td className="p-2">{log.entries.entradaTarde || "--:--"}</td>
              <td className="p-2">{log.entries.saidaTarde || "--:--"}</td>
              <td className="p-2">
                <button
                  onClick={() => handleEditClick(log)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  Editar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {isEditModalOpen && logToEdit && (
        <EditLogModal
          log={logToEdit}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleEditSubmit}
        />
      )}
    </div>
  );
};

const EditLogModal = ({
  log,
  onClose,
  onSubmit,
}: {
  log: TimeLog;
  onClose: () => void;
  onSubmit: (updatedLog: TimeLog) => void;
}) => {
  const [entries, setEntries] = useState(log.entries);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEntries((prevEntries) => ({ ...prevEntries, [name]: value }));
  };

  const handleSubmit = () => {
    onSubmit({ ...log, entries });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full text-white">
        <h2 className="text-2xl font-bold mb-4">Editar Horários</h2>
        <form className="space-y-4">
          {["entradaManha", "saidaManha", "entradaTarde", "saidaTarde"].map((field) => (
            <div key={field}>
              <label>{field.replace(/([A-Z])/g, " $1").toUpperCase()}</label>
              <input
                type="time"
                step="1"
                name={field}
                value={entries[field as keyof Entry]}
                onChange={handleInputChange}
                className="p-2 bg-gray-700 rounded w-full"
              />
            </div>
          ))}
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={handleSubmit}
              className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-red-600 px-4 py-2 rounded hover:bg-red-700"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeReport;
