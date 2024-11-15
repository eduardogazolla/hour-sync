import { auth, db } from "../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";

export const registerUser = async (
  email: string,
  password: string,
  isAdmin: boolean
) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Adiciona o usuário no Firestore com o campo isAdmin
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      isAdmin: isAdmin,
    });

    console.log("Usuário registrado com sucesso!");
  } catch (error) {
    console.error("Erro ao registrar usuário:", error);
  }
};
