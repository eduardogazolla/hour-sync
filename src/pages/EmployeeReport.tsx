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
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
  });
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

  const generateDaysOfMonth = (month: string): string[] => {
    if (!month) return [];
    const [year, monthIndex] = month.split("-").map(Number);
    const daysInMonth = new Date(year, monthIndex, 0).getDate(); // Número de dias no mês
    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(`${year}-${monthIndex.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`);
    }
    return days;
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

  const daysOfMonth = generateDaysOfMonth(selectedMonth);

  const allLogs = daysOfMonth.map((day) => {
    const log = timeLogs.find((log) => log.date === day);
    const dateObj = new Date(day);
    const dayOfWeek = (dateObj.getDay() + 1) % 7;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const weekendLabel = dayOfWeek === 0 ? "Domingo" : dayOfWeek === 6 ? "Sábado" : "";
  
    return {
      id: log?.id || "",
      date: day,
      entries: isWeekend
        ? { entradaManha: weekendLabel, saidaManha: weekendLabel, entradaTarde: weekendLabel, saidaTarde: weekendLabel }
        : log?.entries || { entradaManha: "--:--", saidaManha: "--:--", entradaTarde: "--:--", saidaTarde: "--:--" },
    };
  });
  
  const calculateDailyHours = (entries: Entry) => {
    const parseTime = (time: string) => {
      const [hours, minutes, seconds] = time.split(":").map(Number);
      return hours * 3600 + minutes * 60 + (seconds || 0);
    };
  
    if (
      entries.entradaManha === "--:--" ||
      entries.saidaManha === "--:--" ||
      entries.entradaTarde === "--:--" ||
      entries.saidaTarde === "--:--"
    ) {
      return 0; // Se algum horário estiver vazio, retorna 0
    }
  
    const morningWork = parseTime(entries.saidaManha) - parseTime(entries.entradaManha);
    const afternoonWork = parseTime(entries.saidaTarde) - parseTime(entries.entradaTarde);
  
    return (morningWork + afternoonWork) / 3600; // Retorna o total em horas
  };
  
  const totalMonthlyHours = allLogs.reduce((total, log) => {
    const dateObj = new Date(log.date);
    const dayOfWeek = (dateObj.getDay() + 1) % 7; // 0 = Sábado, 6 = Domingo
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
    if (!isWeekend) {
      return total + calculateDailyHours(log.entries);
    }
    return total; // Não soma horas para fins de semana
  }, 0);
  
  

  const handleExportPDF = (employeeDetails: any, logs: TimeLog[]) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relatório de Pontos", 105, 10, { align: "center" });

    const address = employeeDetails.address
    ? `${employeeDetails.address.street}, ${employeeDetails.address.number}${employeeDetails.address.complement ? ` - ${employeeDetails.address.complement}` : ""}, ${employeeDetails.address.neighborhood}, ${employeeDetails.address.city} - ${employeeDetails.address.state}, CEP: ${employeeDetails.address.zipCode}`
    : "Não informado";
  
    // Informações do funcionário
    const userInfo = [
      `Nome: ${employeeDetails.name || "Não informado"}`,
      `Email: ${employeeDetails.email || "Não informado"}`,
      `Endereço: ${address}`,
      `Setor: ${employeeDetails.sector || "Não informado"}`,
      `Função: ${employeeDetails.role || "Não informado"}`,
      `Status: ${employeeDetails.status || "Não informado"}`,
    ];
  
    doc.setFontSize(12);
    let yOffset = 20; // Posição inicial para exibir os dados do cabeçalho
  
    userInfo.forEach((info) => {
      const lines = doc.splitTextToSize(info, 190); // Divide o texto para caber na largura
      doc.text(lines, 10, yOffset);
      yOffset += lines.length * 6; // Ajusta o espaçamento entre linhas
    });
  
    // Configuração da tabela
    const tableColumns = [
      "Data",
      "Entrada Manhã",
      "Saída Manhã",
      "Entrada Tarde",
      "Saída Tarde",
      "Horas Trabalhadas",
    ];
  
    // Processar dados para o PDF
    const tableRows = allLogs.map((log) => {
      const dateObj = new Date(log.date);
      const dayOfWeek = (dateObj.getDay() + 1) % 7; // 0 = Sábado, 6 = Domingo
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dailyHours = isWeekend ? "" : calculateDailyHours(log.entries);
  
      return [
        log.date,
        log.entries.entradaManha,
        log.entries.saidaManha,
        log.entries.entradaTarde,
        log.entries.saidaTarde,
        dailyHours !== "" ? `${dailyHours.toFixed(2)} horas` : "",
      ];
    });
  
    // Total mensal excluindo fins de semana
    const totalMonthlyHours = allLogs.reduce((total, log) => {
      const dateObj = new Date(log.date);
      const dayOfWeek = (dateObj.getDay() + 1) % 7;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
      return isWeekend ? total : total + calculateDailyHours(log.entries);
    }, 0);
  
    // Renderiza a tabela no PDF
    doc.autoTable({
      head: [tableColumns],
      body: tableRows,
      startY: yOffset + 10, // Ajusta a posição da tabela com base no cabeçalho
      margin: { top: 10 },
    });
  
    // Adiciona o total mensal ao final da tabela
    doc.text(`Total Mensal: ${totalMonthlyHours.toFixed(2)} horas`, 10, doc.lastAutoTable.finalY + 10);
  
    // Salva o PDF
    doc.save(`Relatorio_${employeeDetails.name || "Usuario"}.pdf`);
  };
  
  

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

      {/* Detalhes do funcionário */}
      {employeeDetails && (
        <div className="bg-gray-800 p-4 rounded-lg shadow-md mb-6">
          <p><strong>Nome:</strong> {employeeDetails.name}</p>
          <p><strong>Email:</strong> {employeeDetails.email}</p>
          <p><strong>Endereço:</strong> {employeeDetails.address.street}, {employeeDetails.address.number}, { employeeDetails.address.neighborhood}, {employeeDetails.address.city}, {employeeDetails.address.state}</p>
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
      <th className="border-b p-2">Horas Trabalhadas</th>
      <th className="border-b p-2">Ações</th>
    </tr>
  </thead>
  <tbody>
  {allLogs.map((log, index) => {
    const dateObj = new Date(log.date);
    const dayOfWeek = (dateObj.getDay() + 1) % 7; // 0 = Sábado, 6 = Domingo
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dailyHours = isWeekend ? null : calculateDailyHours(log.entries);

    return (
      <tr key={index}>
        <td className="p-2">{log.date}</td>
        <td className="p-2">{log.entries.entradaManha}</td>
        <td className="p-2">{log.entries.saidaManha}</td>
        <td className="p-2">{log.entries.entradaTarde}</td>
        <td className="p-2">{log.entries.saidaTarde}</td>
        <td className="p-2">{dailyHours !== null ? `${dailyHours.toFixed(2)} horas` : ""}</td>
        <td className="p-2">
          {log.entries.entradaManha !== "Sábado" &&
            log.entries.entradaManha !== "Domingo" &&
            log.entries.entradaManha !== "--:--" && (
              <button
                onClick={() => handleEditClick(log)}
                className="text-blue-500 hover:text-blue-700"
              >
                Editar
              </button>
            )}
        </td>
      </tr>
    );
  })}
</tbody>

  <tfoot>
    <tr>
      <td colSpan={5} className="p-2 text-right font-bold">Total Mensal</td>
      <td className="p-2 font-bold">{totalMonthlyHours.toFixed(2)} horas</td>
    </tr>
  </tfoot>
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
