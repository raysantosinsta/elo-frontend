// "use client";
// import { useEffect, useState } from "react";
// NEW VERSION
// app/tasks/page.tsx - Versão com API real
// import { TasksTable } from "@/components/tasks/tasks-table"

import { TasksTable } from "@/components/tasks-table"


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
