import { useState, useEffect } from "react";
import {
  doc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
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
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();
  const userId = auth.currentUser?.uid;

  // Regras de horários permitidos
  const scheduleLimits = {
    entradaManha: { start: "07:40", end: "08:05" },
    saidaManha: { start: "12:00", end: "12:10" },
    entradaTarde: { start: "12:50", end: "13:05" },
    saidaTarde: { start: "18:00", end: "18:10" },
  };

  // Obtém o horário do servidor ou simula um horário válido
const fetchServerTime = async () => {
  try {
    const response = await fetch(
      "https://www.timeapi.io/api/Time/current/zone?timeZone=America/Sao_Paulo"
    );
    if (!response.ok) {
      throw new Error("Erro ao buscar horário do servidor.");
    }
    const data = await response.json();

    // Se você deseja simular um horário para testes, ajuste aqui
    const useSimulation = false; // Altere para `false` em produção
    let serverTime = new Date(data.dateTime);

    if (useSimulation) {
      serverTime.setHours(18, 0, 0); // Simula 08:00 para testes
    }

    setServerTime(serverTime); // Atualiza o estado
  } catch (error) {
    console.error("Erro ao buscar horário do servidor:", error);
  }
};

  useEffect(() => {
    fetchServerTime(); // Busca o horário inicial
    const interval = setInterval(fetchServerTime, 1000); // Atualiza a cada 1 segundo
    return () => clearInterval(interval); // Limpa o intervalo ao desmontar o componente
  }, []);

  // Carrega registros do dia atual
  const loadTodayEntries = async () => {
    if (!userId) return;
  
    try {
      // Referência ao documento do usuário em "timeLogs"
      const userDocRef = doc(db, "timeLogs", userId);
      const docSnapshot = await getDoc(userDocRef);
  
      // Verifica se o documento existe
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
  
        // Obtém as entradas salvas no Firestore (se existirem)
        const entries = data.entries || {};
  
        // Atualiza o estado com os dados recuperados
        setTimeEntries({
          entradaManha: entries.entradaManha || "",
          saidaManha: entries.saidaManha || "",
          entradaTarde: entries.entradaTarde || "",
          saidaTarde: entries.saidaTarde || "",
        });
      } else {
        // Documento não encontrado, inicializa com valores vazios
        setTimeEntries({
          entradaManha: "",
          saidaManha: "",
          entradaTarde: "",
          saidaTarde: "",
        });
      }
    } catch (error) {
      console.error("Erro ao carregar os pontos do dia:", error);
    }
  };

  useEffect(() => {
    if (userId) {
      loadTodayEntries();
      setUserName(auth.currentUser?.displayName || ""); // Define o nome do usuário logado
    }
  }, [userId]);

  // Verifica se o horário está dentro do permitido
 // Verifica se o horário está dentro do permitido
const isWithinSchedule = (action: string) => {
  if (!serverTime) return false;

  const currentTime = serverTime.toTimeString().slice(0, 5); // HH:mm
  const { start, end } = scheduleLimits[action as keyof typeof scheduleLimits];

  return currentTime >= start && currentTime <= end;
};

  // Registra o ponto
  const handleRegister = async (type: "entrada" | "saida") => {
    if (!userId || !serverTime || !userName) return;

    const today = new Date().toISOString().split("T")[0]; // Formata a data como YYYY-MM-DD
    const actions: { [key: string]: string[] } = {
      entrada: ["entradaManha", "entradaTarde"],
      saida: ["saidaManha", "saidaTarde"],
    };

    const availableActions = actions[type];
    if (!availableActions) {
      setErrorMessage("Ação inválida. Por favor, tente novamente.");
      setTimeout(() => setErrorMessage(""), 5000);
      return;
    }

    const nextAction = availableActions.find(
      (action) => !timeEntries[action as keyof typeof timeEntries]
    );

    if (!nextAction) {
      setErrorMessage(
        `Todos os pontos de ${type} do dia já foram registrados.`
      );
      setTimeout(() => setErrorMessage(""), 5000);
      return;
    }

    if (!isWithinSchedule(nextAction)) {
      const attemptedTime = serverTime.toLocaleTimeString("pt-BR"); // Obtém o horário atual formatado
      setErrorMessage(`Horário inválido para ${type}. (${attemptedTime})`);
      setTimeout(() => setErrorMessage(""), 5000);
      return;
    }

    try {
      const userDocRef = doc(db, "timeLogs", userId); // Cria a referência ao documento com o ID do usuário
      const docSnapshot = await getDoc(userDocRef);

      if (!docSnapshot.exists()) {
        // Cria um novo documento para o usuário, se ainda não existir
        await setDoc(userDocRef, {
          userId,
          userName,
          date: today,
          entries: {
            [nextAction]: serverTime.toLocaleTimeString("pt-BR"),
          },
        });
      } else {
        // Atualiza o documento existente adicionando a nova entrada
        await updateDoc(userDocRef, {
          [`entries.${nextAction}`]: serverTime.toLocaleTimeString("pt-BR"),
        });
      }

      setMessage(
        `${type === "entrada" ? "Entrada" : "Saída"} registrada com sucesso!`
      );
      setTimeout(() => setMessage(""), 5000);

      // Atualiza os dados no estado
      setTimeEntries((prevEntries) => ({
        ...prevEntries,
        [nextAction]: serverTime.toLocaleTimeString("pt-BR"),
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

  return (
    <div className="h-screen flex flex-col justify-center items-center bg-gray-900">
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
        {userName && (
          <p className="text-center text-gray-400 mb-6">
            Bem-vindo, {userName}
          </p>
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
        {message && (
          <p className="mt-4 text-center text-green-400">{message}</p>
        )}
        {errorMessage && (
          <p className="mt-4 text-center text-red-400">{errorMessage}</p>
        )}
      </div>
    </div>
  );
};

export default TimeTrackingPage;
