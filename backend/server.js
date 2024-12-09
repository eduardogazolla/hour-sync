// backend/server.js
require('dotenv').config();
const express = require("express");
const admin = require("firebase-admin");
const schedule = require("node-schedule");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// Inicializando Firebase Admin SDK

// Inicializa o Firebase Admin SDK com as variáveis de ambiente
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Formato de arquivo não suportado."));
    }
  },
});

// Endpoint para upload de justificativas
app.post("/upload-justification", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ error: "Nenhum arquivo enviado!" });
    }
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    res.status(200).send({ fileUrl });
  } catch (error) {
    console.error("Erro no upload:", error.message);
    res.status(500).send({ error: "Erro interno no servidor." });
  }
});

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Middleware para servir arquivos estáticos da pasta uploads
app.post('/uploads', (req, res) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Erros relacionados ao multer
      return res.status(400).json({ error: err.message });
    } else if (err) {
      // Outros erros
      return res.status(500).json({ error: 'Erro no servidor' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    res.status(200).json({ message: 'Upload bem-sucedido', file: req.file });
  });
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const createDailyLogs = async () => {
  try {
    const today = new Date().toISOString().split("T")[0]; // Data atual no formato YYYY-MM-DD
    const employeesSnapshot = await db.collection("employees").get();

    employeesSnapshot.forEach(async (doc) => {
      const userId = doc.id;
      const userName = doc.data().name;

      // Verifica se já existe um registro de ponto para hoje
      const logsRef = db.collection("timeLogs");
      const logSnapshot = await logsRef
        .where("userId", "==", userId)
        .where("date", "==", today)
        .get();

      if (logSnapshot.empty) {
        // Cria um novo registro para hoje
        await logsRef.add({
          userId,
          userName,
          date: today,
          entries: {
            entradaManha: "",
            saidaManha: "",
            entradaTarde: "",
            saidaTarde: "",
          },
        });
        console.log(`Novo registro criado para ${userName}`);
      }
    });
  } catch (error) {
    console.error("Erro ao criar registros diários:", error);
  }
};

// Agendar a verificação para rodar todo dia à meia-noite
schedule.scheduleJob("0 0 * * *", createDailyLogs);

// Cria um novo usuário e adiciona no Firestore
app.post("/create-user", async (req, res) => {
  const {
    email,
    password,
    displayName,  // nome do usuário
    cpf,
    birthDate,
    address,
    role,
    isAdmin,
    sector,
  } = req.body;

  // Validação dos dados
  if (!email || !password || !displayName || !cpf || !birthDate) {
    return res.status(400).send({ error: "Todos os campos obrigatórios devem ser preenchidos." });
  }

  // Verifique se o email já está em uso
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    if (userRecord) {
      return res.status(400).send({ error: "O email já está em uso." });
    }
  } catch (error) {
    // Se o erro for "user not found", significa que o email não está em uso, o que é esperado
    if (error.code !== "auth/user-not-found") {
      return res.status(500).send({ error: "Erro ao verificar o email." });
    }
  }

  try {
    // Cria o usuário no Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,  // displayName será o "name" do funcionário
    });

    // Adiciona o usuário na coleção "employees" no Firestore
    const db = admin.firestore();
    await db.collection("employees").doc(userRecord.uid).set({
      uid: userRecord.uid,
      name: displayName,
      email,
      cpf,
      birthDate,
      address: address || {},  // Certifique-se de que o address não seja undefined
      role,
      isAdmin: isAdmin || false, // Valor padrão para isAdmin
      sector: sector || "",  // Se não fornecido, deixe como string vazia
      status: "ativo",  // Status fixo como "ativo"
    });

    res.status(201).send({ message: "Usuário criado com sucesso", user: userRecord });
  } catch (error) {
    console.error("Erro ao criar o usuário:", error.message);
    res.status(500).send({ error: error.message });
  }
});


