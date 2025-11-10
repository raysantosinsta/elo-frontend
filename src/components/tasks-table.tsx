// components/tasks/tasks-table.tsx
"use client"

import { useState, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Filter, Download, Upload } from "lucide-react"

interface Task {
  id: string
  code: string
  title: string
  description?: string
  statusId?: string
  column?: {
    title: string
  }
  dueDate?: string
  assignedTo?: {
    name: string
  }
  imageUrl?: string
  audioUrl?: string
  fichaTecnica: boolean
  createdAt: string
  updatedAt: string
}

interface TasksTableProps {
  tasks: Task[]
}

export function TasksTable({ tasks: initialTasks }: TasksTableProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filtros
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.code?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || task.column?.title === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Paginação
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + itemsPerPage)

  // Status únicos para o filtro
  const statusOptions = Array.from(new Set(tasks.map(task => task.column?.title).filter(Boolean)))

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-2xl font-bold">TODAS AS TAREFAS</CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Mostrando {paginatedTasks.length} de {filteredTasks.length} registros</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Filtros e Busca */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tarefas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status || ""}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button size="sm">
              <Download className="h-4 w-4 mr-2" />
              Importar
            </Button>
          </div>
        </div>

        {/* Tabela */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[150px]">Tipo de Títulos</TableHead>
                <TableHead className="min-w-[200px]">Título</TableHead>
                <TableHead className="w-[120px]">Prazo</TableHead>
                <TableHead className="min-w-[250px]">Anexos</TableHead>
                <TableHead className="w-[150px]">Responsáveis</TableHead>
                <TableHead className="w-[140px]">Alterado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTasks.length > 0 ? (
                paginatedTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className="capitalize"
                      >
                        {task.column?.title || "Sem status"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {task.fichaTecnica ? "Ficha Técnica" : "Tarefa"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{task.title}</span>
                        {task.description && (
                          <span className="text-sm text-muted-foreground">
                            {task.description}
                          </span>
                        )}
                        <span className="text-xs text-blue-600 font-mono">
                          #{task.code}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {task.dueDate ? (
                        <span className={`text-sm ${
                          new Date(task.dueDate) < new Date() 
                            ? "text-red-600 font-medium" 
                            : "text-muted-foreground"
                        }`}>
                          {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {task.imageUrl && (
                          <span className="text-sm text-blue-600 cursor-pointer hover:underline">
                            📎 Imagem
                          </span>
                        )}
                        {task.audioUrl && (
                          <span className="text-sm text-blue-600 cursor-pointer hover:underline">
                            🎵 Áudio
                          </span>
                        )}
                        {!task.imageUrl && !task.audioUrl && (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {task.assignedTo ? (
                        <span className="text-sm font-medium">
                          {task.assignedTo.name}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(task.updatedAt).toLocaleDateString('pt-BR')}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma tarefa encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}