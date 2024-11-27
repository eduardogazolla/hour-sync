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
  const { userId, timestamp, type } = req.body;
  const currentTime = new Date(timestamp);

  const scheduleLimits = {
    entradaManha: { start: "07:40", end: "08:05" },
    saidaManha: { start: "12:00", end: "12:10" },
    entradaTarde: { start: "12:50", end: "13:05" },
    saidaTarde: { start: "18:00", end: "18:10" },
  };

  try {
    if (!scheduleLimits[type]) {
      return res.status(400).send({ error: "Tipo de ponto inválido." });
    }

    const { start, end } = scheduleLimits[type];
    const [startHour, startMinute] = start.split(":");
    const [endHour, endMinute] = end.split(":");

    const startLimit = new Date(currentTime);
    startLimit.setHours(Number(startHour), Number(startMinute), 0);

    const endLimit = new Date(currentTime);
    endLimit.setHours(Number(endHour), Number(endMinute), 59);

    if (currentTime < startLimit || currentTime > endLimit) {
      return res.status(400).send({
        error: `Horário fora do limite permitido para ${type}.`,
      });
    }

    const db = admin.firestore();
    await db.collection("timeTracking").add({
      userId,
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

// Iniciar o servidor
const PORT = 5000;
app.listen(PORT, () =>
  console.log(`API rodando na porta http://localhost:${PORT}`)
);
