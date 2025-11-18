# Kanban de Desenvolvimento de Produtos

Este é um sistema de quadro Kanban interativo, desenvolvido para gerenciar o fluxo de trabalho de desenvolvimento de produtos. A interface é moderna, responsiva e construída com as tecnologias mais recentes do ecossistema React.

## ✨ Funcionalidades Principais

O sistema oferece uma gama completa de funcionalidades para um gerenciamento de tarefas eficiente e intuitivo.

### 1. Quadro Kanban Dinâmico
- **Colunas Personalizáveis:** Crie, renomeie e exclua colunas dinamicamente para adaptar o fluxo de trabalho às necessidades do seu time.
- **Drag & Drop:** Mova tarefas entre as colunas de forma fluida com a funcionalidade de arrastar e soltar para atualizar o status.
- **Visualização Clara:** Cada coluna exibe um contador com o número de tarefas, oferecendo uma visão rápida da carga de trabalho.

### 2. Gerenciamento Completo de Tarefas
- **Criação de Tarefas:** Adicione novas tarefas através de um modal completo, incluindo:
  - Título e Descrição.
  - Atribuição a um profissional responsável.
  - Definição de prazo (`dueDate`) com data e hora.
  - **Upload de Imagens:** Anexe imagens para referências visuais.
  - **Gravação de Áudio:** Grave ou faça upload de áudios diretamente na tarefa, ideal para feedbacks e instruções rápidas.
- **Edição de Tarefas:** Modifique qualquer detalhe de uma tarefa existente, incluindo a substituição de mídias.
- **Exclusão de Tarefas:** Remova tarefas do quadro com uma confirmação para evitar exclusões acidentais.

### 3. Interface e Experiência do Usuário (UI/UX)
- **Design Moderno:** Interface limpa e profissional construída com **shadcn/ui** e **Tailwind CSS**.
- **Responsividade:** O layout se adapta a diferentes tamanhos de tela, com uma barra de rolagem horizontal para visualização completa do quadro em telas menores.
- **Feedback Visual:**
  - Indicadores de carregamento (`loading spinners`) durante a busca de dados.
  - Tarefas com prazo vencido são destacadas em vermelho.
  - Animações sutis ao adicionar ou mover tarefas.
- **Ícones Intuitivos:** Utilização da biblioteca `lucide-react` para uma iconografia clara e consistente.

## 🛠️ Tecnologias Utilizadas

- **Frontend:**
  - **Next.js:** Framework React para renderização no lado do servidor e cliente.
  - **React:** Biblioteca para construção de interfaces de usuário.
  - **TypeScript:** Superset do JavaScript que adiciona tipagem estática.
  - **Tailwind CSS:** Framework CSS utility-first para estilização rápida.
  - **shadcn/ui:** Coleção de componentes de UI reutilizáveis e acessíveis.
  - **Lucide React:** Biblioteca de ícones.

## 🔌 Backend API (Dependência)

Para o funcionamento completo, o frontend depende de uma API backend rodando localmente na porta `3002`.

**URL Base:** `http://localhost:3002`

**Endpoints Esperados:**
- `GET /kanban-columns`: Retorna a lista de colunas do quadro.
- `POST /kanban-columns`: Cria uma nova coluna.
- `PATCH /kanban-columns/:id`: Atualiza o título de uma coluna.
- `DELETE /kanban-columns/:id`: Exclui uma coluna.
- `GET /tasks`: Retorna a lista de todas as tarefas.
- `POST /tasks`: Cria uma nova tarefa (suporta `multipart/form-data` para upload de arquivos).
- `PUT /tasks/:id`: Atualiza uma tarefa existente.
- `DELETE /tasks/:id`: Exclui uma tarefa.
- `PATCH /tasks/:id/status`: Atualiza o status de uma tarefa.
- `GET /professionals`: Retorna a lista de profissionais para atribuição.

## 🚀 Como Executar o Projeto

1. **Clone o repositório:**
   ```bash
   git clone <url-do-seu-repositorio>
   cd <nome-do-diretorio>
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Execute o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

4. Abra http://localhost:3000 no seu navegador para ver o resultado.

> **Nota:** Certifique-se de que a API backend esteja rodando em `http://localhost:3002` para que o frontend possa buscar e manipular os dados.