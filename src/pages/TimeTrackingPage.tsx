import { useState, useEffect } from "react";
import {
  addDoc,
  collection,
  Timestamp,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { format } from "date-fns";
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
  const today = format(new Date(), "yyyy-MM-dd");

  const scheduleLimits = {
    entradaManha: { start: "07:40", end: "08:05" },
    saidaManha: { start: "12:00", end: "12:10" },
    entradaTarde: { start: "12:50", end: "13:05" },
    saidaTarde: { start: "18:00", end: "18:10" },
  };

  const getMinutesOfDay = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Função para obter o horário do servidor
  const fetchServerTime = async () => {
    const docRef = doc(collection(db, "serverTime"), "currentTime");
    await setDoc(docRef, { timestamp: serverTimestamp() }); // Atualiza o horário
    const snapshot = await getDoc(docRef);
    const serverTimestampData = snapshot.data()?.timestamp.toDate();
    setServerTime(serverTimestampData);
  };

  // Atualiza o horário do servidor ao montar o componente
  useEffect(() => {
    fetchServerTime();
    const interval = setInterval(fetchServerTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Função para logout manual
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

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
      setUserName(auth.currentUser?.displayName || "");
    }
  }, [userId]);

  // Função para determinar o próximo ponto válido
  const getNextValidAction = () => {
    if (!serverTime) return null;

    const currentMinutes = getMinutesOfDay(
      serverTime.toTimeString().slice(0, 5)
    );

    if (
      !timeEntries.entradaManha &&
      currentMinutes <= getMinutesOfDay(scheduleLimits.entradaManha.end)
    )
      return "entradaManha";
    if (
      !timeEntries.saidaManha &&
      currentMinutes >= getMinutesOfDay(scheduleLimits.entradaManha.end) &&
      currentMinutes <= getMinutesOfDay(scheduleLimits.saidaManha.end)
    )
      return "saidaManha";
    if (
      !timeEntries.entradaTarde &&
      currentMinutes >= getMinutesOfDay(scheduleLimits.saidaManha.end) &&
      currentMinutes <= getMinutesOfDay(scheduleLimits.entradaTarde.end)
    )
      return "entradaTarde";
    if (
      !timeEntries.saidaTarde &&
      currentMinutes >= getMinutesOfDay(scheduleLimits.entradaTarde.end)
    )
      return "saidaTarde";

    return null;
  };

  // Função para registrar entrada ou saída
  const handleRegister = async (type: "entrada" | "saida") => {
    if (!userId || !serverTime) return;

    const nextAction = getNextValidAction();

    if (!nextAction) {
      setErrorMessage(
        `Não é possível registrar ${type} no momento. Tente novamente no próximo horário válido.`
      );
      return;
    }

    try {
      const newEntry = {
        userId: userId,
        date: today,
        action: nextAction,
        timestamp: Timestamp.fromDate(serverTime),
      };

      await addDoc(collection(db, "timeLogs"), newEntry);
      setMessage(
        `${type === "entrada" ? "Entrada" : "Saída"} registrada com sucesso!`
      );
      setErrorMessage(""); // Limpa qualquer mensagem de erro anterior

      setTimeEntries((prevEntries) => ({
        ...prevEntries,
        [nextAction as keyof typeof timeEntries]:
          serverTime.toLocaleTimeString("pt-BR"),
      }));
    } catch (error) {
      console.error("Erro ao registrar o ponto:", error);
      setErrorMessage("Erro ao registrar o ponto.");
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
        {errorMessage && (
          <p className="mt-4 text-center text-red-400">{errorMessage}</p>
        )}
      </div>
    </div>
  );
};

export default TimeTrackingPage;
