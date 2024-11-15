import { useState, useEffect } from "react";
import { auth, db } from "../firebaseConfig";
import {
  addDoc,
  collection,
  Timestamp,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const TimeTrackingPage = () => {
  const [serverTime, setServerTime] = useState<Date | null>(null);
  const [timeEntries, setTimeEntries] = useState({
    entradaManha: "",
    saidaManha: "",
    entradaTarde: "",
    saidaTarde: "",
  });
  const [message, setMessage] = useState("");
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();
  const userId = auth.currentUser?.uid;
  const today = format(new Date(), "yyyy-MM-dd");
  const logoutTimeLimit = 30 * 60 * 1000; // 30 minutos em milissegundos

  // Função para logout manual
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  // Temporizador de inatividade
  useEffect(() => {
    const handleActivity = () => resetTimer();

    let logoutTimer = setTimeout(handleLogout, logoutTimeLimit);

    const resetTimer = () => {
      clearTimeout(logoutTimer);
      logoutTimer = setTimeout(handleLogout, logoutTimeLimit);
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keypress", handleActivity);

    return () => {
      clearTimeout(logoutTimer);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keypress", handleActivity);
    };
  }, []);

  // Atualiza o horário do servidor a cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setServerTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Função para carregar registros de ponto do dia atual
  const loadTodayEntries = async () => {
    if (!userId) return;

    const q = query(
      collection(db, "timeLogs"),
      where("userId", "==", userId),
      where("date", "==", today),
      orderBy("timestamp", "asc")
    );

    const querySnapshot = await getDocs(q);
    const entries = {
      entradaManha: "",
      saidaManha: "",
      entradaTarde: "",
      saidaTarde: "",
    };

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.action === "entradaManha")
        entries.entradaManha = data.timestamp
          .toDate()
          .toLocaleTimeString("pt-BR");
      if (data.action === "saidaManha")
        entries.saidaManha = data.timestamp
          .toDate()
          .toLocaleTimeString("pt-BR");
      if (data.action === "entradaTarde")
        entries.entradaTarde = data.timestamp
          .toDate()
          .toLocaleTimeString("pt-BR");
      if (data.action === "saidaTarde")
        entries.saidaTarde = data.timestamp
          .toDate()
          .toLocaleTimeString("pt-BR");
    });

    setTimeEntries(entries);
  };

  // Carrega as entradas do dia atual ao iniciar a página
  useEffect(() => {
    if (userId) {
      loadTodayEntries();
      setUserName(auth.currentUser?.displayName || ""); // Obtém o nome do usuário
    }
  }, [userId]);

  // Função para registrar entrada ou saída
  const handleRegister = async (type: "entrada" | "saida") => {
    if (!userId || !serverTime) return;

    let action: string | null = null;

    if (type === "entrada") {
      action = !timeEntries.entradaManha
        ? "entradaManha"
        : !timeEntries.entradaTarde
        ? "entradaTarde"
        : null;
    } else {
      action = !timeEntries.saidaManha
        ? "saidaManha"
        : !timeEntries.saidaTarde
        ? "saidaTarde"
        : null;
    }

    if (!action) {
      setMessage(`Todos os pontos de ${type} do dia já foram registrados.`);
      return;
    }

    try {
      const newEntry = {
        userId: userId,
        date: today,
        action: action,
        timestamp: Timestamp.fromDate(serverTime),
      };

      await addDoc(collection(db, "timeLogs"), newEntry);
      setMessage(
        `${type === "entrada" ? "Entrada" : "Saída"} registrada com sucesso!`
      );

      // Atualiza o estado para mostrar o novo ponto na interface
      setTimeEntries((prevEntries) => ({
        ...prevEntries,
        [action as keyof typeof timeEntries]:
          serverTime.toLocaleTimeString("pt-BR"),
      }));
    } catch (error) {
      console.error("Erro ao registrar o ponto:", error);
      setMessage("Erro ao registrar o ponto.");
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
        {serverTime && (
          <p className="text-center text-gray-400 mb-4">
            {serverTime.toLocaleDateString("pt-BR")}{" "}
            {serverTime.toLocaleTimeString("pt-BR")}
          </p>
        )}
        <div className="space-y-4 text-white">
          <div className="flex justify-between">
            <span>Entrada manhã:</span>
            <span>{timeEntries.entradaManha || "08:00"}</span>
          </div>
          <div className="flex justify-between">
            <span>Saída manhã:</span>
            <span>{timeEntries.saidaManha || "12:00"}</span>
          </div>
          <div className="flex justify-between">
            <span>Entrada tarde:</span>
            <span>{timeEntries.entradaTarde || "13:00"}</span>
          </div>
          <div className="flex justify-between">
            <span>Saída tarde:</span>
            <span>{timeEntries.saidaTarde || "18:00"}</span>
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
      </div>
    </div>
  );
};

export default TimeTrackingPage;
