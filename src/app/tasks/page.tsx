// "use client";
// import { useEffect, useState } from "react";

import { TasksTable } from "@/components/tasks-table"

// interface Task {
//   id: string;
//   title: string;
//   status: string;
//   dueDate?: string;
//   professionalName?: string;
// }

// export default function TasksTablePage() {
//   const [tasks, setTasks] = useState<Task[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     fetch("http://localhost:3002/tasks")
//       .then((res) => res.json())
//       .then((data) => setTasks(data))
//       .finally(() => setLoading(false));
//   }, []);

//   const getStatusColor = (status: string) => {
//     switch (status) {
//       case "done":
//         return "bg-green-200 text-green-800";
//       case "doing":
//         return "bg-blue-200 text-blue-800";
//       default:
//         return "bg-gray-200 text-gray-800";
//     }
//   };

//   const isLate = (date?: string) =>
//     date && new Date(date) < new Date() && date !== undefined;

//   if (loading) return <p className="p-6">Carregando...</p>;

//   return (
//     <div className="p-6">
//       <h2 className="text-xl font-semibold mb-6">📊 Tarefas - Relatório Geral</h2>

//       <div className="overflow-x-auto bg-white border rounded-lg shadow-sm">
//         <table className="w-full text-sm text-gray-700">
//           <thead className="bg-gray-100 border-b">
//             <tr>
//               <th className="p-3 text-left">Título</th>
//               <th className="p-3 text-left">Status</th>
//               <th className="p-3 text-left">Prazo</th>
//               <th className="p-3 text-left">Responsável</th>
//               <th className="p-3 text-left">Situação</th>
//             </tr>
//           </thead>

//           <tbody>
//             {tasks.map((task) => (
//               <tr key={task.id} className="border-b hover:bg-gray-50">
//                 <td className="p-3">{task.title}</td>

//                 <td className="p-3">
//                   <span className={`px-2 py-1 rounded text-xs ${getStatusColor(task.status)}`}>
//                     {task.status.toUpperCase()}
//                   </span>
//                 </td>

//                 <td className="p-3">
//                   {task.dueDate
//                     ? new Date(task.dueDate).toLocaleString("pt-BR")
//                     : "—"}
//                 </td>

//                 <td className="p-3">{task.professionalName || "—"}</td>

//                 <td className="p-3 font-medium">
//                   {isLate(task.dueDate) ? (
//                     <span className="text-red-600">Atrasada</span>
//                   ) : (
//                     <span className="text-green-700">Ok ✅</span>
//                   )}
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

// NEW VERSION
// app/tasks/page.tsx - Versão com API real
// import { TasksTable } from "@/components/tasks/tasks-table"

async function getTasks() {
  try {
    const res = await fetch('http://localhost:3002/tasks', {
      next: { revalidate: 60 } // Revalida a cada 60 segundos
    })
    
    if (!res.ok) {
      throw new Error('Falha ao carregar tarefas')
    }
    
    const data = await res.json()
    return Array.isArray(data) ? { tasks: data } : data
  } catch (error) {
    console.error('Erro ao carregar tarefas:', error)
    return { tasks: [] }
  }
}

export default async function TasksPage() {
  const data = await getTasks()

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">TODAS AS TAREFAS</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie e acompanhe todas as tarefas do sistema
        </p>
      </div>

      <TasksTable tasks={data.tasks} />
    </div>
  )
}
