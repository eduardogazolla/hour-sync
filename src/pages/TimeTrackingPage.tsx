import { useState, useEffect } from "react";
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebaseConfig";

const TimeTrackingPage = () => {
  const [serverTime, setServerTime] = useState<Date | null>(null);
  const [timeEntries, setTimeEntries] = useState({
    entradaManha: "",
    saidaManha: "",
    entradaTarde: "",
    saidaTarde: "",
  });
  const [isAdmin, setIsAdmin] = useState(false); // Verifica se o usuário é administrador
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const navigate = useNavigate();
  const userId = auth.currentUser?.uid;

    // Obtém o displayName do Firebase Auth
    useEffect(() => {
      const fetchUserDisplayName = () => {
        if (auth.currentUser) {
          setUserDisplayName(auth.currentUser.displayName || "Administrador");
        }
      };
      fetchUserDisplayName();
    }, []);

  // Regras de horários permitidos
  const scheduleLimits = {
    entradaManha: { start: "07:40", end: "08:05" },
    saidaManha: { start: "12:00", end: "12:10" },
    entradaTarde: { start: "12:50", end: "13:05" },
    saidaTarde: { start: "17:00", end: "17:10" },
  };

  // Obtém o horário do servidor
  const fetchServerTime = async () => {
    try {
      const response = await fetch(
        "https://www.timeapi.io/api/Time/current/zone?timeZone=America/Sao_Paulo"
      );
      if (!response.ok) {
        throw new Error("Erro ao buscar horário do servidor.");
      }
      const data = await response.json();
  
      const useSimulation = true; // Altere para `false` em produção
      let serverTime = new Date(data.dateTime);
  
      if (useSimulation) {
        const simulatedDate = "2024-11-29"; // Ajuste a data simulada
        const simulatedTime = "13:00"; // Ajuste o horário simulado (HH:mm)
  
        const [year, month, day] = simulatedDate.split("-").map(Number);
        const [hour, minute] = simulatedTime.split(":").map(Number);
  
        serverTime.setFullYear(year, month - 1, day); // Ajusta a data
        serverTime.setHours(hour, minute, 0); // Ajusta o horário
      }
  
      setServerTime(serverTime);
    } catch (error) {
      console.error("Erro ao buscar horário do servidor:", error);
    }
  };

  // Verifica se o usuário é administrador
  const checkIfAdmin = async () => {
    if (!userId) return;

    try {
      const userDoc = await getDoc(doc(db, "employees", userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setIsAdmin(userData.isAdmin || false);
      }
    } catch (error) {
      console.error("Erro ao verificar se o usuário é administrador:", error);
    }
  };

  // Cria um novo registro diário, se necessário
  const createDailyLogIfNotExists = async () => {
    if (!userId || !serverTime) return;
  
    const today = new Date(serverTime).toISOString().split("T")[0];
    const userDocRef = doc(db, "timeLogs", `${userId}_${today}`);
  
    try {
      const docSnapshot = await getDoc(userDocRef);
      if (docSnapshot.exists()) {
        // Carrega os dados existentes no estado para exibição
        setTimeEntries(docSnapshot.data().entries || {});
      }
    } catch (error) {
      console.error("Erro ao verificar o registro diário:", error);
    }
  };
  

  useEffect(() => {
    fetchServerTime();
    const interval = setInterval(fetchServerTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (userId) {
      checkIfAdmin(); // Verifica se o usuário é administrador
      createDailyLogIfNotExists(); // Cria ou carrega registro diário
      setUserDisplayName(auth.currentUser?.displayName || "");
    }
  }, [userId, serverTime]);

  // Verifica se o horário está dentro do permitido
  const isWithinSchedule = (action: string) => {
    if (!serverTime) return { withinSchedule: false, message: "" };
  
    const currentTime = serverTime.toTimeString().slice(0, 5);
    const { start, end } = scheduleLimits[action as keyof typeof scheduleLimits];
  
    const withinSchedule = currentTime >= start && currentTime <= end;
    const message = `O horário permitido para ${action.replace(/([A-Z])/g, " $1")} é das ${start} às ${end}.`;
  
    return { withinSchedule, message };
  };
  

  // Registra o ponto
  const handleRegister = async (type: "entrada" | "saida") => {
    if (!userId || !serverTime || !userDisplayName) return;
  
    const today = new Date(serverTime).toISOString().split("T")[0];
    const userDocRef = doc(db, "timeLogs", `${userId}_${today}`);

      // Verifica se é final de semana
  const dayOfWeek = serverTime.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    setErrorMessage("Registro de ponto não permitido em finais de semana.");
    setTimeout(() => setErrorMessage(""), 5000);
    return;
  }
  
    const actions = {
      entrada: ["entradaManha", "entradaTarde"],
      saida: ["saidaManha", "saidaTarde"],
    };
  
    // Encontrar a próxima ação válida com base no horário atual
    const currentAction = actions[type].find((action) => {
      const { withinSchedule } = isWithinSchedule(action);
      return withinSchedule && !timeEntries[action as keyof typeof timeEntries];
    });
  
    if (!currentAction) {
      setErrorMessage(`Nenhum horário permitido para ${type} está disponível no momento.`);
      setTimeout(() => setErrorMessage(""), 5000);
      return;
    }
  
    try {
      // Verifica se o documento já existe
      const docSnapshot = await getDoc(userDocRef);
      if (!docSnapshot.exists()) {
        await setDoc(userDocRef, {
          userId,
          userName: userDisplayName,
          date: today,
          entries: {
            entradaManha: "",
            saidaManha: "",
            entradaTarde: "",
            saidaTarde: "",
          },
        });
      }
  
      // Registra o ponto
      const timeToSave = serverTime.toLocaleTimeString("pt-BR");
      await updateDoc(userDocRef, {
        [`entries.${currentAction}`]: timeToSave,
      });
  
      setMessage(
        `${type === "entrada" ? "Entrada" : "Saída"} para ${currentAction.replace(
          /([A-Z])/g,
          " $1"
        )} registrada com sucesso!`
      );
      setTimeout(() => setMessage(""), 5000);
  
      // Atualiza os registros locais
      setTimeEntries((prevEntries) => ({
        ...prevEntries,
        [currentAction]: timeToSave,
      }));
    } catch (error) {
      console.error("Erro ao registrar ponto:", error);
      setErrorMessage("Erro ao registrar o ponto.");
      setTimeout(() => setErrorMessage(""), 5000);
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

  const handleBackToDashboard = () => {
    navigate("/admin");
  };

  return (
    <div className="h-screen flex flex-col justify-center items-center bg-gray-900">
      {isAdmin && (
        <button
          onClick={handleBackToDashboard}
          className="absolute top-4 left-4 bg-gray-700 text-white py-1 px-3 rounded hover:bg-gray-600 transition"
        >
          Voltar para Dashboard
        </button>
      )}
      <button
        onClick={handleLogout}
        className="absolute top-4 right-4 bg-red-600 text-white py-1 px-3 rounded"
      >
        Sair
      </button>
      <div className="bg-gray-800 p-8 rounded-md shadow-md w-full max-w-sm">
        <h2 className="text-3xl font-bold text-center text-white mb-2">
          Controle Ponto
        </h2>
        {userDisplayName && (
          <p className="text-center text-gray-400 mb-6">Bem-vindo, {userDisplayName}</p>
        )}
        {serverTime ? (
          <p className="text-center text-gray-400 mb-4">
            {serverTime.toLocaleDateString("pt-BR")}{" "}
            {serverTime.toLocaleTimeString("pt-BR")}
          </p>
        ) : (
          <p className="text-center text-red-400">Carregando horário...</p>
        )}
        <div className="space-y-4 text-white">
          <div className="flex justify-between">
            <span>Entrada manhã:</span>
            <span>{timeEntries.entradaManha || "--:--"}</span>
          </div>
          <div className="flex justify-between">
            <span>Saída manhã:</span>
            <span>{timeEntries.saidaManha || "--:--"}</span>
          </div>
          <div className="flex justify-between">
            <span>Entrada tarde:</span>
            <span>{timeEntries.entradaTarde || "--:--"}</span>
          </div>
          <div className="flex justify-between">
            <span>Saída tarde:</span>
            <span>{timeEntries.saidaTarde || "--:--"}</span>
          </div>
        </div>
        <div className="mt-6 flex justify-between gap-4">
          <button
            onClick={() => handleRegister("entrada")}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
          >
            Registrar Entrada
          </button>
          <button
            onClick={() => handleRegister("saida")}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            Registrar Saída
          </button>
        </div>
        {message && <p className="mt-4 text-center text-green-400">{message}</p>}
        {errorMessage && (
          <p className="mt-4 text-center text-red-400">{errorMessage}</p>
        )}
      </div>
    </div>
  );
};

export default TimeTrackingPage;
