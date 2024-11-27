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
      const serverTime = new Date(data.dateTime);

      setServerTime(serverTime);
    } catch (error) {
      console.error("Erro ao buscar horário do servidor:", error);
    }
  };

  // Cria um novo documento de registro para o dia, se necessário
  const createDailyLogIfNotExists = async () => {
    if (!userId || !serverTime) return;

    const today = new Date(serverTime).toISOString().split("T")[0]; // Data atual no formato YYYY-MM-DD
    const userDocRef = doc(db, "timeLogs", `${userId}_${today}`);

    const docSnapshot = await getDoc(userDocRef);

    if (!docSnapshot.exists()) {
      try {
        await setDoc(userDocRef, {
          userId,
          userName: auth.currentUser?.displayName || "",
          date: today,
          entries: {
            entradaManha: "",
            saidaManha: "",
            entradaTarde: "",
            saidaTarde: "",
          },
        });
        console.log("Novo registro diário criado com sucesso.");
        setTimeEntries({
          entradaManha: "",
          saidaManha: "",
          entradaTarde: "",
          saidaTarde: "",
        });
      } catch (error) {
        console.error("Erro ao criar o registro diário:", error);
      }
    } else {
      setTimeEntries(docSnapshot.data().entries || {});
    }
  };

  useEffect(() => {
    fetchServerTime(); // Busca o horário inicial
    const interval = setInterval(fetchServerTime, 1000); // Atualiza a cada 1 segundo
    return () => clearInterval(interval); // Limpa o intervalo ao desmontar o componente
  }, []);

  useEffect(() => {
    if (userId) {
      createDailyLogIfNotExists();
      setUserName(auth.currentUser?.displayName || ""); // Define o nome do usuário logado
    }
  }, [userId, serverTime]);

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

    const today = new Date(serverTime).toISOString().split("T")[0];
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
      const userDocRef = doc(db, "timeLogs", `${userId}_${today}`);
      const timeToSave = serverTime.toLocaleTimeString("pt-BR").slice(0, 5);
      await updateDoc(userDocRef, {
        [`entries.${nextAction}`]: timeToSave,
      });

      setMessage(
        `${type === "entrada" ? "Entrada" : "Saída"} registrada com sucesso!`
      );
      setTimeout(() => setMessage(""), 5000);

      setTimeEntries((prevEntries) => ({
        ...prevEntries,
        [nextAction]: timeToSave,
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