// Atualizar usuário no Firebase Authentication
app.post("/update-user", async (req, res) => {
  const { uid, email, name, cpf, birthDate, address, role, isAdmin, sector, status } = req.body;

  try {
    // Verificar se o usuário existe no Firebase Authentication
    const userRecord = await admin.auth().getUser(uid);

    // Atualizar os dados no Firebase Authentication
    await admin.auth().updateUser(uid, {
      email,
      displayName: name,
    });

    // Atualizar os dados no Firestore
    const db = admin.firestore();
    const employeeRef = db.collection("employees").doc(uid);

    // Atualiza apenas os campos enviados para evitar sobrescrever outros valores existentes
    const updatedData = {
      email: email || userRecord.email,
      name: name || userRecord.displayName,
      cpf: cpf || "",
      birthDate: birthDate || "",
      address: {
        street: address?.street || "",
        number: address?.number || "",
        complement: address?.complement || "",
        neighborhood: address?.neighborhood || "",
        city: address?.city || "",
        state: address?.state || "",
        zipCode: address?.zipCode || "",
      },
      role: role || "",
      isAdmin: isAdmin !== undefined ? isAdmin : false,
      sector: sector || "",
      status: status || "ativo",
    };

    await employeeRef.update(updatedData);

    return res.status(200).json({
      message: "Usuário atualizado com sucesso.",
      updatedData,
    });
  } catch (error) {
    console.error("Erro ao atualizar o usuário:", error);

    return res.status(500).json({
      error: error.message || "Erro desconhecido ao atualizar o usuário.",
    });
  }
});

app.post("/register-point", async (req, res) => {
  const { userId, timestamp, type, userName } = req.body;

  // Validação inicial
  if (!userId || !timestamp || !type || !userName) {
    return res.status(400).send({ error: "Dados incompletos fornecidos." });
  }

  const currentTime = new Date(timestamp);

  // Log do horário recebido para depuração
  console.log("Timestamp recebido:", timestamp);
  console.log("Horário interpretado:", currentTime.toISOString());

  // Configuração dos limites de horários
  const scheduleLimits = {
    entradaManha: { start: "07:40", end: "08:05" },
    saidaManha: { start: "12:00", end: "12:10" },
    entradaTarde: { start: "12:50", end: "13:05" },
    saidaTarde: { start: "17:00", end: "17:10" },
  };

  try {
    // Verifica se o tipo de ponto é válido
    if (!scheduleLimits[type]) {
      console.error("Tipo de ponto inválido:", type);
      return res.status(400).send({ error: "Tipo de ponto inválido." });
    }

    const { start, end } = scheduleLimits[type];
    const [startHour, startMinute] = start.split(":");
    const [endHour, endMinute] = end.split(":");

    const startLimit = new Date(currentTime);
    startLimit.setHours(Number(startHour), Number(startMinute), 0);

    const endLimit = new Date(currentTime);
    endLimit.setHours(Number(endHour), Number(endMinute), 59);

    // Logs para depuração de horários
    console.log(`Validando ${type}:`);
    console.log("Horário atual:", currentTime.toISOString());
    console.log("Início permitido:", startLimit.toISOString());
    console.log("Fim permitido:", endLimit.toISOString());

    // Valida o horário do ponto
    if (currentTime < startLimit || currentTime > endLimit) {
      return res.status(400).send({
        error: `Horário fora do limite permitido para ${type}. O horário permitido é das ${start} às ${end}.`,
      });
    }

    // Valida se é fim de semana
    const dayOfWeek = currentTime.getDay(); // 0 = Domingo, 6 = Sábado
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return res.status(400).send({
        error: "Registro de ponto não permitido em fins de semana.",
      });
    }

    // Salva no Firestore apenas se todas as condições forem satisfeitas
    const db = admin.firestore();
    await db.collection("timeTracking").add({
      userId,
      userName,
      type,
      timestamp: admin.firestore.Timestamp.fromDate(currentTime),
    });

    res.status(201).send({ message: "Ponto registrado com sucesso!" });
  } catch (error) {
    console.error("Erro ao registrar ponto:", error);
    res.status(500).send({ error: "Erro ao registrar ponto." });
  }
});


// Endpoint para ativar/inativar um usuário
app.post("/toggle-user-status", async (req, res) => {
  const { uid, disabled } = req.body;

  try {
    await admin.auth().updateUser(uid, { disabled });
    res.status(200).send({
      message: `Usuário ${disabled ? "inativado" : "ativado"} com sucesso.`,
    });
  } catch (error) {
    console.error("Erro ao atualizar status do usuário:", error);
    res.status(500).send({
      error:
        error.message ||
        "Erro ao atualizar status do usuário. Verifique a configuração.",
    });
  }
});

app.post("/", async (req, res) => {
  const { email } = req.body;

  try {
    const db = admin.firestore();
    const snapshot = await db
      .collection("employees")
      .where("email", "==", email)
      .get();

    if (snapshot.empty) {
      return res.status(404).send({ error: "Usuário não encontrado." });
    }

    const userData = snapshot.docs[0].data();
    res.status(200).send({ isAdmin: userData.isAdmin });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.get("/", (req, res) => {
  res.send("Backend funcionando!");
});

// Iniciar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Servidor rodando na porta http://localhost:${PORT}`)
);
