// types/task.ts
export interface Task {
  id: string
  code?: string
  title: string
  description?: string | null
  status?: string
  priority?: number
  dueDate?: string | null
  scheduledAt?: string | null
  completedAt?: string | null
  failedAt?: string | null
  createdAt: string
  updatedAt: string
  fichaTecnica?: boolean
  companyId: string // ← ADICIONE ESTA LINHA
  
  // Relações
  column?: {
    id: string
    title: string
    status?: string
    order?: number
  } | null
  
  columnId?: string | null
  
  assignedTo?: {
    id: string
    name: string | null
    email?: string
  } | null
  
  assignedToId?: string | null
  
  createdBy?: {
    id: string
    name: string
    email?: string
  } | null
  
  createdById?: string
  
  completedBy?: {
    id: string
    name: string
  } | null
  
  completedById?: string | null
  
  route?: {
    id: string
    title: string
  } | null
  
  routeId?: string | null
  
  // Arquivos
  taskImages?: { 
    id: string
    url: string 
    filename: string
    size?: number
    createdAt?: string
  }[]
  
  taskAudios?: { 
    id: string
    url: string 
    filename: string
    size?: number
    duration?: number
    createdAt?: string
  }[]
  
  taskVideos?: { 
    id: string
    url: string 
    filename: string
    size?: number
    duration?: number
    createdAt?: string
  }[]
  
  taskAddress?: {
    id: string
    rua: string
    numero: string
    complemento?: string
    bairro: string
    cidade: string
    estado: string
    cep: string
  } | null
  
  // Para compatibilidade
  imageUrl?: string
  audioUrl?: string
  videoUrl?: string
}