import { useNavigate } from "react-router-dom";
import { auth } from "../firebaseConfig";

const Dashboard = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Cabeçalho */}
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="container mx-auto mt-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card de Funcionários */}
          <div className="bg-white p-4 rounded shadow-md">
            <h2 className="text-xl font-semibold mb-2">Funcionários</h2>
            <p>Gerencie todos os funcionários registrados.</p>
            <button
              className="mt-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
              onClick={() => navigate("/employees")}
            >
              Ver Funcionários
            </button>
          </div>

          {/* Card de Relatórios */}
          <div className="bg-white p-4 rounded shadow-md">
            <h2 className="text-xl font-semibold mb-2">Relatórios</h2>
            <p>Gere relatórios de ponto e registros.</p>
            <button
              className="mt-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
              onClick={() => navigate("/reports")}
            >
              Gerar Relatórios
            </button>
          </div>

          {/* Card de Registro de Ponto */}
          <div className="bg-white p-4 rounded shadow-md">
            <h2 className="text-xl font-semibold mb-2">Registro de Ponto</h2>
            <p>Acompanhe os registros de ponto de funcionários.</p>
            <button
              className="mt-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
              onClick={() => navigate("/time-logs")}
            >
              Ver Registros
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
