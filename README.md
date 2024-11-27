# Sistema de Gestão de Funcionários e Relatórios de Pontos

Este projeto é uma aplicação web desenvolvida para gerenciar funcionários e registrar pontos. Administradores têm acesso a funcionalidades de gerenciamento e geração de relatórios detalhados.

## Funcionalidades

### Admin Dashboard
- Listagem de funcionários separados por administradores e colaboradores.
- Opção de adicionar, editar, e alterar o status de funcionários.
- Barra de pesquisa para encontrar funcionários por nome, e-mail, função ou setor.
- Navegação para relatórios de pontos de cada funcionário.

### Relatório de Pontos
- Exibição de dados completos do funcionário.
- Filtros por data e mês para visualizar os pontos registrados.
- Edição de registros de horários de entrada e saída diretamente no relatório.

### Modais
- **Modal de Cadastro:** Adiciona novos funcionários com campos como nome, CPF, e-mail, função, setor, etc.
- **Modal de Edição:** Permite atualizar informações de um funcionário existente.
- **Modal de Edição de Pontos:** Permite ajustar os horários de entrada e saída dos registros de ponto.

## Tecnologias Utilizadas

### Frontend
- **React**: Framework para construção da interface do usuário.
- **TypeScript**: Linguagem para aumentar a robustez do código.
- **TailwindCSS**: Estilização personalizada para componentes e tabelas.

### Backend
- **Node.js**: Servidor backend para integração com o Firebase.
- **Firebase Firestore**: Banco de dados NoSQL para armazenar informações de funcionários e pontos.
- **Firebase Authentication**: Gerenciamento de autenticação de usuários.

### Ferramentas e Bibliotecas
- **React Router**: Para navegação entre páginas.
- **Firebase SDK**: Para integração com serviços Firebase.
- **Icons (Material UI)**: Para botões e ações visuais.

## Estrutura do Projeto

- **backend**
  - `server.js`: Configuração do servidor backend usando Node.js.

- **src**
  - **components**: Contém modais e componentes principais como `AdminDashboard` e `EmployeeReport`.
  - **contexts**: Implementação do contexto de autenticação.
  - **firebaseConfig.ts**: Configuração do Firebase.
  - **styles**: Arquivos CSS para estilização global e componentes específicos.

## Como Executar o Projeto

### Passo 1: Clone o repositório
   ```bash
   git clone https://github.com/eduardogazolla/ponto-facil-1
   ```

### Passo 2: Configure o Firebase:

- Crie um projeto no Firebase.
- Ative o Firestore Database e Authentication.
- Substitua as configurações no arquivo firebaseConfig.ts.\

### Passo 3: Inicializar o Backend
1. Certifique-se de estar na pasta `backend`:
   ```bash
   cd backend
   ```
2. Instale as dependências:
    ```bash
    npm install
    ```
3. Inicie o servidor backend:
    ```bash
    node server.js
    ```

### Passo 4: Inicializar o Frontend
1. Retorne para a pasta raiz do projeto:
    ```bash
    cd ..
    ```
2. Instale as dependências:
    ```bash
    npm install
    ```
3. Inicie o frontend:
    ```bash
    npm run dev
    ```
4. Acesse no navegador:
    http://localhost:5137

## Estrutura de Dados no Firestore
### Employees
- name: Nome do funcionário.
- cpf: CPF do funcionário.
- email: E-mail do funcionário.
- role: Função do funcionário.
- setor: Setor do funcionário.
- isAdmin: Booleano indicando se o funcionário é administrador.
- status: Status do funcionário (ativo/inativo).
### TimeLogs
- userId: ID do funcionário.
- userName: Nome do funcionário.
- date: Data do registro.
- entries:
  - entradaManha, saidaManha, entradaTarde, saidaTarde: Horários - registrados.

## Melhorias Futuras
- Adicionar gráficos nos relatórios para visualização de dados.
- Melhoria no documento exportado em PDF.
- Limitação de uso por IP.

## Contato
Para dúvidas ou sugestões, entre em contato com o desenvolvedor.
[Eduardo Gazolla](https://github.com/eduardogazolla)