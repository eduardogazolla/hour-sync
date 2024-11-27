import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { useNavigate } from "react-router-dom";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [resendDisabled, setResendDisabled] = useState(true);

  const handleResetPassword = async () => {
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage(
        "Um e-mail de redefinição foi enviado. Verifique sua caixa de entrada."
      );
      setResendDisabled(true);
      setTimeout(() => setResendDisabled(false), 30000); // Habilita o botão de reenviar após 30 segundos
    } catch (error: any) {
      setMessage(
        error.code === "auth/user-not-found"
          ? "E-mail não encontrado. Verifique e tente novamente."
          : "Erro ao enviar e-mail. Tente novamente."
      );
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-md shadow-md w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-white mb-4">
          Redefinir senha
        </h2>
        <p className="text-center text-gray-400 mb-6">
          Insira seu endereço de e-mail e lhe enviaremos instruções para
          redefinir sua senha.
        </p>
        {message && (
          <p className="text-center text-green-400 mb-4">{message}</p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleResetPassword();
          }}
          className="space-y-4"
        >
          <input
            type="email"
            placeholder="E-mail ou usuário"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            className="w-full py-3 rounded bg-green-600 text-white font-bold hover:bg-green-700 transition"
          >
            Continuar
          </button>
        </form>
        <button
          onClick={handleResetPassword}
          className={`mt-4 w-full text-sm ${
            resendDisabled
              ? "text-gray-600 cursor-not-allowed"
              : "text-blue-400 hover:text-blue-500"
          }`}
          disabled={resendDisabled}
        >
          Reenviar e-mail
        </button>
        <button
          onClick={() => navigate("/")}
          className="mt-4 w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700 transition font-bold"
        >
          Voltar
        </button>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
