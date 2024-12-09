import { useState, useEffect } from "react";
import { doc, setDoc, updateDoc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebaseConfig";
import axios from "axios";

const TimeTrackingPage = () => {
  const [serverTime, setServerTime] = useState<Date | null>(null);
  const [timeEntries, setTimeEntries] = useState<Record<string, string>>({
    entradaManha: "",
    saidaManha: "",
    entradaTarde: "",
    saidaTarde: "",
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState("");

  const navigate = useNavigate();
  const userId = auth.currentUser?.uid;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Função para upload e salvar justificativa
  const handleFileUpload = async () => {
    if (!selectedFile || !selectedTimeSlot || !userId || !serverTime) {
      setUploadMessage("Por favor, selecione um arquivo e um horário para justificar.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      // Faz o upload do arquivo para o servidor
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/upload-justification`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const fileUrl = response.data.fileUrl; // URL retornada pelo servidor
      const today = new Date(serverTime || new Date())
        .toISOString()
        .split("T")[0];
      const userDocRef = doc(db, "timeLogs", `${userId}_${today}`);

      // Verificar se o documento já existe
    const docSnapshot = await getDoc(userDocRef);
    if (!docSnapshot.exists()) {
      // Se o documento não existir, cria um novo
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

      // Atualiza o Firebase com a URL da justificativa
      await updateDoc(userDocRef, {
        [`entries.${selectedTimeSlot}Justification`]: fileUrl,
      });

      // Atualiza o estado local para refletir na interface
      setTimeEntries((prevEntries) => ({
        ...prevEntries,
        [`${selectedTimeSlot}Justification`]: response.data.fileUrl,
      }));

      setUploadMessage("Justificativa enviada e salva com sucesso!");
      setSelectedFile(null);
      setSelectedTimeSlot(null);
    } catch (error) {
      console.error("Erro ao enviar o arquivo:", error);
      setUploadMessage("Erro ao enviar ou salvar o arquivo. Tente novamente.");
    }
  };

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
    entradaTarde: { start: "12:50", end: "13:10" },
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
        const simulatedDate = "2024-11-28"; // Ajuste a data simulada
        const simulatedTime = "17:00"; // Ajuste o horário simulado (HH:mm)

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
    const { start, end } =
      scheduleLimits[action as keyof typeof scheduleLimits];

    const withinSchedule = currentTime >= start && currentTime <= end;
    const message = `O horário permitido para ${action.replace(
      /([A-Z])/g,
      " $1"
    )} é das ${start} às ${end}.`;

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
      setErrorMessage(
        `Nenhum horário permitido para ${type} está disponível no momento.`
      );
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
        `${type === "entrada" ? "Entrada" : "Saída"} registrada com sucesso!`
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
          <p className="text-center text-gray-400 mb-6">
            Bem-vindo, {userDisplayName}
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
          {(
            [
              "entradaManha",
              "saidaManha",
              "entradaTarde",
              "saidaTarde",
            ] as Array<keyof typeof timeEntries>
          ).map((key) => (
            <div key={key} className="flex justify-between items-center">
              <span className="capitalize">
                {key.replace(/([A-Z])/g, " $1")}:
              </span>
              <span>
                {timeEntries[key] ||
                  (timeEntries[`${key}Justification`]
                    ? "Justificado"
                    : "--:--")}
              </span>
              {!timeEntries[key] &&
                !timeEntries[`${key}Justification`] && ( // Exibir botão apenas se o horário e a justificativa estiverem vazios
                  <button
                    onClick={() => setSelectedTimeSlot(key)}
                    className="ml-4 text-blue-400 underline text-sm"
                  >
                    Justificar
                  </button>
                )}
            </div>
          ))}
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
        {selectedTimeSlot && (
          <div className="mt-6">
            <p className="text-gray-300 text-sm mb-2">
              Justificar {selectedTimeSlot.replace(/([A-Z])/g, " $1")}
            </p>
            <input
              type="file"
              onChange={handleFileChange}
              className="w-full bg-gray-700 text-white rounded py-2 px-3"
            />
            <button
              onClick={handleFileUpload}
              className="w-full bg-blue-600 text-white py-2 mt-4 rounded hover:bg-blue-700 transition"
            >
              Enviar Justificativa
            </button>
            {uploadMessage && (
              <p className="mt-2 text-center text-green-400">{uploadMessage}</p>
            )}
          </div>
        )}
        <div>
          {message && (
            <p className="mt-4 text-center text-green-400">{message}</p>
          )}
          {errorMessage && (
            <p className="mt-4 text-center text-red-400">{errorMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimeTrackingPage;
