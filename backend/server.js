// backend/api.js
const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Inicializando Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(require("./serviceAccountKey.json")),
});

// Cria um novo usuário e adiciona no Firestore
app.post("/create-user", async (req, res) => {
  const {
    email,
    password,
    displayName,
    cpf,
    birthDate,
    address,
    role,
    isAdmin,
  } = req.body;

  try {
    // Cria o usuário no Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
    });

    // Adiciona o usuário na coleção "employees" no Firestore
    const db = admin.firestore();
    await db.collection("employees").doc(userRecord.uid).set({
      uid: userRecord.uid,
      name: displayName,
      email,
      cpf,
      birthDate,
      address,
      role,
      isAdmin,
      status: "ativo",
    });

    res
      .status(201)
      .send({ message: "Usuário criado com sucesso", user: userRecord });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.post("/register-point", async (req, res) => {
  const { userId, timestamp, type } = req.body; // timestamp e tipo enviados pelo frontend
  const currentTime = new Date(timestamp);
  const dayStart = new Date(currentTime.setHours(0, 0, 0, 0)); // Início do dia
  const dayEnd = new Date(currentTime.setHours(23, 59, 59, 999)); // Fim do dia

  const scheduleLimits = {
    entradaManha: { start: "07:40", end: "08:05" },
    saidaManha: { start: "12:00", end: "12:10" },
    entradaTarde: { start: "12:50", end: "13:05" },
    saidaTarde: { start: "18:00", end: "18:10" },
  };

  try {
    // Verifica se o tipo é válido
    if (!scheduleLimits[type]) {
      return res.status(400).send({ error: "Tipo de ponto inválido." });
    }

    // Obtém os limites do tipo
    const [startHour, startMinute] = scheduleLimits[type].start.split(":");
    const [endHour, endMinute] = scheduleLimits[type].end.split(":");
    const startLimit = new Date(
      currentTime.setHours(startHour, startMinute, 0)
    );
    const endLimit = new Date(currentTime.setHours(endHour, endMinute, 59));

    // Verifica se está dentro do horário permitido
    if (currentTime < startLimit || currentTime > endLimit) {
      return res
        .status(400)
        .send({ error: `Horário fora do limite para ${type}.` });
    }

    // Verifica se já existem 4 registros para o dia
    const db = admin.firestore();
    const snapshot = await db
      .collection("timeTracking")
      .where("userId", "==", userId)
      .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(dayStart))
      .where("timestamp", "<=", admin.firestore.Timestamp.fromDate(dayEnd))
      .get();

    if (snapshot.size >= 4) {
      return res
        .status(400)
        .send({ error: "Máximo de 4 pontos por dia alcançado." });
    }

    // Registra o ponto no Firestore
    await db.collection("timeTracking").add({
      userId,
      type,
      timestamp: admin.firestore.Timestamp.fromDate(currentTime),
    });

    res.status(201).send({ message: "Ponto registrado com sucesso!" });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Endpoint para ativar/inativar um usuário
app.post("/toggle-user-status", async (req, res) => {
  const { uid, disabled } = req.body; // `uid` do usuário e `disabled` booleano

  try {
    await admin.auth().updateUser(uid, { disabled });
    res.status(200).send({
      message: `Usuário ${disabled ? "inativado" : "ativado"} com sucesso.`,
    });
  } catch (error) {
    res.status(500).send({
      error: error.message || "Erro ao atualizar status do usuário.",
    });
  }
});

// Iniciar o servidor
const PORT = 5000;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
