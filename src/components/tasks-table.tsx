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
import { Search, Filter, Download, Upload, Calendar, User, File } from "lucide-react"
import type { Task } from "@/types/task"

interface TasksTableProps {
  tasks: Task[]
  onTaskUpdated?: () => void | Promise<void> // ← TORNE OPCIONAL
}

export function TasksTable({ tasks: initialTasks, onTaskUpdated }: TasksTableProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [columnFilter, setColumnFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Atualiza a tabela quando chegam novas tarefas
  useEffect(() => {
    setTasks(initialTasks)
    setCurrentPage(1)
  }, [initialTasks])

  // Escuta eventos de atualização
  useEffect(() => {
    const handleUpdate = () => {
      console.log("Tabela de tarefas: atualizando...")
      if (onTaskUpdated) {
        onTaskUpdated()
      }
    }

    window.addEventListener("notificationReceived", handleUpdate)
    window.addEventListener("taskCreated", handleUpdate)
    window.addEventListener("taskMoved", handleUpdate)
    window.addEventListener("taskUpdated", handleUpdate)

    return () => {
      window.removeEventListener("notificationReceived", handleUpdate)
      window.removeEventListener("taskCreated", handleUpdate)
      window.removeEventListener("taskMoved", handleUpdate)
      window.removeEventListener("taskUpdated", handleUpdate)
    }
  }, [onTaskUpdated])

  // Filtros
  const filteredTasks = tasks.filter(task => {
    // Busca
    const matchesSearch = 
      task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.assignedTo?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Filtro por status
    const matchesStatus = statusFilter === "all" || task.status === statusFilter
    
    // Filtro por coluna
    const matchesColumn = columnFilter === "all" || task.column?.title === columnFilter
    
    return matchesSearch && matchesStatus && matchesColumn
  })

  // Paginação
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + itemsPerPage)

  // Opções para filtros
  const statusOptions = Array.from(new Set(
    tasks
      .map(task => task.status)
      .filter(Boolean) as string[]
  ))

  const columnOptions = Array.from(new Set(
    tasks
      .map(task => task.column?.title)
      .filter(Boolean) as string[]
  ))

  // Formatar data
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  // Obter cor do badge baseado no status
  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'default'
      case 'IN_PROGRESS':
        return 'secondary'
      case 'FAILED':
        return 'destructive'
      case 'PENDING':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  // Verificar se tarefa está atrasada
  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'COMPLETED') return false
    return new Date(task.dueDate) < new Date()
  }

  // Contar arquivos
  const countFiles = (task: Task) => {
    let count = 0
    if (task.taskImages && task.taskImages.length > 0) count += task.taskImages.length
    if (task.taskAudios && task.taskAudios.length > 0) count += task.taskAudios.length
    if (task.taskVideos && task.taskVideos.length > 0) count += task.taskVideos.length
    return count
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-2xl font-bold">Todas as Tarefas</CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Mostrando {paginatedTasks.length} de {filteredTasks.length} tarefas</span>
            <Badge variant="secondary" className="ml-2">
              {tasks.length} total
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Filtros e Busca */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tarefas por título, descrição, código ou responsável..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-8"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value)
                setCurrentPage(1)
              }}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === 'COMPLETED' ? 'Concluída' : 
                       status === 'IN_PROGRESS' ? 'Em Progresso' :
                       status === 'PENDING' ? 'Pendente' :
                       status === 'FAILED' ? 'Falhou' : status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={columnFilter} onValueChange={(value) => {
                setColumnFilter(value)
                setCurrentPage(1)
              }}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Coluna" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas colunas</SelectItem>
                  {columnOptions.map((column) => (
                    <SelectItem key={column} value={column || ""}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                <TableHead className="min-w-[200px]">Título</TableHead>
                <TableHead className="w-[120px]">Prioridade</TableHead>
                <TableHead className="w-[120px]">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Prazo
                  </div>
                </TableHead>
                <TableHead className="w-[100px]">
                  <div className="flex items-center">
                    <File className="h-4 w-4 mr-1" />
                    Arquivos
                  </div>
                </TableHead>
                <TableHead className="w-[150px]">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    Responsável
                  </div>
                </TableHead>
                <TableHead className="w-[120px]">Coluna</TableHead>
                <TableHead className="w-[140px]">Atualizado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTasks.length > 0 ? (
                paginatedTasks.map((task) => (
                  <TableRow 
                    key={task.id} 
                    className={`hover:bg-muted/50 transition-colors ${isOverdue(task) ? 'bg-red-50' : ''}`}
                  >
                    <TableCell>
                      <Badge 
                        variant={getStatusBadgeVariant(task.status)}
                        className="capitalize"
                      >
                        {task.status === 'COMPLETED' ? 'Concluída' : 
                         task.status === 'IN_PROGRESS' ? 'Em Progresso' :
                         task.status === 'PENDING' ? 'Pendente' :
                         task.status === 'FAILED' ? 'Falhou' : 
                         task.status || 'Sem status'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{task.title}</span>
                        {task.description && (
                          <span className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {task.description}
                          </span>
                        )}
                        {task.code && (
                          <span className="text-xs text-blue-600 font-mono mt-1">
                            #{task.code}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-2 ${
                          task.priority === 1 ? 'bg-green-500' :
                          task.priority === 2 ? 'bg-yellow-500' :
                          task.priority === 3 ? 'bg-orange-500' :
                          'bg-red-500'
                        }`} />
                        <span className="text-sm">
                          {task.priority === 1 ? 'Baixa' :
                           task.priority === 2 ? 'Média' :
                           task.priority === 3 ? 'Alta' :
                           task.priority === 4 ? 'Urgente' : 'Não definida'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {task.dueDate ? (
                        <div className="flex flex-col">
                          <span className={`text-sm font-medium ${
                            isOverdue(task) ? 'text-red-600' : 'text-gray-700'
                          }`}>
                            {formatDate(task.dueDate)}
                          </span>
                          {isOverdue(task) && (
                            <span className="text-xs text-red-500 font-medium">
                              Atrasada
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {countFiles(task) > 0 ? (
                          <>
                            <Badge variant="outline" className="text-xs">
                              {countFiles(task)} arquivo{countFiles(task) !== 1 ? 's' : ''}
                            </Badge>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {task.assignedTo ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {task.assignedTo.name || 'Sem nome'}
                          </span>
                          {task.assignedTo.email && (
                            <span className="text-xs text-muted-foreground">
                              {task.assignedTo.email}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">
                          Não atribuído
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {task.column ? (
                        <Badge variant="outline" className="capitalize">
                          {task.column.title}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(task.updatedAt)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center">
                      <Search className="h-12 w-12 text-gray-300 mb-4" />
                      <p className="text-lg font-medium text-gray-500 mb-2">
                        Nenhuma tarefa encontrada
                      </p>
                      <p className="text-sm text-gray-400">
                        {searchTerm || statusFilter !== 'all' || columnFilter !== 'all' 
                          ? "Tente ajustar os filtros de busca"
                          : "Crie uma nova tarefa para começar"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
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
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
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