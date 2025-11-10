/* eslint-disable @typescript-eslint/no-explicit-any */
// // "use client";

// // import { useState, useEffect, useRef } from "react";
// // import { motion, AnimatePresence } from "framer-motion";
// // import Router from "next/router";

// // interface Professional {
// //   id: string;
// //   name: string;
// //   role: string;
// //   contact?: string;
// // }

// // interface Task {
// //   id: string;
// //   title: string;
// //   description: string;
// //   status: "A Fazer" | "Em Progresso" | "Revisão" | "Concluído";
// //   dueDate: string;
// //   assignedTo: Professional;
// //   assignedToId: string;
// //   createdAt: string;
// //   updatedAt: string;
// //   imageUrl?: string;
// //   audioUrl?: string;
// //   routes?: { name: string; address: string }[]; // <-- nova propriedade opcional
// // }

// // const ProfessionalKanban = () => {
// //   const [tasks, setTasks] = useState<Task[]>([]);
// //   const [professionals, setProfessionals] = useState<Professional[]>([]);
// //   const [loading, setLoading] = useState(true);
// //   const [error, setError] = useState<string | null>(null);
// //   const [selectedTask, setSelectedTask] = useState<Task | null>(null);
// //   const [isModalOpen, setIsModalOpen] = useState(false);
// //   const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
// //   const [newTask, setNewTask] = useState({
// //     title: "",
// //     description: "",
// //     status: "A Fazer" as Task["status"],
// //     dueDate: "",
// //     assignedToId: "",
// //     image: null as File | null,
// //     audio: null as Blob | null,
// //     routes: [] as { name: string; address: string }[], // <-- NOVO
// //   });
// //   const [isSubmitting, setIsSubmitting] = useState(false);

// //   // Estados para gravação de áudio
// //   const [isRecording, setIsRecording] = useState(false);
// //   const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
// //   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
// //   const audioChunksRef = useRef<Blob[]>([]);
// //   const [recordingTime, setRecordingTime] = useState(0);

// //   const [isClient, setIsClient] = useState(false);

// //   const columns = [
// //     {
// //       id: "A Fazer",
// //       title: "A Fazer",
// //       color: "bg-blue-500",
// //       textColor: "text-blue-700",
// //     },
// //     {
// //       id: "Em Progresso",
// //       title: "Em Progresso",
// //       color: "bg-yellow-500",
// //       textColor: "text-yellow-700",
// //     },
// //     {
// //       id: "Revisão",
// //       title: "Em Revisão",
// //       color: "bg-purple-500",
// //       textColor: "text-purple-700",
// //     },
// //     {
// //       id: "Concluído",
// //       title: "Concluído",
// //       color: "bg-green-500",
// //       textColor: "text-green-700",
// //     },
// //   ];

// //   useEffect(() => {
// //     setIsClient(true);
// //     fetchData();
// //   }, []);

// //   // Temporizador para gravação
// //   useEffect(() => {
// //     let interval: NodeJS.Timeout | null = null;
// //     if (isRecording) {
// //       interval = setInterval(() => {
// //         setRecordingTime((prev) => prev + 1);
// //       }, 1000);
// //     }
// //     return () => {
// //       if (interval) clearInterval(interval);
// //     };
// //   }, [isRecording]);

// //   const fetchData = async () => {
// //     try {
// //       setLoading(true);
// //       setError(null);

// //       const professionalsResponse = await fetch(
// //         "http://localhost:3002/professionals"
// //       );
// //       if (!professionalsResponse.ok) {
// //         throw new Error(
// //           `Erro ao buscar profissionais: ${professionalsResponse.status}`
// //         );
// //       }
// //       const professionalsText = await professionalsResponse.text();
// //       let professionalsData;
// //       try {
// //         professionalsData = professionalsText
// //           ? JSON.parse(professionalsText)
// //           : [];
// //       } catch (parseError) {
// //         console.error(
// //           "Erro ao parsear profissionais:",
// //           parseError,
// //           "Response:",
// //           professionalsText
// //         );
// //         professionalsData = [];
// //       }
// //       const professionalsArray = Array.isArray(professionalsData)
// //         ? professionalsData
// //         : [];
// //       setProfessionals(professionalsArray);

// //       const tasksResponse = await fetch("http://localhost:3002/tasks");
// //       if (!tasksResponse.ok) {
// //         console.log("Nenhuma task encontrada ou erro na API");
// //         setTasks([]);
// //         return;
// //       }
// //       const tasksText = await tasksResponse.text();
// //       let tasksData;
// //       try {
// //         tasksData = tasksText ? JSON.parse(tasksText) : [];
// //       } catch (parseError) {
// //         console.error(
// //           "Erro ao parsear tasks:",
// //           parseError,
// //           "Response:",
// //           tasksText
// //         );
// //         tasksData = [];
// //       }
// //       const tasksArray = Array.isArray(tasksData) ? tasksData : [];
// //       tasksArray.sort(
// //         (a, b) =>
// //           new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
// //       );
// //       setTasks(tasksArray);
// //     } catch (error) {
// //       console.error("Erro ao buscar dados:", error);
// //       setError(
// //         "Erro ao carregar dados. Verifique se o servidor está rodando na porta 3002."
// //       );
// //       setProfessionals([]);
// //       setTasks([]);
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   const updateTaskStatus = async (
// //     taskId: string,
// //     newStatus: Task["status"]
// //   ) => {
// //     try {
// //       const response = await fetch(`http://localhost:3002/tasks/${taskId}`, {
// //         method: "PATCH",
// //         headers: {
// //           "Content-Type": "application/json",
// //         },
// //         body: JSON.stringify({ status: newStatus }),
// //       });

// //       if (response.ok) {
// //         setTasks((prev) =>
// //           prev.map((task) =>
// //             task.id === taskId ? { ...task, status: newStatus } : task
// //           )
// //         );
// //       }
// //     } catch (error) {
// //       console.error("Erro ao atualizar task:", error);
// //     }
// //   };

// //   const deleteTask = async (taskId: string) => {
// //     if (!confirm("Tem certeza que deseja apagar esta tarefa?")) return;

// //     try {
// //       const response = await fetch(`http://localhost:3002/tasks/${taskId}`, {
// //         method: "DELETE",
// //       });

// //       if (response.ok) {
// //         setTasks((prev) => prev.filter((task) => task.id !== taskId));
// //       } else {
// //         console.error("Erro ao deletar task");
// //       }
// //     } catch (error) {
// //       console.error("Erro ao deletar:", error);
// //     }
// //   };

// //   const startRecording = async () => {
// //     try {
// //       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
// //       mediaRecorderRef.current = new MediaRecorder(stream);
// //       audioChunksRef.current = [];

// //       mediaRecorderRef.current.ondataavailable = (event) => {
// //         if (event.data.size > 0) {
// //           audioChunksRef.current.push(event.data);
// //         }
// //       };

// //       mediaRecorderRef.current.onstop = () => {
// //         const audioBlob = new Blob(audioChunksRef.current, {
// //           type: "audio/webm",
// //         });
// //         setNewTask((prev) => ({ ...prev, audio: audioBlob }));
// //         setAudioBlobUrl(URL.createObjectURL(audioBlob));
// //       };

// //       mediaRecorderRef.current.start();
// //       setIsRecording(true);
// //     } catch (error) {
// //       console.error("Erro ao acessar o microfone:", error);
// //       setError(
// //         "Não foi possível acessar o microfone. Verifique as permissões."
// //       );
// //     }
// //   };

// //   const stopRecording = () => {
// //     if (mediaRecorderRef.current) {
// //       mediaRecorderRef.current.stop();
// //       setIsRecording(false);
// //       setRecordingTime(0);
// //       // Encerrar o stream de mídia
// //       mediaRecorderRef.current.stream
// //         .getTracks()
// //         .forEach((track) => track.stop());
// //     }
// //   };

// //   const createTask = async (e: React.FormEvent) => {
// //     e.preventDefault();
// //     if (isSubmitting) {
// //       console.log("🚫 Submissão bloqueada: já em andamento");
// //       return;
// //     }
// //     setIsSubmitting(true);

// //     console.log("=== 🚀 INICIANDO CRIAÇÃO DE TASK COM ARQUIVOS ===");
// //     console.log("🔍 Estado do newTask:", newTask);
// //     console.log("🖼️ Imagem:", newTask.image);
// //     console.log("🎵 Áudio:", newTask.audio);

// //     if (!newTask.title || newTask.title.trim() === "") {
// //       console.error("❌ Título está vazio!");
// //       setError("Por favor, preencha o título da tarefa");
// //       setIsSubmitting(false);
// //       return;
// //     }

// //     try {
// //       const formData = new FormData();
// //       formData.append("title", newTask.title.trim());
// //       formData.append("description", newTask.description?.trim() || "");
// //       formData.append("status", newTask.status);
// //       if (newTask.dueDate) formData.append("dueDate", newTask.dueDate);
// //       if (newTask.assignedToId)
// //         formData.append("assignedToId", newTask.assignedToId);

// //       if (newTask.image) {
// //         console.log(
// //           "📤 Anexando imagem:",
// //           newTask.image.name,
// //           newTask.image.size,
// //           newTask.image.type
// //         );
// //         formData.append("files", newTask.image);
// //       }
// //       if (newTask.audio) {
// //         console.log(
// //           "📤 Anexando áudio:",
// //           newTask.audio.size,
// //           newTask.audio.type
// //         );
// //         const audioFile = new File([newTask.audio], "recording.webm", {
// //           type: "audio/webm",
// //         });
// //         formData.append("files", audioFile);
// //       }

// //       console.log("📦 FormData entries:");
// //       for (let [key, value] of formData.entries()) {
// //         console.log(`   ${key}:`, value);
// //       }

// //       console.log("📤 Enviando para backend...");
// //       const response = await fetch("http://localhost:3002/tasks", {
// //         method: "POST",
// //         body: formData,
// //       });

// //       console.log("📥 Response status:", response.status);
// //       if (response.ok) {
// //         const createdTask = await response.json();
// //         console.log("✅ TASK CRIADA COM SUCESSO:", createdTask);
// //         console.log("🔗 URLs:", {
// //           imageUrl: createdTask.imageUrl,
// //           audioUrl: createdTask.audioUrl,
// //         });
// //         console.log("📋 Total de tarefas:", tasks.length + 1);
// //         setTasks((prev) => [...prev, createdTask]);
// //         setIsCreateModalOpen(false);
// //         setNewTask({
// //           title: "",
// //           description: "",
// //           status: "A Fazer",
// //           dueDate: "",
// //           assignedToId: "",
// //           image: null,
// //           audio: null,
// //           routes: [],
// //         });
// //         setAudioBlobUrl(null);
// //         setRecordingTime(0);
// //         setError(null);
// //       } else {
// //         const errorText = await response.text();
// //         console.error("❌ ERRO NA RESPOSTA:", errorText);
// //         setError("Erro ao criar tarefa: " + errorText);
// //       }
// //     } catch (error) {
// //       console.error("💥 ERRO DE CONEXÃO:", error);
// //       setError("Erro de conexão: " + (error as Error).message);
// //     } finally {
// //       setIsSubmitting(false);
// //     }
// //   };

// //   const handleDragStart = (e: React.DragEvent, taskId: string) => {
// //     e.dataTransfer.setData("taskId", taskId);
// //   };

// //   const handleDragOver = (e: React.DragEvent) => {
// //     e.preventDefault();
// //   };

// //   const handleDrop = (e: React.DragEvent, status: Task["status"]) => {
// //     e.preventDefault();
// //     const taskId = e.dataTransfer.getData("taskId");
// //     updateTaskStatus(taskId, status);
// //   };

// //   if (!isClient) {
// //     return (
// //       <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
// //         <div className="text-center">
// //           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
// //           <p className="text-gray-600">Carregando...</p>
// //         </div>
// //       </div>
// //     );
// //   }

// //   if (loading) {
// //     return (
// //       <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
// //         <div className="text-center">
// //           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
// //           <p className="text-gray-600">Carregando dados...</p>
// //         </div>
// //       </div>
// //     );
// //   }

// //   if (error) {
// //     return (
// //       <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
// //         <div className="text-center max-w-md mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6">
// //           <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
// //             <p className="font-semibold">Erro de Conexão</p>
// //             <p className="text-sm mt-1">{error}</p>
// //           </div>
// //           <button
// //             onClick={fetchData}
// //             className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
// //           >
// //             Tentar Novamente
// //           </button>
// //           <p className="text-xs text-gray-500 mt-3">
// //             Certifique-se de que o servidor backend está rodando em
// //             localhost:3002
// //           </p>
// //         </div>
// //       </div>
// //     );
// //   }

// //   return (
// //     <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
// //       <div className="max-w-7xl mx-auto">
// //         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
// //           <div>
// //             <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
// //               Kanban de Tarefas
// //             </h1>
// //             <p className="text-gray-600 text-sm sm:text-base">
// //               {professionals.length > 0
// //                 ? `${professionals.length} profissional(es) na equipe`
// //                 : "Nenhum profissional cadastrado"}
// //             </p>
// //           </div>
// //           <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
// //             <button
// //               onClick={fetchData}
// //               className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 sm:py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors text-sm sm:text-base"
// //             >
// //               <svg
// //                 className="w-4 h-4 sm:w-5 sm:h-5"
// //                 fill="none"
// //                 stroke="currentColor"
// //                 viewBox="0 0 24 24"
// //               >
// //                 <path
// //                   strokeLinecap="round"
// //                   strokeLinejoin="round"
// //                   strokeWidth={2}
// //                   d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
// //                 />
// //               </svg>
// //               <span>Atualizar</span>
// //             </button>
// //             <button
// //               onClick={() => setIsCreateModalOpen(true)}
// //               className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 sm:py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
// //               disabled={professionals.length === 0}
// //             >
// //               <svg
// //                 className="w-4 h-4 sm:w-5 sm:h-5"
// //                 fill="none"
// //                 stroke="currentColor"
// //                 viewBox="0 0 24 24"
// //               >
// //                 <path
// //                   strokeLinecap="round"
// //                   strokeLinejoin="round"
// //                   strokeWidth={2}
// //                   d="M12 6v6m0 0v6m0-6h6m-6 0H6"
// //                 />
// //               </svg>
// //               <span>Nova Tarefa</span>
// //             </button>
// //           </div>
// //         </div>

// //         {professionals.length === 0 && (
// //           <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 sm:p-6 mb-6">
// //             <div className="flex items-start">
// //               <svg
// //                 className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 mr-3 mt-0.5 flex-shrink-0"
// //                 fill="none"
// //                 stroke="currentColor"
// //                 viewBox="0 0 24 24"
// //               >
// //                 <path
// //                   strokeLinecap="round"
// //                   strokeLinejoin="round"
// //                   strokeWidth={2}
// //                   d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
// //                 />
// //               </svg>
// //               <div>
// //                 <h3 className="font-semibold text-yellow-800 text-sm sm:text-base">
// //                   Nenhum profissional cadastrado
// //                 </h3>
// //                 <p className="text-yellow-700 text-xs sm:text-sm mt-1">
// //                   Você precisa cadastrar profissionais antes de criar tarefas.
// //                   Acesse o formulário de cadastro primeiro.
// //                 </p>
// //               </div>
// //             </div>
// //           </div>
// //         )}

// //         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
// //           {columns.map((column) => (
// //             <div
// //               key={column.id}
// //               className="bg-white rounded-xl shadow-sm border border-gray-200"
// //               onDragOver={handleDragOver}
// //               onDrop={(e) => handleDrop(e, column.id as Task["status"])}
// //             >
// //               <div className={`p-4 rounded-t-xl ${column.color} text-white`}>
// //                 <div className="flex justify-between items-center">
// //                   <h3 className="font-semibold text-sm sm:text-base">
// //                     {column.title}
// //                   </h3>
// //                   <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
// //                     {tasks.filter((task) => task.status === column.id).length}
// //                   </span>
// //                 </div>
// //               </div>
// //               <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 min-h-[400px] sm:min-h-[500px]">
// //                 <AnimatePresence>
// //                   {tasks
// //                     .filter((task) => task.status === column.id)
// //                     .map((task) => (
// //                       <motion.div
// //                         key={task.id}
// //                         layout
// //                         initial={{ opacity: 0, scale: 0.9 }}
// //                         animate={{ opacity: 1, scale: 1 }}
// //                         exit={{ opacity: 0, scale: 0.9 }}
// //                         draggable
// //                         onDragStart={(e: any) => handleDragStart(e, task.id)}
// //                         onClick={() => {
// //                           setSelectedTask(task);
// //                           setIsModalOpen(true);
// //                         }}
// //                         className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-gray-300 shadow-sm relative"
// //                       >
// //                         {task.imageUrl && (
// //                           <div className="mb-3">
// //                             <img
// //                               src={task.imageUrl}
// //                               alt="Task preview"
// //                               className="w-full h-32 object-cover rounded-md"
// //                               onError={(e) => {
// //                                 e.currentTarget.src =
// //                                   "https://rxiclklkunpfmlxmubop.supabase.co/storage/v1/object/public/task-images/placeholder.png";
// //                                 e.currentTarget.onerror = null;
// //                               }}
// //                             />
// //                           </div>
// //                         )}

// //                         <button
// //                           onClick={(e) => {
// //                             e.stopPropagation();
// //                             deleteTask(task.id);
// //                           }}
// //                           className="absolute top-2 right-2 p-1 rounded-full hover:bg-red-100 transition"
// //                         >
// //                           <svg
// //                             className="w-5 h-5 text-red-600"
// //                             fill="none"
// //                             stroke="currentColor"
// //                             strokeWidth="2"
// //                             viewBox="0 0 24 24"
// //                           >
// //                             <path
// //                               strokeLinecap="round"
// //                               strokeLinejoin="round"
// //                               d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h10"
// //                             />
// //                           </svg>
// //                         </button>

// //                         <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-base">
// //                           {task.title}
// //                         </h4>
// //                         {task.description && (
// //                           <p className="text-gray-600 text-sm mb-3 line-clamp-2">
// //                             {task.description}
// //                           </p>
// //                         )}
// //                         {task.audioUrl && (
// //                           <div className="mb-3">
// //                             <audio
// //                               controls
// //                               src={task.audioUrl}
// //                               className="w-full h-10"
// //                             >
// //                               Seu navegador não suporta o elemento de áudio.
// //                             </audio>
// //                           </div>
// //                         )}
// //                         <div className="flex items-center justify-between">
// //                           <div className="flex items-center space-x-2 ">
// //                             <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 ">
// //                               <span className="text-blue-600 text-xs font-semibold">
// //                                 {task.assignedTo?.name?.charAt(0) || "?"}
// //                               </span>
// //                             </div>
// //                             <span className="text-sm text-gray-500 truncate max-w-[100px] sm:max-w-none">
// //                               {task.assignedTo?.name || "Não atribuído"}
// //                             </span>
// //                           </div>
// //                           {task.dueDate && (
// //                             <div className="flex items-center space-x-2 ml-10">
// //                               <span
// //                                 className={`text-sm ${
// //                                   new Date(task.dueDate) < new Date()
// //                                     ? "text-red-600"
// //                                     : "text-gray-900"
// //                                 }`}
// //                               >
// //                                 {new Date(task.dueDate).toLocaleString("pt-BR")}
// //                               </span>
// //                             </div>
// //                           )}
// //                         </div>
// //                       </motion.div>
// //                     ))}
// //                 </AnimatePresence>
// //                 {tasks.filter((task) => task.status === column.id).length ===
// //                   0 && (
// //                   <div className="text-center text-gray-400 py-6 sm:py-8 border-2 border-dashed border-gray-200 rounded-lg">
// //                     <svg
// //                       className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2"
// //                       fill="none"
// //                       stroke="currentColor"
// //                       viewBox="0 0 24 24"
// //                     >
// //                       <path
// //                         strokeLinecap="round"
// //                         strokeLinejoin="round"
// //                         strokeWidth={1}
// //                         d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
// //                       />
// //                     </svg>
// //                     <p className="text-xs sm:text-sm">Nenhuma tarefa</p>
// //                   </div>
// //                 )}
// //               </div>
// //             </div>
// //           ))}
// //         </div>
// //       </div>

// //       <AnimatePresence>
// //         {isModalOpen && selectedTask && (
// //           <motion.div
// //             initial={{ opacity: 0 }}
// //             animate={{ opacity: 1 }}
// //             exit={{ opacity: 0 }}
// //             className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
// //             onClick={() => setIsModalOpen(false)}
// //           >
// //             <motion.div
// //               initial={{ scale: 0.9, opacity: 0 }}
// //               animate={{ scale: 1, opacity: 1 }}
// //               exit={{ scale: 0.9, opacity: 0 }}
// //               className="bg-white rounded-xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
// //               onClick={(e) => e.stopPropagation()}
// //             >
// //               <div className="flex justify-between items-start mb-4">
// //                 <h3 className="text-lg sm:text-xl font-bold text-gray-900 pr-4">
// //                   {selectedTask.title}
// //                 </h3>
// //                 <button
// //                   onClick={() => setIsModalOpen(false)}
// //                   className="text-gray-400 hover:text-gray-600 flex-shrink-0"
// //                 >
// //                   <svg
// //                     className="w-5 h-5 sm:w-6 sm:h-6"
// //                     fill="none"
// //                     stroke="currentColor"
// //                     viewBox="0 0 24 24"
// //                   >
// //                     <path
// //                       strokeLinecap="round"
// //                       strokeLinejoin="round"
// //                       strokeWidth={2}
// //                       d="M6 18L18 6M6 6l12 12"
// //                     />
// //                   </svg>
// //                 </button>
// //               </div>
// //               {selectedTask.imageUrl && (
// //                 <div className="mb-4">
// //                   <img
// //                     src={selectedTask.imageUrl}
// //                     alt="Task preview"
// //                     className="w-full h-48 object-cover rounded-md"
// //                     onError={(e) => {
// //                       e.currentTarget.src =
// //                         "https://rxiclklkunpfmlxmubop.supabase.co/storage/v1/object/public/task-images/placeholder.png";
// //                       e.currentTarget.onerror = null;
// //                     }}
// //                   />
// //                 </div>
// //               )}

// //               {selectedTask.description && (
// //                 <p className="text-gray-600 mb-4 text-sm sm:text-base">
// //                   {selectedTask.description}
// //                 </p>
// //               )}
// //               {selectedTask.audioUrl && (
// //                 <div className="mb-4">
// //                   <audio
// //                     controls
// //                     className="w-full h-10"
// //                     src={selectedTask.audioUrl}
// //                   >
// //                     Seu navegador não suporta o elemento de áudio.
// //                   </audio>
// //                 </div>
// //               )}

// //               <div className="space-y-3 text-sm sm:text-base">
// //                 <div className="flex items-center space-x-2">
// //                   <span className="font-medium text-gray-500">
// //                     Responsável:
// //                   </span>
// //                   <span className="text-gray-900">
// //                     {selectedTask.assignedTo?.name || "Não atribuído"}
// //                   </span>
// //                 </div>
// //                 {/*  */}
// //                 {selectedTask.assignedTo?.role === "Motorista" &&
// //                   selectedTask.routes &&
// //                   selectedTask.routes.length > 0 && (
// //                     <div className="mt-3">
// //                       <h5 className="text-gray-700 text-sm font-semibold mb-1">
// //                         Rotas / Endereços:
// //                       </h5>
// //                       <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
// //                         {selectedTask.routes.map((route, idx) => (
// //                           <li
// //                             key={idx}
// //                             className="cursor-pointer hover:text-blue-600"
// //                             onClick={() =>
// //                               Router.push({
// //                                 pathname: "/driver/map",
// //                                 query: {
// //                                   taskId: selectedTask.id,
// //                                   routeIdx: idx,
// //                                   routeName: route.name,
// //                                   routeAddress: route.address,
// //                                 },
// //                               })
// //                             }
// //                           >
// //                             {route.name} - {route.address}
// //                           </li>
// //                         ))}
// //                       </ul>
// //                     </div>
// //                   )}

// //                 {/*  */}
// //                 <div className="flex items-center space-x-2">
// //                   <span className="font-medium text-gray-500">Status:</span>
// //                   <span
// //                     className={`px-2 py-1 rounded text-xs sm:text-sm ${
// //                       selectedTask.status === "A Fazer"
// //                         ? "bg-blue-100 text-blue-600"
// //                         : selectedTask.status === "Em Progresso"
// //                         ? "bg-yellow-100 text-yellow-600"
// //                         : selectedTask.status === "Revisão"
// //                         ? "bg-purple-100 text-purple-600"
// //                         : "bg-green-100 text-green-600"
// //                     }`}
// //                   >
// //                     {selectedTask.status}
// //                   </span>
// //                 </div>
// //                 {selectedTask.dueDate && (
// //                   <div className="flex items-center space-x-2">
// //                     <span className="font-medium text-gray-500">Prazo:</span>
// //                     <span
// //                       className={`text-sm ${
// //                         new Date(selectedTask.dueDate) < new Date()
// //                           ? "text-red-600"
// //                           : "text-gray-900"
// //                       }`}
// //                     >
// //                       {new Date(selectedTask.dueDate).toLocaleString("pt-BR")}
// //                     </span>
// //                   </div>
// //                 )}
// //               </div>
// //             </motion.div>
// //           </motion.div>
// //         )}
// //       </AnimatePresence>

// //       <AnimatePresence>
// //         {isCreateModalOpen && (
// //           <motion.div
// //             initial={{ opacity: 0 }}
// //             animate={{ opacity: 1 }}
// //             exit={{ opacity: 0 }}
// //             className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"
// //             onClick={() => setIsCreateModalOpen(false)}
// //           >
// //             <motion.div
// //               initial={{ scale: 0.95, opacity: 0 }}
// //               animate={{ scale: 1, opacity: 1 }}
// //               exit={{ scale: 0.95, opacity: 0 }}
// //               transition={{ duration: 0.2 }}
// //               className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
// //               onClick={(e) => e.stopPropagation()}
// //             >
// //               <div className="flex justify-between items-center mb-6">
// //                 <h3 className="text-xl font-semibold text-gray-900">
// //                   Criar Nova Tarefa
// //                 </h3>
// //                 <button
// //                   onClick={() => setIsCreateModalOpen(false)}
// //                   className="text-gray-500 hover:text-gray-700 transition-colors"
// //                 >
// //                   <svg
// //                     className="w-6 h-6"
// //                     fill="none"
// //                     stroke="currentColor"
// //                     viewBox="0 0 24 24"
// //                   >
// //                     <path
// //                       strokeLinecap="round"
// //                       strokeLinejoin="round"
// //                       strokeWidth={2}
// //                       d="M6 18L18 6M6 6l12 12"
// //                     />
// //                   </svg>
// //                 </button>
// //               </div>

// //               <form onSubmit={createTask} className="space-y-5">
// //                 <div>
// //                   <label className="block text-sm font-medium text-gray-700 mb-1.5">
// //                     Título <span className="text-red-500">*</span>
// //                   </label>
// //                   <input
// //                     type="text"
// //                     required
// //                     value={newTask.title}
// //                     onChange={(e) =>
// //                       setNewTask((prev) => ({ ...prev, title: e.target.value }))
// //                     }
// //                     className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
// //                     placeholder="Digite o título da tarefa"
// //                   />
// //                 </div>

// //                 <div>
// //                   <label className="block text-sm font-medium text-gray-700 mb-1.5">
// //                     Descrição
// //                   </label>
// //                   <textarea
// //                     value={newTask.description}
// //                     onChange={(e) =>
// //                       setNewTask((prev) => ({
// //                         ...prev,
// //                         description: e.target.value,
// //                       }))
// //                     }
// //                     rows={4}
// //                     className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm resize-none"
// //                     placeholder="Descreva a tarefa em detalhes..."
// //                   />
// //                 </div>

// //                 <div>
// //                   <label className="block text-sm font-medium text-gray-700 mb-1.5">
// //                     Imagem
// //                   </label>
// //                   <input
// //                     type="file"
// //                     accept="image/*"
// //                     onChange={(e) =>
// //                       setNewTask((prev) => ({
// //                         ...prev,
// //                         image: e.target.files?.[0] || null,
// //                       }))
// //                     }
// //                     className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm"
// //                   />
// //                 </div>

// //                 <div>
// //                   <label className="block text-sm font-medium text-gray-700 mb-1.5">
// //                     Gravação de Áudio
// //                   </label>
// //                   <div className="flex items-center space-x-3 mb-2">
// //                     <button
// //                       type="button"
// //                       onClick={isRecording ? stopRecording : startRecording}
// //                       className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
// //                         isRecording
// //                           ? "bg-red-600 text-white hover:bg-red-700"
// //                           : "bg-blue-600 text-white hover:bg-blue-700"
// //                       }`}
// //                     >
// //                       {isRecording ? "Parar Gravação" : "Iniciar Gravação"}
// //                     </button>
// //                     <span className="text-sm text-gray-600">
// //                       {Math.floor(recordingTime / 60)}:
// //                       {(recordingTime % 60).toString().padStart(2, "0")}
// //                     </span>
// //                   </div>
// //                   {audioBlobUrl && (
// //                     <div className="mt-2">
// //                       <audio
// //                         controls
// //                         src={audioBlobUrl}
// //                         className="w-full h-10"
// //                       >
// //                         Seu navegador não suporta o elemento de áudio.
// //                       </audio>
// //                     </div>
// //                   )}
// //                 </div>

// //                 <div>
// //                   <label className="block text-sm font-medium text-gray-700 mb-1.5">
// //                     Responsável
// //                   </label>
// //                   <select
// //                     value={newTask.assignedToId}
// //                     onChange={(e) =>
// //                       setNewTask((prev) => ({
// //                         ...prev,
// //                         assignedToId: e.target.value,
// //                         routes: [], // resetar rotas ao trocar o profissional
// //                       }))
// //                     }
// //                     className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
// //                   >
// //                     <option value="" disabled>
// //                       Selecione um profissional
// //                     </option>
// //                     {Array.isArray(professionals) &&
// //                       professionals.map((professional) => (
// //                         <option key={professional.id} value={professional.id}>
// //                           {professional.name} - {professional.role}
// //                         </option>
// //                       ))}
// //                   </select>
// //                 </div>

// //                 <div>
// //                   <label className="block text-sm font-medium text-gray-700 mb-1.5">
// //                     Status
// //                   </label>
// //                   <select
// //                     value={newTask.status}
// //                     onChange={(e) =>
// //                       setNewTask((prev) => ({
// //                         ...prev,
// //                         status: e.target.value as Task["status"],
// //                       }))
// //                     }
// //                     className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
// //                   >
// //                     {columns.map((column) => (
// //                       <option key={column.id} value={column.id}>
// //                         {column.title}
// //                       </option>
// //                     ))}
// //                   </select>
// //                 </div>

// //                 <div>
// //                   <label className="block text-sm font-medium text-gray-700 mb-1.5">
// //                     Prazo
// //                   </label>
// //                   <input
// //                     type="datetime-local"
// //                     value={newTask.dueDate}
// //                     onChange={(e) =>
// //                       setNewTask((prev) => ({
// //                         ...prev,
// //                         dueDate: e.target.value,
// //                       }))
// //                     }
// //                     className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
// //                   />
// //                 </div>

// //                 <div className="flex space-x-4 pt-6">
// //                   <button
// //                     type="button"
// //                     onClick={() => {
// //                       setIsCreateModalOpen(false);
// //                       setAudioBlobUrl(null);
// //                       setRecordingTime(0);
// //                       if (mediaRecorderRef.current) {
// //                         mediaRecorderRef.current.stream
// //                           .getTracks()
// //                           .forEach((track) => track.stop());
// //                       }
// //                     }}
// //                     className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
// //                   >
// //                     Cancelar
// //                   </button>
// //                   <button
// //                     type="submit"
// //                     className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
// //                     disabled={!newTask.title || isSubmitting}
// //                   >
// //                     {isSubmitting ? "Criando..." : "Criar Tarefa"}
// //                   </button>
// //                 </div>
// //               </form>
// //             </motion.div>
// //           </motion.div>
// //         )}
// //       </AnimatePresence>
// //     </div>
// //   );
// // };

// // export default ProfessionalKanban;

// // versao com edit de task e usando shadcn ui modals
// // "use client";

// // import { useState, useEffect, useRef } from "react";
// // import { motion, AnimatePresence } from "framer-motion";
// // import Router from "next/router";
// // import { Button } from "@/components/ui/button";
// // import {
// //   Dialog,
// //   DialogContent,
// //   DialogHeader,
// //   DialogTitle,
// //   DialogTrigger,
// // } from "@/components/ui/dialog";
// // import {
// //   DropdownMenu,
// //   DropdownMenuContent,
// //   DropdownMenuItem,
// //   DropdownMenuTrigger,
// // } from "@/components/ui/dropdown-menu";
// // import { Input } from "@/components/ui/input";
// // import { Textarea } from "@/components/ui/textarea";
// // import {
// //   Select,
// //   SelectContent,
// //   SelectItem,
// //   SelectTrigger,
// //   SelectValue,
// // } from "@/components/ui/select";
// // import { Card, CardContent } from "@/components/ui/card";
// // import { Badge } from "@/components/ui/badge";
// // import { Label } from "@/components/ui/label";

// // interface Professional {
// //   id: string;
// //   name: string;
// //   role: string;
// //   contact?: string;
// // }

// // interface Task {
// //   id: string;
// //   title: string;
// //   description: string;
// //   status: "A Fazer" | "Em Progresso" | "Revisão" | "Concluído";
// //   dueDate: string;
// //   assignedTo: Professional;
// //   assignedToId: string;
// //   createdAt: string;
// //   updatedAt: string;
// //   imageUrl?: string;
// //   audioUrl?: string;
// //   routes?: { name: string; address: string }[];
// // }

// // const ProfessionalKanban = () => {
// //   const [tasks, setTasks] = useState<Task[]>([]);
// //   const [professionals, setProfessionals] = useState<Professional[]>([]);
// //   const [loading, setLoading] = useState(true);
// //   const [error, setError] = useState<string | null>(null);
// //   const [selectedTask, setSelectedTask] = useState<Task | null>(null);
// //   const [isModalOpen, setIsModalOpen] = useState(false);
// //   const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
// //   const [isEditModalOpen, setIsEditModalOpen] = useState(false);
// //   const [editingTask, setEditingTask] = useState<Task | null>(null);

// //   interface EditTaskState {
// //     title: string;
// //     description: string;
// //     status: Task["status"];
// //     dueDate: string | null;
// //     assignedToId: string | null;
// //     image: File | null;
// //     audio: Blob | null;
// //   }

// //   const [newTask, setNewTask] = useState({
// //     title: "",
// //     description: "",
// //     status: "A Fazer" as Task["status"],
// //     dueDate: "",
// //     assignedToId: "",
// //     image: null as File | null,
// //     audio: null as Blob | null,
// //     routes: [] as { name: string; address: string }[],
// //   });

// //   const [editTask, setEditTask] = useState<EditTaskState>({
// //     title: "",
// //     description: "",
// //     status: "A Fazer",
// //     dueDate: null,
// //     assignedToId: null,
// //     image: null,
// //     audio: null,
// //   });

// //   const [isSubmitting, setIsSubmitting] = useState(false);

// //   // Estados para gravação de áudio
// //   const [isRecording, setIsRecording] = useState(false);
// //   const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
// //   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
// //   const audioChunksRef = useRef<Blob[]>([]);
// //   const [recordingTime, setRecordingTime] = useState(0);

// //   const [isClient, setIsClient] = useState(false);

// //   const columns = [
// //     {
// //       id: "A Fazer",
// //       title: "A Fazer",
// //       color: "bg-blue-500",
// //       textColor: "text-blue-700",
// //     },
// //     {
// //       id: "Em Progresso",
// //       title: "Em Progresso",
// //       color: "bg-yellow-500",
// //       textColor: "text-yellow-700",
// //     },
// //     {
// //       id: "Revisão",
// //       title: "Em Revisão",
// //       color: "bg-purple-500",
// //       textColor: "text-purple-700",
// //     },
// //     {
// //       id: "Concluído",
// //       title: "Concluído",
// //       color: "bg-green-500",
// //       textColor: "text-green-700",
// //     },
// //   ];

// //   useEffect(() => {
// //     setIsClient(true);
// //     fetchData();
// //   }, []);

// //   // Temporizador para gravação
// //   useEffect(() => {
// //     let interval: NodeJS.Timeout | null = null;
// //     if (isRecording) {
// //       interval = setInterval(() => {
// //         setRecordingTime((prev) => prev + 1);
// //       }, 1000);
// //     }
// //     return () => {
// //       if (interval) clearInterval(interval);
// //     };
// //   }, [isRecording]);

// //   const fetchData = async () => {
// //     try {
// //       setLoading(true);
// //       setError(null);

// //       const professionalsResponse = await fetch(
// //         "http://localhost:3002/professionals"
// //       );
// //       if (!professionalsResponse.ok) {
// //         throw new Error(
// //           `Erro ao buscar profissionais: ${professionalsResponse.status}`
// //         );
// //       }
// //       const professionalsText = await professionalsResponse.text();
// //       let professionalsData;
// //       try {
// //         professionalsData = professionalsText
// //           ? JSON.parse(professionalsText)
// //           : [];
// //       } catch (parseError) {
// //         console.error(
// //           "Erro ao parsear profissionais:",
// //           parseError,
// //           "Response:",
// //           professionalsText
// //         );
// //         professionalsData = [];
// //       }
// //       const professionalsArray = Array.isArray(professionalsData)
// //         ? professionalsData
// //         : [];
// //       setProfessionals(professionalsArray);

// //       const tasksResponse = await fetch("http://localhost:3002/tasks");
// //       if (!tasksResponse.ok) {
// //         console.log("Nenhuma task encontrada ou erro na API");
// //         setTasks([]);
// //         return;
// //       }
// //       const tasksText = await tasksResponse.text();
// //       let tasksData;
// //       try {
// //         tasksData = tasksText ? JSON.parse(tasksText) : [];
// //       } catch (parseError) {
// //         console.error(
// //           "Erro ao parsear tasks:",
// //           parseError,
// //           "Response:",
// //           tasksText
// //         );
// //         tasksData = [];
// //       }
// //       const tasksArray = Array.isArray(tasksData) ? tasksData : [];
// //       tasksArray.sort(
// //         (a, b) =>
// //           new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
// //       );
// //       setTasks(tasksArray);
// //     } catch (error) {
// //       console.error("Erro ao buscar dados:", error);
// //       setError(
// //         "Erro ao carregar dados. Verifique se o servidor está rodando na porta 3002."
// //       );
// //       setProfessionals([]);
// //       setTasks([]);
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   const deleteTask = async (taskId: string) => {
// //     if (!confirm("Tem certeza que deseja apagar esta tarefa?")) return;

// //     try {
// //       const response = await fetch(`http://localhost:3002/tasks/${taskId}`, {
// //         method: "DELETE",
// //       });

// //       if (response.ok) {
// //         setTasks((prev) => prev.filter((task) => task.id !== taskId));
// //       } else {
// //         console.error("Erro ao deletar task");
// //       }
// //     } catch (error) {
// //       console.error("Erro ao deletar:", error);
// //     }
// //   };

// //   // Função para abrir modal de edição
// //   // Função para abrir modal de edição - CORRIGIDA
// //   const openEditModal = (task: Task) => {
// //     setEditingTask(task);
// //     setEditTask({
// //       title: task.title,
// //       description: task.description,
// //       status: task.status,
// //       dueDate: task.dueDate
// //         ? new Date(task.dueDate).toISOString().slice(0, 16)
// //         : null,
// //       assignedToId: task.assignedToId || null,
// //       image: null,
// //       audio: null,
// //     });
// //     setIsEditModalOpen(true);
// //   };

// //   // Submeter edição - CORRIGIDA
// //   const onEditSubmit = async (e: React.FormEvent) => {
// //     e.preventDefault();
// //     if (!editingTask) return;

// //     setIsSubmitting(true);
// //     try {
// //       // Validar título
// //       if (!editTask.title.trim()) {
// //         setError("O título é obrigatório");
// //         setIsSubmitting(false);
// //         return;
// //       }

// //       // Preparar dados para envio
// //       const updateData: any = {
// //         title: editTask.title.trim(),
// //         description: editTask.description?.trim() || "",
// //         status: editTask.status,
// //       };

// //       // Adicionar assignedToId apenas se selecionado
// //       if (editTask.assignedToId) {
// //         updateData.assignedToId = editTask.assignedToId;
// //       } else {
// //         updateData.assignedToId = null;
// //       }

// //       // Adicionar dueDate apenas se não estiver vazio
// //       if (editTask.dueDate) {
// //         updateData.dueDate = editTask.dueDate;
// //       } else {
// //         updateData.dueDate = null;
// //       }

// //       console.log("📤 Dados enviados para atualização:", updateData);

// //       const response = await fetch(
// //         `http://localhost:3002/tasks/${editingTask.id}`,
// //         {
// //           method: "PUT",
// //           headers: {
// //             "Content-Type": "application/json",
// //           },
// //           body: JSON.stringify(updateData),
// //         }
// //       );

// //       if (!response.ok) {
// //         const errorText = await response.text();
// //         throw new Error(
// //           errorText || `Erro ${response.status}: ${response.statusText}`
// //         );
// //       }

// //       const updatedTask = await response.json();
// //       console.log("✅ Tarefa atualizada com sucesso:", updatedTask);

// //       // Atualizar estado local
// //       setTasks((prev) =>
// //         prev.map((task) =>
// //           task.id === editingTask.id
// //             ? {
// //                 ...task,
// //                 ...updatedTask,
// //                 assignedTo:
// //                   professionals.find(
// //                     (p) => p.id === updatedTask.assignedToId
// //                   ) || task.assignedTo,
// //               }
// //             : task
// //         )
// //       );

// //       setIsEditModalOpen(false);
// //       setEditingTask(null);
// //       setError(null);
// //     } catch (error) {
// //       console.error("❌ Erro ao editar tarefa:", error);
// //       if (error instanceof Error) {
// //         setError(`Erro ao editar tarefa: ${error.message}`);
// //       }
// //     } finally {
// //       setIsSubmitting(false);
// //     }
// //   };

// //   // Função para atualizar tarefa
// //   // Função para atualizar tarefa - CORRIGIDA
// //   const updateTask = async (taskId: string, body: any): Promise<Task> => {
// //     const response = await fetch(`http://localhost:3002/tasks/${taskId}`, {
// //       method: "PUT",
// //       headers: {
// //         "Content-Type": "application/json",
// //       },
// //       body: JSON.stringify(body),
// //     });

// //     if (!response.ok) {
// //       const errorText = await response.text();
// //       throw new Error(errorText || "Erro ao atualizar tarefa");
// //     }

// //     return response.json();
// //   };

// //   const startRecording = async () => {
// //     try {
// //       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
// //       mediaRecorderRef.current = new MediaRecorder(stream);
// //       audioChunksRef.current = [];

// //       mediaRecorderRef.current.ondataavailable = (event) => {
// //         if (event.data.size > 0) {
// //           audioChunksRef.current.push(event.data);
// //         }
// //       };

// //       mediaRecorderRef.current.onstop = () => {
// //         const audioBlob = new Blob(audioChunksRef.current, {
// //           type: "audio/webm",
// //         });
// //         setNewTask((prev) => ({ ...prev, audio: audioBlob }));
// //         setAudioBlobUrl(URL.createObjectURL(audioBlob));
// //       };

// //       mediaRecorderRef.current.start();
// //       setIsRecording(true);
// //     } catch (error) {
// //       console.error("Erro ao acessar o microfone:", error);
// //       setError(
// //         "Não foi possível acessar o microfone. Verifique as permissões."
// //       );
// //     }
// //   };

// //   const stopRecording = () => {
// //     if (mediaRecorderRef.current) {
// //       mediaRecorderRef.current.stop();
// //       setIsRecording(false);
// //       setRecordingTime(0);
// //       // Encerrar o stream de mídia
// //       mediaRecorderRef.current.stream
// //         .getTracks()
// //         .forEach((track) => track.stop());
// //     }
// //   };

// //   const createTask = async (e: React.FormEvent) => {
// //     e.preventDefault();
// //     if (isSubmitting) {
// //       console.log("🚫 Submissão bloqueada: já em andamento");
// //       return;
// //     }
// //     setIsSubmitting(true);

// //     console.log("=== 🚀 INICIANDO CRIAÇÃO DE TASK COM ARQUIVOS ===");
// //     console.log("🔍 Estado do newTask:", newTask);
// //     console.log("🖼️ Imagem:", newTask.image);
// //     console.log("🎵 Áudio:", newTask.audio);

// //     if (!newTask.title || newTask.title.trim() === "") {
// //       console.error("❌ Título está vazio!");
// //       setError("Por favor, preencha o título da tarefa");
// //       setIsSubmitting(false);
// //       return;
// //     }

// //     try {
// //       const formData = new FormData();
// //       formData.append("title", newTask.title.trim());
// //       formData.append("description", newTask.description?.trim() || "");
// //       formData.append("status", newTask.status);
// //       if (newTask.dueDate) formData.append("dueDate", newTask.dueDate);
// //       if (newTask.assignedToId)
// //         formData.append("assignedToId", newTask.assignedToId);

// //       if (newTask.image) {
// //         console.log(
// //           "📤 Anexando imagem:",
// //           newTask.image.name,
// //           newTask.image.size,
// //           newTask.image.type
// //         );
// //         formData.append("files", newTask.image);
// //       }
// //       if (newTask.audio) {
// //         console.log(
// //           "📤 Anexando áudio:",
// //           newTask.audio.size,
// //           newTask.audio.type
// //         );
// //         const audioFile = new File([newTask.audio], "recording.webm", {
// //           type: "audio/webm",
// //         });
// //         formData.append("files", audioFile);
// //       }

// //       console.log("📦 FormData entries:");
// //       for (let [key, value] of formData.entries()) {
// //         console.log(`   ${key}:`, value);
// //       }

// //       console.log("📤 Enviando para backend...");
// //       const response = await fetch("http://localhost:3002/tasks", {
// //         method: "POST",
// //         body: formData,
// //       });

// //       console.log("📥 Response status:", response.status);
// //       if (response.ok) {
// //         const createdTask = await response.json();
// //         console.log("✅ TASK CRIADA COM SUCESSO:", createdTask);
// //         console.log("🔗 URLs:", {
// //           imageUrl: createdTask.imageUrl,
// //           audioUrl: createdTask.audioUrl,
// //         });
// //         console.log("📋 Total de tarefas:", tasks.length + 1);
// //         setTasks((prev) => [...prev, createdTask]);
// //         setIsCreateModalOpen(false);
// //         setNewTask({
// //           title: "",
// //           description: "",
// //           status: "A Fazer",
// //           dueDate: "",
// //           assignedToId: "",
// //           image: null,
// //           audio: null,
// //           routes: [],
// //         });
// //         setAudioBlobUrl(null);
// //         setRecordingTime(0);
// //         setError(null);
// //       } else {
// //         const errorText = await response.text();
// //         console.error("❌ ERRO NA RESPOSTA:", errorText);
// //         setError("Erro ao criar tarefa: " + errorText);
// //       }
// //     } catch (error) {
// //       console.error("💥 ERRO DE CONEXÃO:", error);
// //       setError("Erro de conexão: " + (error as Error).message);
// //     } finally {
// //       setIsSubmitting(false);
// //     }
// //   };

// //   // FUNÇÕES DRAG AND DROP - VERSÃO COMPLETA CORRIGIDA
// //   const handleDragStart = (e: React.DragEvent, taskId: string) => {
// //     e.dataTransfer.setData("taskId", taskId);
// //     e.dataTransfer.effectAllowed = "move";
// //   };

// //   const handleDragEnd = (e: React.DragEvent) => {
// //     // Remove feedback visual
// //     const element = e.currentTarget as HTMLElement;
// //     element.style.opacity = "1";
// //   };

// //   const handleDragOver = (e: React.DragEvent) => {
// //     e.preventDefault();
// //     e.dataTransfer.dropEffect = "move";

// //     // Feedback visual na coluna de destino
// //     const element = e.currentTarget as HTMLElement;
// //     element.classList.add("bg-gray-50");
// //   };

// //   const handleDragLeave = (e: React.DragEvent) => {
// //     // Remove feedback visual da coluna
// //     const element = e.currentTarget as HTMLElement;
// //     element.classList.remove("bg-gray-50");
// //   };

// //   const handleDrop = async (e: React.DragEvent, status: Task["status"]) => {
// //     e.preventDefault();

// //     // Remove feedback visual
// //     const element = e.currentTarget as HTMLElement;
// //     element.classList.remove("bg-gray-50");

// //     const taskId = e.dataTransfer.getData("taskId");

// //     if (taskId) {
// //       console.log(`📦 Movendo tarefa ${taskId} para ${status}`);
// //       await updateTaskStatus(taskId, status);
// //     }
// //   };

// //   // Função de atualização de status - MELHORADA
// //   const updateTaskStatus = async (
// //     taskId: string,
// //     newStatus: Task["status"]
// //   ) => {
// //     try {
// //       console.log(`🔄 Atualizando tarefa ${taskId} para status: ${newStatus}`);

// //       const task = tasks.find((t) => t.id === taskId);
// //       if (!task) {
// //         console.error("❌ Tarefa não encontrada");
// //         return;
// //       }

// //       // Evitar atualização desnecessária
// //       if (task.status === newStatus) {
// //         console.log("ℹ️  Tarefa já está neste status");
// //         return;
// //       }

// //       // Atualização otimista
// //       setTasks((prev) =>
// //         prev.map((task) =>
// //           task.id === taskId ? { ...task, status: newStatus } : task
// //         )
// //       );

// //       const response = await fetch(`http://localhost:3002/tasks/${taskId}`, {
// //         method: "PATCH",
// //         headers: {
// //           "Content-Type": "application/json",
// //         },
// //         body: JSON.stringify({ status: newStatus }),
// //       });

// //       if (!response.ok) {
// //         const errorText = await response.text();
// //         throw new Error(
// //           errorText || `Erro ${response.status}: ${response.statusText}`
// //         );
// //       }

// //       const updatedTask = await response.json();
// //       console.log("✅ Status atualizado com sucesso:", updatedTask);
// //     } catch (error) {
// //       console.error("❌ Erro ao atualizar task:", error);
// //       // Reverter atualização otimista em caso de erro
// //       setError(`Erro ao mover tarefa: ${error.message}`);
// //       fetchData(); // Recarregar dados para sincronizar
// //     }
// //   };

// //   // const handleDragOver = (e: React.DragEvent) => {
// //   //   e.preventDefault();
// //   //   e.dataTransfer.dropEffect = "move";
// //   // };



// //   if (!isClient) {
// //     return (
// //       <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
// //         <div className="text-center">
// //           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
// //           <p className="text-gray-600">Carregando...</p>
// //         </div>
// //       </div>
// //     );
// //   }

// //   if (loading) {
// //     return (
// //       <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
// //         <div className="text-center">
// //           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
// //           <p className="text-gray-600">Carregando dados...</p>
// //         </div>
// //       </div>
// //     );
// //   }

// //   if (error) {
// //     return (
// //       <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
// //         <div className="text-center max-w-md mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6">
// //           <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
// //             <p className="font-semibold">Erro de Conexão</p>
// //             <p className="text-sm mt-1">{error}</p>
// //           </div>
// //           <Button onClick={fetchData}>Tentar Novamente</Button>
// //           <p className="text-xs text-gray-500 mt-3">
// //             Certifique-se de que o servidor backend está rodando em
// //             localhost:3002
// //           </p>
// //         </div>
// //       </div>
// //     );
// //   }

// //   return (
// //     <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
// //       <div className="max-w-7xl mx-auto">
// //         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
// //           <div>
// //             <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
// //               Kanban de Tarefas
// //             </h1>
// //             <p className="text-gray-600 text-sm sm:text-base">
// //               {professionals.length > 0
// //                 ? `${professionals.length} profissional(es) na equipe`
// //                 : "Nenhum profissional cadastrado"}
// //             </p>
// //           </div>
// //           <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
// //             <Button
// //               onClick={fetchData}
// //               variant="outline"
// //               className="flex items-center space-x-2"
// //             >
// //               <svg
// //                 className="w-4 h-4"
// //                 fill="none"
// //                 stroke="currentColor"
// //                 viewBox="0 0 24 24"
// //               >
// //                 <path
// //                   strokeLinecap="round"
// //                   strokeLinejoin="round"
// //                   strokeWidth={2}
// //                   d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
// //                 />
// //               </svg>
// //               <span>Atualizar</span>
// //             </Button>
// //             <Button
// //               onClick={() => setIsCreateModalOpen(true)}
// //               disabled={professionals.length === 0}
// //               className="flex items-center space-x-2"
// //             >
// //               <svg
// //                 className="w-4 h-4"
// //                 fill="none"
// //                 stroke="currentColor"
// //                 viewBox="0 0 24 24"
// //               >
// //                 <path
// //                   strokeLinecap="round"
// //                   strokeLinejoin="round"
// //                   strokeWidth={2}
// //                   d="M12 6v6m0 0v6m0-6h6m-6 0H6"
// //                 />
// //               </svg>
// //               <span>Nova Tarefa</span>
// //             </Button>
// //           </div>
// //         </div>

// //         {professionals.length === 0 && (
// //           <Card className="mb-6 border-yellow-200 bg-yellow-50">
// //             <CardContent className="p-4">
// //               <div className="flex items-start">
// //                 <svg
// //                   className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0"
// //                   fill="none"
// //                   stroke="currentColor"
// //                   viewBox="0 0 24 24"
// //                 >
// //                   <path
// //                     strokeLinecap="round"
// //                     strokeLinejoin="round"
// //                     strokeWidth={2}
// //                     d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
// //                   />
// //                 </svg>
// //                 <div>
// //                   <h3 className="font-semibold text-yellow-800 text-sm">
// //                     Nenhum profissional cadastrado
// //                   </h3>
// //                   <p className="text-yellow-700 text-xs mt-1">
// //                     Você precisa cadastrar profissionais antes de criar tarefas.
// //                     Acesse o formulário de cadastro primeiro.
// //                   </p>
// //                 </div>
// //               </div>
// //             </CardContent>
// //           </Card>
// //         )}

// //         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
// //           {columns.map((column) => (
// //             <Card
// //               key={column.id}
// //               className="border-gray-200 transition-colors"
// //               onDragOver={handleDragOver}
// //               onDrop={(e) => handleDrop(e, column.id as Task["status"])}
// //               onDragEnter={(e) => {
// //                 e.currentTarget.classList.add("bg-gray-50");
// //               }}
// //               onDragLeave={(e) => {
// //                 e.currentTarget.classList.remove("bg-gray-50");
// //               }}
// //             >
// //               <div className={`p-4 rounded-t-lg ${column.color} text-white`}>
// //                 <div className="flex justify-between items-center">
// //                   <h3 className="font-semibold text-sm">{column.title}</h3>
// //                   <Badge variant="secondary" className="bg-white bg-opacity-20">
// //                     {tasks.filter((task) => task.status === column.id).length}
// //                   </Badge>
// //                 </div>
// //               </div>
// //               <CardContent className="p-4 space-y-4 min-h-[500px]">
// //                 <AnimatePresence>
// //                   {tasks
// //                     .filter((task) => task.status === column.id)
// //                     .map((task) => (
// //                       <motion.div
// //                         key={task.id}
// //                         layout
// //                         initial={{ opacity: 0, scale: 0.9 }}
// //                         animate={{ opacity: 1, scale: 1 }}
// //                         exit={{ opacity: 0, scale: 0.9 }}
// //                         draggable
// //                         onDragStart={(e) => handleDragStart(e, task.id)}
// //                         onDragEnd={handleDragEnd}
// //                         onDragOver={handleDragOver}
// //                         className="bg-white border border-gray-200 rounded-lg p-4 cursor-grab active:cursor-grabbing hover:shadow-lg transition-all duration-200 hover:border-blue-300 shadow-sm relative select-none"
// //                         style={{ userSelect: "none" }}
// //                       >
// //                         {task.imageUrl && (
// //                           <div className="mb-3">
// //                             <img
// //                               src={task.imageUrl}
// //                               alt="Task preview"
// //                               className="w-full h-32 object-cover rounded-md"
// //                               onError={(e) => {
// //                                 e.currentTarget.src =
// //                                   "https://rxiclklkunpfmlxmubop.supabase.co/storage/v1/object/public/task-images/placeholder.png";
// //                                 e.currentTarget.onerror = null;
// //                               }}
// //                             />
// //                           </div>
// //                         )}

// //                         {/* Menu de ações com shadcn */}
// //                         <DropdownMenu>
// //                           <DropdownMenuTrigger asChild>
// //                             <Button
// //                               variant="ghost"
// //                               size="sm"
// //                               className="absolute top-2 right-2 h-8 w-8 p-0"
// //                               onClick={(e) => e.stopPropagation()}
// //                             >
// //                               <span className="sr-only">Abrir menu</span>
// //                               <svg
// //                                 className="w-4 h-4"
// //                                 fill="none"
// //                                 stroke="currentColor"
// //                                 viewBox="0 0 24 24"
// //                               >
// //                                 <path
// //                                   strokeLinecap="round"
// //                                   strokeLinejoin="round"
// //                                   strokeWidth={2}
// //                                   d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
// //                                 />
// //                               </svg>
// //                             </Button>
// //                           </DropdownMenuTrigger>
// //                           <DropdownMenuContent align="end">
// //                             <DropdownMenuItem
// //                               onClick={() => openEditModal(task)}
// //                             >
// //                               <svg
// //                                 className="w-4 h-4 mr-2"
// //                                 fill="none"
// //                                 stroke="currentColor"
// //                                 viewBox="0 0 24 24"
// //                               >
// //                                 <path
// //                                   strokeLinecap="round"
// //                                   strokeLinejoin="round"
// //                                   strokeWidth={2}
// //                                   d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
// //                                 />
// //                               </svg>
// //                               Editar
// //                             </DropdownMenuItem>
// //                             <DropdownMenuItem
// //                               onClick={() => deleteTask(task.id)}
// //                               className="text-red-600"
// //                             >
// //                               <svg
// //                                 className="w-4 h-4 mr-2"
// //                                 fill="none"
// //                                 stroke="currentColor"
// //                                 viewBox="0 0 24 24"
// //                               >
// //                                 <path
// //                                   strokeLinecap="round"
// //                                   strokeLinejoin="round"
// //                                   strokeWidth={2}
// //                                   d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
// //                                 />
// //                               </svg>
// //                               Excluir
// //                             </DropdownMenuItem>
// //                           </DropdownMenuContent>
// //                         </DropdownMenu>

// //                         <h4
// //                           className="font-semibold text-gray-900 mb-2 line-clamp-2 text-base cursor-pointer"
// //                           onClick={() => {
// //                             setSelectedTask(task);
// //                             setIsModalOpen(true);
// //                           }}
// //                         >
// //                           {task.title}
// //                         </h4>

// //                         {task.description && (
// //                           <p className="text-gray-600 text-sm mb-3 line-clamp-2">
// //                             {task.description}
// //                           </p>
// //                         )}

// //                         {task.audioUrl && (
// //                           <div className="mb-3">
// //                             <audio
// //                               controls
// //                               src={task.audioUrl}
// //                               className="w-full h-10"
// //                             >
// //                               Seu navegador não suporta o elemento de áudio.
// //                             </audio>
// //                           </div>
// //                         )}

// //                         <div className="flex items-center justify-between">
// //                           <div className="flex items-center space-x-2">
// //                             <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
// //                               <span className="text-blue-600 text-xs font-semibold">
// //                                 {task.assignedTo?.name?.charAt(0) || "?"}
// //                               </span>
// //                             </div>
// //                             <span className="text-sm text-gray-500 truncate max-w-[100px]">
// //                               {task.assignedTo?.name || "Não atribuído"}
// //                             </span>
// //                           </div>

// //                           {task.dueDate && (
// //                             <div className="flex items-center space-x-2">
// //                               <span
// //                                 className={`text-sm ${
// //                                   new Date(task.dueDate) < new Date()
// //                                     ? "text-red-600"
// //                                     : "text-gray-900"
// //                                 }`}
// //                               >
// //                                 {new Date(task.dueDate).toLocaleDateString(
// //                                   "pt-BR"
// //                                 )}
// //                               </span>
// //                             </div>
// //                           )}
// //                         </div>
// //                       </motion.div>
// //                     ))}
// //                 </AnimatePresence>

// //                 {tasks.filter((task) => task.status === column.id).length ===
// //                   0 && (
// //                   <div className="text-center text-gray-400 py-8 border-2 border-dashed border-gray-200 rounded-lg">
// //                     <svg
// //                       className="w-12 h-12 mx-auto mb-2"
// //                       fill="none"
// //                       stroke="currentColor"
// //                       viewBox="0 0 24 24"
// //                     >
// //                       <path
// //                         strokeLinecap="round"
// //                         strokeLinejoin="round"
// //                         strokeWidth={1}
// //                         d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
// //                       />
// //                     </svg>
// //                     <p className="text-sm">Nenhuma tarefa</p>
// //                   </div>
// //                 )}
// //               </CardContent>
// //             </Card>
// //           ))}
// //         </div>
// //       </div>

// //       {/* Modal de Visualização */}
// //       <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
// //         <DialogContent className="max-w-md">
// //           <DialogHeader>
// //             <DialogTitle>{selectedTask?.title}</DialogTitle>
// //           </DialogHeader>
// //           {selectedTask && (
// //             <div className="space-y-4">
// //               {selectedTask.imageUrl && (
// //                 <img
// //                   src={selectedTask.imageUrl}
// //                   alt="Task preview"
// //                   className="w-full h-48 object-cover rounded-md"
// //                 />
// //               )}
// //               {selectedTask.description && (
// //                 <p className="text-gray-600">{selectedTask.description}</p>
// //               )}
// //               {selectedTask.audioUrl && (
// //                 <audio controls className="w-full" src={selectedTask.audioUrl}>
// //                   Seu navegador não suporta o elemento de áudio.
// //                 </audio>
// //               )}
// //               <div className="space-y-2 text-sm">
// //                 <div className="flex justify-between">
// //                   <span className="font-medium">Responsável:</span>
// //                   <span>
// //                     {selectedTask.assignedTo?.name || "Não atribuído"}
// //                   </span>
// //                 </div>
// //                 <div className="flex justify-between">
// //                   <span className="font-medium">Status:</span>
// //                   <Badge variant="secondary">{selectedTask.status}</Badge>
// //                 </div>
// //                 {selectedTask.dueDate && (
// //                   <div className="flex justify-between">
// //                     <span className="font-medium">Prazo:</span>
// //                     <span
// //                       className={
// //                         new Date(selectedTask.dueDate) < new Date()
// //                           ? "text-red-600"
// //                           : ""
// //                       }
// //                     >
// //                       {new Date(selectedTask.dueDate).toLocaleString("pt-BR")}
// //                     </span>
// //                   </div>
// //                 )}
// //               </div>
// //             </div>
// //           )}
// //         </DialogContent>
// //       </Dialog>

// //       {/* Modal de Edição */}
// //       <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
// //         <DialogContent className="max-w-lg">
// //           <DialogHeader>
// //             <DialogTitle>Editar Tarefa</DialogTitle>
// //           </DialogHeader>
// //           <form onSubmit={onEditSubmit} className="space-y-4">
// //             <div>
// //               <Label htmlFor="edit-title">Título *</Label>
// //               <Input
// //                 id="edit-title"
// //                 value={editTask.title}
// //                 onChange={(e) =>
// //                   setEditTask((prev) => ({ ...prev, title: e.target.value }))
// //                 }
// //                 placeholder="Digite o título da tarefa"
// //                 required
// //               />
// //             </div>

// //             <div>
// //               <Label htmlFor="edit-description">Descrição</Label>
// //               <Textarea
// //                 id="edit-description"
// //                 value={editTask.description}
// //                 onChange={(e) =>
// //                   setEditTask((prev) => ({
// //                     ...prev,
// //                     description: e.target.value,
// //                   }))
// //                 }
// //                 placeholder="Descreva a tarefa em detalhes..."
// //                 rows={4}
// //               />
// //             </div>

// //             <div>
// //               <Label htmlFor="edit-assigned">Responsável</Label>
// //               <Select
// //                 value={editTask.assignedToId || ""} // Garante que não seja undefined
// //                 onValueChange={(value) =>
// //                   setEditTask((prev) => ({ ...prev, assignedToId: value }))
// //                 }
// //               >
// //                 <SelectTrigger>
// //                   <SelectValue placeholder="Selecione um profissional" />
// //                 </SelectTrigger>
// //                 <SelectContent>
// //                   {professionals.map((professional) => (
// //                     <SelectItem key={professional.id} value={professional.id}>
// //                       {professional.name} - {professional.role}
// //                     </SelectItem>
// //                   ))}
// //                 </SelectContent>
// //               </Select>
// //             </div>

// //             <div>
// //               <Label htmlFor="edit-status">Status</Label>
// //               <Select
// //                 value={editTask.status}
// //                 onValueChange={(value) =>
// //                   setEditTask((prev) => ({
// //                     ...prev,
// //                     status: value as Task["status"],
// //                   }))
// //                 }
// //               >
// //                 <SelectTrigger>
// //                   <SelectValue />
// //                 </SelectTrigger>
// //                 <SelectContent>
// //                   {columns.map((column) => (
// //                     <SelectItem key={column.id} value={column.id}>
// //                       {column.title}
// //                     </SelectItem>
// //                   ))}
// //                 </SelectContent>
// //               </Select>
// //             </div>

// //             <div>
// //               <Label htmlFor="edit-dueDate">Prazo</Label>
// //               <Input
// //                 id="edit-dueDate"
// //                 type="datetime-local"
// //                 value={editTask.dueDate || ""}
// //                 onChange={(e) =>
// //                   setEditTask((prev) => ({
// //                     ...prev,
// //                     dueDate: e.target.value || null,
// //                   }))
// //                 }
// //               />
// //             </div>

// //             <div className="flex space-x-4 pt-4">
// //               <Button
// //                 type="button"
// //                 variant="outline"
// //                 onClick={() => setIsEditModalOpen(false)}
// //                 className="flex-1"
// //               >
// //                 Cancelar
// //               </Button>
// //               <Button type="submit" disabled={isSubmitting} className="flex-1">
// //                 {isSubmitting ? "Salvando..." : "Salvar Alterações"}
// //               </Button>
// //             </div>
// //           </form>
// //         </DialogContent>
// //       </Dialog>

// //       {/* Modal de Criação - CORRIGIDO */}
// //       <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
// //         <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
// //           <DialogHeader>
// //             <DialogTitle>Criar Nova Tarefa</DialogTitle>
// //           </DialogHeader>
// //           <form onSubmit={createTask} className="space-y-4">
// //             <div>
// //               <Label htmlFor="title">Título *</Label>
// //               <Input
// //                 id="title"
// //                 value={newTask.title}
// //                 onChange={(e) =>
// //                   setNewTask((prev) => ({ ...prev, title: e.target.value }))
// //                 }
// //                 placeholder="Digite o título da tarefa"
// //                 required
// //               />
// //             </div>

// //             <div>
// //               <Label htmlFor="description">Descrição</Label>
// //               <Textarea
// //                 id="description"
// //                 value={newTask.description}
// //                 onChange={(e) =>
// //                   setNewTask((prev) => ({
// //                     ...prev,
// //                     description: e.target.value,
// //                   }))
// //                 }
// //                 placeholder="Descreva a tarefa em detalhes..."
// //                 rows={4}
// //               />
// //             </div>

// //             <div>
// //               <Label htmlFor="image">Imagem</Label>
// //               <Input
// //                 id="image"
// //                 type="file"
// //                 accept="image/*"
// //                 onChange={(e) =>
// //                   setNewTask((prev) => ({
// //                     ...prev,
// //                     image: e.target.files?.[0] || null,
// //                   }))
// //                 }
// //               />
// //             </div>

// //             <div>
// //               <Label>Gravação de Áudio</Label>
// //               <div className="flex items-center space-x-3 mb-2">
// //                 <Button
// //                   type="button"
// //                   onClick={isRecording ? stopRecording : startRecording}
// //                   variant={isRecording ? "destructive" : "default"}
// //                 >
// //                   {isRecording ? "Parar Gravação" : "Iniciar Gravação"}
// //                 </Button>
// //                 <span className="text-sm text-gray-600">
// //                   {Math.floor(recordingTime / 60)}:
// //                   {(recordingTime % 60).toString().padStart(2, "0")}
// //                 </span>
// //               </div>
// //               {audioBlobUrl && (
// //                 <div className="mt-2">
// //                   <audio controls src={audioBlobUrl} className="w-full h-10">
// //                     Seu navegador não suporta o elemento de áudio.
// //                   </audio>
// //                 </div>
// //               )}
// //             </div>

// //             <div>
// //               <Label htmlFor="assignedTo">Responsável</Label>
// //               <Select
// //                 value={newTask.assignedToId}
// //                 onValueChange={(value) =>
// //                   setNewTask((prev) => ({ ...prev, assignedToId: value }))
// //                 }
// //               >
// //                 <SelectTrigger>
// //                   <SelectValue placeholder="Selecione um profissional" />
// //                 </SelectTrigger>
// //                 <SelectContent>
// //                   {professionals.map((professional) => (
// //                     <SelectItem key={professional.id} value={professional.id}>
// //                       {professional.name} - {professional.role}
// //                     </SelectItem>
// //                   ))}
// //                 </SelectContent>
// //               </Select>
// //             </div>

// //             <div>
// //               <Label htmlFor="status">Status</Label>
// //               <Select
// //                 value={newTask.status}
// //                 onValueChange={(value) =>
// //                   setNewTask((prev) => ({
// //                     ...prev,
// //                     status: value as Task["status"],
// //                   }))
// //                 }
// //               >
// //                 <SelectTrigger>
// //                   <SelectValue />
// //                 </SelectTrigger>
// //                 <SelectContent>
// //                   {columns.map((column) => (
// //                     <SelectItem key={column.id} value={column.id}>
// //                       {column.title}
// //                     </SelectItem>
// //                   ))}
// //                 </SelectContent>
// //               </Select>
// //             </div>

// //             <div>
// //               <Label htmlFor="dueDate">Prazo</Label>
// //               <Input
// //                 id="dueDate"
// //                 type="datetime-local"
// //                 value={newTask.dueDate}
// //                 onChange={(e) =>
// //                   setNewTask((prev) => ({ ...prev, dueDate: e.target.value }))
// //                 }
// //               />
// //             </div>

// //             <div className="flex space-x-4 pt-4">
// //               <Button
// //                 type="button"
// //                 variant="outline"
// //                 onClick={() => {
// //                   setIsCreateModalOpen(false);
// //                   setAudioBlobUrl(null);
// //                   setRecordingTime(0);
// //                   if (mediaRecorderRef.current) {
// //                     mediaRecorderRef.current.stream
// //                       .getTracks()
// //                       .forEach((track) => track.stop());
// //                   }
// //                 }}
// //                 className="flex-1"
// //               >
// //                 Cancelar
// //               </Button>
// //               <Button
// //                 type="submit"
// //                 disabled={!newTask.title || isSubmitting}
// //                 className="flex-1"
// //               >
// //                 {isSubmitting ? "Criando..." : "Criar Tarefa"}
// //               </Button>
// //             </div>
// //           </form>
// //         </DialogContent>
// //       </Dialog>
// //     </div>
// //   );
// // };

// // export default ProfessionalKanban;

// // versao corrigida do código acima:
// // "use client";

// // import { useState, useEffect, useRef } from "react";
// // import { motion, AnimatePresence } from "framer-motion";
// // import Router from "next/router";
// // import { Button } from "@/components/ui/button";
// // import {
// //   Dialog,
// //   DialogContent,
// //   DialogHeader,
// //   DialogTitle,
// //   DialogTrigger,
// // } from "@/components/ui/dialog";
// // import {
// //   DropdownMenu,
// //   DropdownMenuContent,
// //   DropdownMenuItem,
// //   DropdownMenuTrigger,
// // } from "@/components/ui/dropdown-menu";
// // import { Input } from "@/components/ui/input";
// // import { Textarea } from "@/components/ui/textarea";
// // import {
// //   Select,
// //   SelectContent,
// //   SelectItem,
// //   SelectTrigger,
// //   SelectValue,
// // } from "@/components/ui/select";
// // import { Card, CardContent } from "@/components/ui/card";
// // import { Badge } from "@/components/ui/badge";
// // import { Label } from "@/components/ui/label";

// // interface Professional {
// //   id: string;
// //   name: string;
// //   role: string;
// //   contact?: string;
// // }

// // interface Task {
// //   id: string;
// //   title: string;
// //   description: string;
// //   status: "A Fazer" | "Em Progresso" | "Revisão" | "Concluído";
// //   dueDate: string;
// //   assignedTo: Professional;
// //   assignedToId: string;
// //   createdAt: string;
// //   updatedAt: string;
// //   imageUrl?: string;
// //   audioUrl?: string;
// //   routes?: { name: string; address: string }[];
// // }

// // const ProfessionalKanban = () => {
// //   const [tasks, setTasks] = useState<Task[]>([]);
// //   const [professionals, setProfessionals] = useState<Professional[]>([]);
// //   const [loading, setLoading] = useState(true);
// //   const [error, setError] = useState<string | null>(null);
// //   const [selectedTask, setSelectedTask] = useState<Task | null>(null);
// //   const [isModalOpen, setIsModalOpen] = useState(false);
// //   const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
// //   const [isEditModalOpen, setIsEditModalOpen] = useState(false);
// //   const [editingTask, setEditingTask] = useState<Task | null>(null);

// //   const [newTask, setNewTask] = useState({
// //     title: "",
// //     description: "",
// //     status: "A Fazer" as Task["status"],
// //     dueDate: "",
// //     assignedToId: "",
// //     image: null as File | null,
// //     audio: null as Blob | null,
// //     routes: [] as { name: string; address: string }[],
// //   });

// //   // CORREÇÃO: Interface para editTask
// //   interface EditTaskState {
// //     title: string;
// //     description: string;
// //     status: Task["status"];
// //     dueDate: string | null;
// //     assignedToId: string | null;
// //     image: File | null;
// //     audio: Blob | null;
// //   }

// //   const [editTask, setEditTask] = useState<EditTaskState>({
// //     title: "",
// //     description: "",
// //     status: "A Fazer",
// //     dueDate: null,
// //     assignedToId: null,
// //     image: null,
// //     audio: null,
// //   });

// //   const [isSubmitting, setIsSubmitting] = useState(false);

// //   // Estados para gravação de áudio
// //   const [isRecording, setIsRecording] = useState(false);
// //   const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
// //   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
// //   const audioChunksRef = useRef<Blob[]>([]);
// //   const [recordingTime, setRecordingTime] = useState(0);

// //   const [isClient, setIsClient] = useState(false);

// //   const columns = [
// //     {
// //       id: "A Fazer",
// //       title: "A Fazer",
// //       color: "bg-blue-500",
// //       textColor: "text-blue-700",
// //     },
// //     {
// //       id: "Em Progresso",
// //       title: "Em Progresso",
// //       color: "bg-yellow-500",
// //       textColor: "text-yellow-700",
// //     },
// //     {
// //       id: "Revisão",
// //       title: "Em Revisão",
// //       color: "bg-purple-500",
// //       textColor: "text-purple-700",
// //     },
// //     {
// //       id: "Concluído",
// //       title: "Concluído",
// //       color: "bg-green-500",
// //       textColor: "text-green-700",
// //     },
// //   ];

// //   useEffect(() => {
// //     setIsClient(true);
// //     fetchData();
// //   }, []);

// //   // Temporizador para gravação
// //   useEffect(() => {
// //     let interval: NodeJS.Timeout | null = null;
// //     if (isRecording) {
// //       interval = setInterval(() => {
// //         setRecordingTime((prev) => prev + 1);
// //       }, 1000);
// //     }
// //     return () => {
// //       if (interval) clearInterval(interval);
// //     };
// //   }, [isRecording]);

// //   const fetchData = async () => {
// //     try {
// //       setLoading(true);
// //       setError(null);

// //       const professionalsResponse = await fetch(
// //         "http://localhost:3002/professionals"
// //       );
// //       if (!professionalsResponse.ok) {
// //         throw new Error(
// //           `Erro ao buscar profissionais: ${professionalsResponse.status}`
// //         );
// //       }
// //       const professionalsText = await professionalsResponse.text();
// //       let professionalsData;
// //       try {
// //         professionalsData = professionalsText
// //           ? JSON.parse(professionalsText)
// //           : [];
// //       } catch (parseError) {
// //         console.error(
// //           "Erro ao parsear profissionais:",
// //           parseError,
// //           "Response:",
// //           professionalsText
// //         );
// //         professionalsData = [];
// //       }
// //       const professionalsArray = Array.isArray(professionalsData)
// //         ? professionalsData
// //         : [];
// //       setProfessionals(professionalsArray);

// //       const tasksResponse = await fetch("http://localhost:3002/tasks");
// //       if (!tasksResponse.ok) {
// //         console.log("Nenhuma task encontrada ou erro na API");
// //         setTasks([]);
// //         return;
// //       }
// //       const tasksText = await tasksResponse.text();
// //       let tasksData;
// //       try {
// //         tasksData = tasksText ? JSON.parse(tasksText) : [];
// //       } catch (parseError) {
// //         console.error(
// //           "Erro ao parsear tasks:",
// //           parseError,
// //           "Response:",
// //           tasksText
// //         );
// //         tasksData = [];
// //       }
// //       const tasksArray = Array.isArray(tasksData) ? tasksData : [];
// //       tasksArray.sort(
// //         (a, b) =>
// //           new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
// //       );
// //       setTasks(tasksArray);
// //     } catch (error) {
// //       console.error("Erro ao buscar dados:", error);
// //       setError(
// //         "Erro ao carregar dados. Verifique se o servidor está rodando na porta 3002."
// //       );
// //       setProfessionals([]);
// //       setTasks([]);
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   // CORREÇÃO: Funções de drag and drop únicas
// //   const handleDragStart = (e: React.DragEvent, taskId: string) => {
// //     e.dataTransfer.setData("taskId", taskId);
// //     e.dataTransfer.effectAllowed = "move";

// //     // Adiciona feedback visual
// //     const element = e.currentTarget as HTMLElement;
// //     element.style.opacity = "0.6";
// //   };

// //   const handleDragEnd = (e: React.DragEvent) => {
// //     // Remove feedback visual
// //     const element = e.currentTarget as HTMLElement;
// //     element.style.opacity = "1";
// //   };

// //   const handleDragOver = (e: React.DragEvent) => {
// //     e.preventDefault();
// //     e.dataTransfer.dropEffect = "move";
// //   };

// //   const handleDrop = async (e: React.DragEvent, status: Task["status"]) => {
// //     e.preventDefault();

// //     const taskId = e.dataTransfer.getData("taskId");

// //     if (taskId) {
// //       console.log(`📦 Movendo tarefa ${taskId} para ${status}`);
// //       await updateTaskStatus(taskId, status);
// //     }
// //   };

// //   // Função de atualização de status - MELHORADA
// //   const updateTaskStatus = async (taskId: string, newStatus: Task["status"]) => {
// //     try {
// //       console.log(`🔄 Atualizando tarefa ${taskId} para status: ${newStatus}`);

// //       const task = tasks.find(t => t.id === taskId);
// //       if (!task) {
// //         console.error("❌ Tarefa não encontrada");
// //         return;
// //       }

// //       // Evitar atualização desnecessária
// //       if (task.status === newStatus) {
// //         console.log("ℹ️  Tarefa já está neste status");
// //         return;
// //       }

// //       // Atualização otimista
// //       setTasks((prev) =>
// //         prev.map((task) =>
// //           task.id === taskId ? { ...task, status: newStatus } : task
// //         )
// //       );

// //       const response = await fetch(`http://localhost:3002/tasks/${taskId}`, {
// //         method: "PATCH",
// //         headers: {
// //           "Content-Type": "application/json",
// //         },
// //         body: JSON.stringify({ status: newStatus }),
// //       });

// //       if (!response.ok) {
// //         const errorText = await response.text();
// //         throw new Error(errorText || `Erro ${response.status}: ${response.statusText}`);
// //       }

// //       const updatedTask = await response.json();
// //       console.log("✅ Status atualizado com sucesso:", updatedTask);

// //     } catch (error) {
// //       console.error("❌ Erro ao atualizar task:", error);
// //       // Reverter atualização otimista em caso de erro
// //       setError(`Erro ao mover tarefa: ${error.message}`);
// //       fetchData(); // Recarregar dados para sincronizar
// //     }
// //   };

// //   const deleteTask = async (taskId: string) => {
// //     if (!confirm("Tem certeza que deseja apagar esta tarefa?")) return;

// //     try {
// //       const response = await fetch(`http://localhost:3002/tasks/${taskId}`, {
// //         method: "DELETE",
// //       });

// //       if (response.ok) {
// //         setTasks((prev) => prev.filter((task) => task.id !== taskId));
// //       } else {
// //         console.error("Erro ao deletar task");
// //       }
// //     } catch (error) {
// //       console.error("Erro ao deletar:", error);
// //     }
// //   };

// //   // Função para abrir modal de edição
// //   const openEditModal = (task: Task) => {
// //     setEditingTask(task);
// //     setEditTask({
// //       title: task.title,
// //       description: task.description,
// //       status: task.status,
// //       dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : null,
// //       assignedToId: task.assignedToId || null,
// //       image: null,
// //       audio: null,
// //     });
// //     setIsEditModalOpen(true);
// //   };

// //   // Submeter edição
// //   const onEditSubmit = async (e: React.FormEvent) => {
// //     e.preventDefault();
// //     if (!editingTask) return;

// //     setIsSubmitting(true);
// //     try {
// //       // Validar título
// //       if (!editTask.title.trim()) {
// //         setError("O título é obrigatório");
// //         setIsSubmitting(false);
// //         return;
// //       }

// //       // Preparar dados para envio
// //       const updateData: any = {
// //         title: editTask.title.trim(),
// //         description: editTask.description?.trim() || "",
// //         status: editTask.status,
// //       };

// //       // Adicionar assignedToId apenas se selecionado
// //       if (editTask.assignedToId) {
// //         updateData.assignedToId = editTask.assignedToId;
// //       } else {
// //         updateData.assignedToId = null;
// //       }

// //       // Adicionar dueDate apenas se não estiver vazio
// //       if (editTask.dueDate) {
// //         updateData.dueDate = editTask.dueDate;
// //       } else {
// //         updateData.dueDate = null;
// //       }

// //       console.log("📤 Dados enviados para atualização:", updateData);

// //       const response = await fetch(`http://localhost:3002/tasks/${editingTask.id}`, {
// //         method: "PUT",
// //         headers: {
// //           "Content-Type": "application/json",
// //         },
// //         body: JSON.stringify(updateData),
// //       });

// //       if (!response.ok) {
// //         const errorText = await response.text();
// //         throw new Error(errorText || `Erro ${response.status}: ${response.statusText}`);
// //       }

// //       const updatedTask = await response.json();
// //       console.log("✅ Tarefa atualizada com sucesso:", updatedTask);

// //       // Atualizar estado local
// //       setTasks((prev) =>
// //         prev.map((task) => 
// //           task.id === editingTask.id 
// //             ? { 
// //                 ...task, 
// //                 ...updatedTask, 
// //                 assignedTo: professionals.find(p => p.id === updatedTask.assignedToId) || task.assignedTo 
// //               }
// //             : task
// //         )
// //       );

// //       setIsEditModalOpen(false);
// //       setEditingTask(null);
// //       setError(null);

// //     } catch (error) {
// //       console.error("❌ Erro ao editar tarefa:", error);
// //       if (error instanceof Error){
// //         setError(`Erro ao editar tarefa: ${error.message}`);
// //       }
// //     } finally {
// //       setIsSubmitting(false);
// //     }
// //   };

// //   // Função para atualizar tarefa
// //   const updateTask = async (taskId: string, body: any): Promise<Task> => {
// //     const response = await fetch(`http://localhost:3002/tasks/${taskId}`, {
// //       method: "PUT",
// //       headers: {
// //         "Content-Type": "application/json",
// //       },
// //       body: JSON.stringify(body),
// //     });

// //     if (!response.ok) {
// //       const errorText = await response.text();
// //       throw new Error(errorText || "Erro ao atualizar tarefa");
// //     }

// //     return response.json();
// //   };

// //   const startRecording = async () => {
// //     try {
// //       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
// //       mediaRecorderRef.current = new MediaRecorder(stream);
// //       audioChunksRef.current = [];

// //       mediaRecorderRef.current.ondataavailable = (event) => {
// //         if (event.data.size > 0) {
// //           audioChunksRef.current.push(event.data);
// //         }
// //       };

// //       mediaRecorderRef.current.onstop = () => {
// //         const audioBlob = new Blob(audioChunksRef.current, {
// //           type: "audio/webm",
// //         });
// //         setNewTask((prev) => ({ ...prev, audio: audioBlob }));
// //         setAudioBlobUrl(URL.createObjectURL(audioBlob));
// //       };

// //       mediaRecorderRef.current.start();
// //       setIsRecording(true);
// //     } catch (error) {
// //       console.error("Erro ao acessar o microfone:", error);
// //       setError(
// //         "Não foi possível acessar o microfone. Verifique as permissões."
// //       );
// //     }
// //   };

// //   const stopRecording = () => {
// //     if (mediaRecorderRef.current) {
// //       mediaRecorderRef.current.stop();
// //       setIsRecording(false);
// //       setRecordingTime(0);
// //       // Encerrar o stream de mídia
// //       mediaRecorderRef.current.stream
// //         .getTracks()
// //         .forEach((track) => track.stop());
// //     }
// //   };

// //   const createTask = async (e: React.FormEvent) => {
// //     e.preventDefault();
// //     if (isSubmitting) {
// //       console.log("🚫 Submissão bloqueada: já em andamento");
// //       return;
// //     }
// //     setIsSubmitting(true);

// //     console.log("=== 🚀 INICIANDO CRIAÇÃO DE TASK COM ARQUIVOS ===");
// //     console.log("🔍 Estado do newTask:", newTask);
// //     console.log("🖼️ Imagem:", newTask.image);
// //     console.log("🎵 Áudio:", newTask.audio);

// //     if (!newTask.title || newTask.title.trim() === "") {
// //       console.error("❌ Título está vazio!");
// //       setError("Por favor, preencha o título da tarefa");
// //       setIsSubmitting(false);
// //       return;
// //     }

// //     try {
// //       const formData = new FormData();
// //       formData.append("title", newTask.title.trim());
// //       formData.append("description", newTask.description?.trim() || "");
// //       formData.append("status", newTask.status);
// //       if (newTask.dueDate) formData.append("dueDate", newTask.dueDate);
// //       if (newTask.assignedToId)
// //         formData.append("assignedToId", newTask.assignedToId);

// //       if (newTask.image) {
// //         console.log(
// //           "📤 Anexando imagem:",
// //           newTask.image.name,
// //           newTask.image.size,
// //           newTask.image.type
// //         );
// //         formData.append("files", newTask.image);
// //       }
// //       if (newTask.audio) {
// //         console.log(
// //           "📤 Anexando áudio:",
// //           newTask.audio.size,
// //           newTask.audio.type
// //         );
// //         const audioFile = new File([newTask.audio], "recording.webm", {
// //           type: "audio/webm",
// //         });
// //         formData.append("files", audioFile);
// //       }

// //       console.log("📦 FormData entries:");
// //       for (let [key, value] of formData.entries()) {
// //         console.log(`   ${key}:`, value);
// //       }

// //       console.log("📤 Enviando para backend...");
// //       const response = await fetch("http://localhost:3002/tasks", {
// //         method: "POST",
// //         body: formData,
// //       });

// //       console.log("📥 Response status:", response.status);
// //       if (response.ok) {
// //         const createdTask = await response.json();
// //         console.log("✅ TASK CRIADA COM SUCESSO:", createdTask);
// //         console.log("🔗 URLs:", {
// //           imageUrl: createdTask.imageUrl,
// //           audioUrl: createdTask.audioUrl,
// //         });
// //         console.log("📋 Total de tarefas:", tasks.length + 1);
// //         setTasks((prev) => [...prev, createdTask]);
// //         setIsCreateModalOpen(false);
// //         setNewTask({
// //           title: "",
// //           description: "",
// //           status: "A Fazer",
// //           dueDate: "",
// //           assignedToId: "",
// //           image: null,
// //           audio: null,
// //           routes: [],
// //         });
// //         setAudioBlobUrl(null);
// //         setRecordingTime(0);
// //         setError(null);
// //       } else {
// //         const errorText = await response.text();
// //         console.error("❌ ERRO NA RESPOSTA:", errorText);
// //         setError("Erro ao criar tarefa: " + errorText);
// //       }
// //     } catch (error) {
// //       console.error("💥 ERRO DE CONEXÃO:", error);
// //       setError("Erro de conexão: " + (error as Error).message);
// //     } finally {
// //       setIsSubmitting(false);
// //     }
// //   };

// //   // REMOVIDAS: As declarações duplicadas de handleDragOver e handleDrop

// //   if (!isClient) {
// //     return (
// //       <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
// //         <div className="text-center">
// //           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
// //           <p className="text-gray-600">Carregando...</p>
// //         </div>
// //       </div>
// //     );
// //   }

// //   if (loading) {
// //     return (
// //       <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
// //         <div className="text-center">
// //           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
// //           <p className="text-gray-600">Carregando dados...</p>
// //         </div>
// //       </div>
// //     );
// //   }

// //   if (error) {
// //     return (
// //       <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
// //         <div className="text-center max-w-md mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6">
// //           <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
// //             <p className="font-semibold">Erro de Conexão</p>
// //             <p className="text-sm mt-1">{error}</p>
// //           </div>
// //           <Button onClick={fetchData}>Tentar Novamente</Button>
// //           <p className="text-xs text-gray-500 mt-3">
// //             Certifique-se de que o servidor backend está rodando em
// //             localhost:3002
// //           </p>
// //         </div>
// //       </div>
// //     );
// //   }

// //   return (
// //     <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
// //       <div className="max-w-7xl mx-auto">
// //         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
// //           <div>
// //             <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
// //               Kanban de Tarefas
// //             </h1>
// //             <p className="text-gray-600 text-sm sm:text-base">
// //               {professionals.length > 0
// //                 ? `${professionals.length} profissional(es) na equipe`
// //                 : "Nenhum profissional cadastrado"}
// //             </p>
// //           </div>
// //           <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
// //             <Button
// //               onClick={fetchData}
// //               variant="outline"
// //               className="flex items-center space-x-2"
// //             >
// //               <svg
// //                 className="w-4 h-4"
// //                 fill="none"
// //                 stroke="currentColor"
// //                 viewBox="0 0 24 24"
// //               >
// //                 <path
// //                   strokeLinecap="round"
// //                   strokeLinejoin="round"
// //                   strokeWidth={2}
// //                   d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
// //                 />
// //               </svg>
// //               <span>Atualizar</span>
// //             </Button>
// //             <Button
// //               onClick={() => setIsCreateModalOpen(true)}
// //               disabled={professionals.length === 0}
// //               className="flex items-center space-x-2"
// //             >
// //               <svg
// //                 className="w-4 h-4"
// //                 fill="none"
// //                 stroke="currentColor"
// //                 viewBox="0 0 24 24"
// //               >
// //                 <path
// //                   strokeLinecap="round"
// //                   strokeLinejoin="round"
// //                   strokeWidth={2}
// //                   d="M12 6v6m0 0v6m0-6h6m-6 0H6"
// //                 />
// //               </svg>
// //               <span>Nova Tarefa</span>
// //             </Button>
// //           </div>
// //         </div>

// //         {professionals.length === 0 && (
// //           <Card className="mb-6 border-yellow-200 bg-yellow-50">
// //             <CardContent className="p-4">
// //               <div className="flex items-start">
// //                 <svg
// //                   className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0"
// //                   fill="none"
// //                   stroke="currentColor"
// //                   viewBox="0 0 24 24"
// //                 >
// //                   <path
// //                     strokeLinecap="round"
// //                     strokeLinejoin="round"
// //                     strokeWidth={2}
// //                     d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
// //                   />
// //                 </svg>
// //                 <div>
// //                   <h3 className="font-semibold text-yellow-800 text-sm">
// //                     Nenhum profissional cadastrado
// //                   </h3>
// //                   <p className="text-yellow-700 text-xs mt-1">
// //                     Você precisa cadastrar profissionais antes de criar tarefas.
// //                     Acesse o formulário de cadastro primeiro.
// //                   </p>
// //                 </div>
// //               </div>
// //             </CardContent>
// //           </Card>
// //         )}

// //         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
// //           {columns.map((column) => (
// //             <Card
// //               key={column.id}
// //               className="border-gray-200 transition-colors duration-200"
// //               onDragOver={handleDragOver}
// //               onDrop={(e) => handleDrop(e, column.id as Task["status"])}
// //             >
// //               <div className={`p-4 rounded-t-lg ${column.color} text-white`}>
// //                 <div className="flex justify-between items-center">
// //                   <h3 className="font-semibold text-sm">{column.title}</h3>
// //                   <Badge variant="secondary" className="bg-white bg-opacity-20">
// //                     {tasks.filter((task) => task.status === column.id).length}
// //                   </Badge>
// //                 </div>
// //               </div>
// //               <CardContent className="p-4 space-y-4 min-h-[500px]">
// //                 <AnimatePresence>
// //                   {tasks
// //                     .filter((task) => task.status === column.id)
// //                     .map((task) => (
// //                       <motion.div
// //                         key={task.id}
// //                         layout
// //                         initial={{ opacity: 0, scale: 0.9 }}
// //                         animate={{ opacity: 1, scale: 1 }}
// //                         exit={{ opacity: 0, scale: 0.9 }}
// //                         draggable
// //                         onDragStart={(e) => handleDragStart(e, task.id)}
// //                         onDragEnd={handleDragEnd}
// //                         className="bg-white border border-gray-200 rounded-lg p-4 cursor-grab active:cursor-grabbing hover:shadow-lg transition-all duration-200 hover:border-blue-300 shadow-sm relative select-none"
// //                         style={{ userSelect: 'none' }}
// //                       >
// //                         {task.imageUrl && (
// //                           <div className="mb-3">
// //                             <img
// //                               src={task.imageUrl}
// //                               alt="Task preview"
// //                               className="w-full h-32 object-cover rounded-md"
// //                               onError={(e) => {
// //                                 e.currentTarget.src =
// //                                   "https://rxiclklkunpfmlxmubop.supabase.co/storage/v1/object/public/task-images/placeholder.png";
// //                                 e.currentTarget.onerror = null;
// //                               }}
// //                             />
// //                           </div>
// //                         )}

// //                         {/* Menu de ações com shadcn */}
// //                         <DropdownMenu>
// //                           <DropdownMenuTrigger asChild>
// //                             <Button
// //                               variant="ghost"
// //                               size="sm"
// //                               className="absolute top-2 right-2 h-8 w-8 p-0"
// //                               onClick={(e) => e.stopPropagation()}
// //                             >
// //                               <span className="sr-only">Abrir menu</span>
// //                               <svg
// //                                 className="w-4 h-4"
// //                                 fill="none"
// //                                 stroke="currentColor"
// //                                 viewBox="0 0 24 24"
// //                               >
// //                                 <path
// //                                   strokeLinecap="round"
// //                                   strokeLinejoin="round"
// //                                   strokeWidth={2}
// //                                   d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
// //                                 />
// //                               </svg>
// //                             </Button>
// //                           </DropdownMenuTrigger>
// //                           <DropdownMenuContent align="end">
// //                             <DropdownMenuItem
// //                               onClick={() => openEditModal(task)}
// //                             >
// //                               <svg
// //                                 className="w-4 h-4 mr-2"
// //                                 fill="none"
// //                                 stroke="currentColor"
// //                                 viewBox="0 0 24 24"
// //                               >
// //                                 <path
// //                                   strokeLinecap="round"
// //                                   strokeLinejoin="round"
// //                                   strokeWidth={2}
// //                                   d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
// //                                 />
// //                               </svg>
// //                               Editar
// //                             </DropdownMenuItem>
// //                             <DropdownMenuItem
// //                               onClick={() => deleteTask(task.id)}
// //                               className="text-red-600"
// //                             >
// //                               <svg
// //                                 className="w-4 h-4 mr-2"
// //                                 fill="none"
// //                                 stroke="currentColor"
// //                                 viewBox="0 0 24 24"
// //                               >
// //                                 <path
// //                                   strokeLinecap="round"
// //                                   strokeLinejoin="round"
// //                                   strokeWidth={2}
// //                                   d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
// //                                 />
// //                               </svg>
// //                               Excluir
// //                             </DropdownMenuItem>
// //                           </DropdownMenuContent>
// //                         </DropdownMenu>

// //                         <h4
// //                           className="font-semibold text-gray-900 mb-2 line-clamp-2 text-base cursor-pointer"
// //                           onClick={() => {
// //                             setSelectedTask(task);
// //                             setIsModalOpen(true);
// //                           }}
// //                         >
// //                           {task.title}
// //                         </h4>

// //                         {task.description && (
// //                           <p className="text-gray-600 text-sm mb-3 line-clamp-2">
// //                             {task.description}
// //                           </p>
// //                         )}

// //                         {task.audioUrl && (
// //                           <div className="mb-3">
// //                             <audio
// //                               controls
// //                               src={task.audioUrl}
// //                               className="w-full h-10"
// //                             >
// //                               Seu navegador não suporta o elemento de áudio.
// //                             </audio>
// //                           </div>
// //                         )}

// //                         <div className="flex items-center justify-between">
// //                           <div className="flex items-center space-x-2">
// //                             <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
// //                               <span className="text-blue-600 text-xs font-semibold">
// //                                 {task.assignedTo?.name?.charAt(0) || "?"}
// //                               </span>
// //                             </div>
// //                             <span className="text-sm text-gray-500 truncate max-w-[100px]">
// //                               {task.assignedTo?.name || "Não atribuído"}
// //                             </span>
// //                           </div>

// //                           {task.dueDate && (
// //                             <div className="flex items-center space-x-2">
// //                               <span
// //                                 className={`text-sm ${
// //                                   new Date(task.dueDate) < new Date()
// //                                     ? "text-red-600"
// //                                     : "text-gray-900"
// //                                 }`}
// //                               >
// //                                 {new Date(task.dueDate).toLocaleDateString(
// //                                   "pt-BR"
// //                                 )}
// //                               </span>
// //                             </div>
// //                           )}
// //                         </div>
// //                       </motion.div>
// //                     ))}
// //                 </AnimatePresence>

// //                 {tasks.filter((task) => task.status === column.id).length ===
// //                   0 && (
// //                   <div className="text-center text-gray-400 py-8 border-2 border-dashed border-gray-200 rounded-lg">
// //                     <svg
// //                       className="w-12 h-12 mx-auto mb-2"
// //                       fill="none"
// //                       stroke="currentColor"
// //                       viewBox="0 0 24 24"
// //                     >
// //                       <path
// //                         strokeLinecap="round"
// //                         strokeLinejoin="round"
// //                         strokeWidth={1}
// //                         d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
// //                       />
// //                     </svg>
// //                     <p className="text-sm">Nenhuma tarefa</p>
// //                   </div>
// //                 )}
// //               </CardContent>
// //             </Card>
// //           ))}
// //         </div>
// //       </div>

// //       {/* Modal de Visualização */}
// //       <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
// //         <DialogContent className="max-w-md">
// //           <DialogHeader>
// //             <DialogTitle>{selectedTask?.title}</DialogTitle>
// //           </DialogHeader>
// //           {selectedTask && (
// //             <div className="space-y-4">
// //               {selectedTask.imageUrl && (
// //                 <img
// //                   src={selectedTask.imageUrl}
// //                   alt="Task preview"
// //                   className="w-full h-48 object-cover rounded-md"
// //                 />
// //               )}
// //               {selectedTask.description && (
// //                 <p className="text-gray-600">{selectedTask.description}</p>
// //               )}
// //               {selectedTask.audioUrl && (
// //                 <audio controls className="w-full" src={selectedTask.audioUrl}>
// //                   Seu navegador não suporta o elemento de áudio.
// //                 </audio>
// //               )}
// //               <div className="space-y-2 text-sm">
// //                 <div className="flex justify-between">
// //                   <span className="font-medium">Responsável:</span>
// //                   <span>
// //                     {selectedTask.assignedTo?.name || "Não atribuído"}
// //                   </span>
// //                 </div>
// //                 <div className="flex justify-between">
// //                   <span className="font-medium">Status:</span>
// //                   <Badge variant="secondary">{selectedTask.status}</Badge>
// //                 </div>
// //                 {selectedTask.dueDate && (
// //                   <div className="flex justify-between">
// //                     <span className="font-medium">Prazo:</span>
// //                     <span
// //                       className={
// //                         new Date(selectedTask.dueDate) < new Date()
// //                           ? "text-red-600"
// //                           : ""
// //                       }
// //                     >
// //                       {new Date(selectedTask.dueDate).toLocaleString("pt-BR")}
// //                     </span>
// //                   </div>
// //                 )}
// //               </div>
// //             </div>
// //           )}
// //         </DialogContent>
// //       </Dialog>

// //       {/* Modal de Edição */}
// //       <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
// //         <DialogContent className="max-w-lg">
// //           <DialogHeader>
// //             <DialogTitle>Editar Tarefa</DialogTitle>
// //           </DialogHeader>
// //           <form onSubmit={onEditSubmit} className="space-y-4">
// //             <div>
// //               <Label htmlFor="edit-title">Título *</Label>
// //               <Input
// //                 id="edit-title"
// //                 value={editTask.title}
// //                 onChange={(e) =>
// //                   setEditTask((prev) => ({ ...prev, title: e.target.value }))
// //                 }
// //                 placeholder="Digite o título da tarefa"
// //                 required
// //               />
// //             </div>

// //             <div>
// //               <Label htmlFor="edit-description">Descrição</Label>
// //               <Textarea
// //                 id="edit-description"
// //                 value={editTask.description}
// //                 onChange={(e) =>
// //                   setEditTask((prev) => ({
// //                     ...prev,
// //                     description: e.target.value,
// //                   }))
// //                 }
// //                 placeholder="Descreva a tarefa em detalhes..."
// //                 rows={4}
// //               />
// //             </div>

// //             <div>
// //               <Label htmlFor="edit-assigned">Responsável</Label>
// //               <Select
// //                 value={editTask.assignedToId || ""}
// //                 onValueChange={(value) =>
// //                   setEditTask((prev) => ({ ...prev, assignedToId: value }))
// //                 }
// //               >
// //                 <SelectTrigger>
// //                   <SelectValue placeholder="Selecione um profissional" />
// //                 </SelectTrigger>
// //                 <SelectContent>
// //                   {professionals.map((professional) => (
// //                     <SelectItem key={professional.id} value={professional.id}>
// //                       {professional.name} - {professional.role}
// //                     </SelectItem>
// //                   ))}
// //                 </SelectContent>
// //               </Select>
// //             </div>

// //             <div>
// //               <Label htmlFor="edit-status">Status</Label>
// //               <Select
// //                 value={editTask.status}
// //                 onValueChange={(value) =>
// //                   setEditTask((prev) => ({
// //                     ...prev,
// //                     status: value as Task["status"],
// //                   }))
// //                 }
// //               >
// //                 <SelectTrigger>
// //                   <SelectValue />
// //                 </SelectTrigger>
// //                 <SelectContent>
// //                   {columns.map((column) => (
// //                     <SelectItem key={column.id} value={column.id}>
// //                       {column.title}
// //                     </SelectItem>
// //                   ))}
// //                 </SelectContent>
// //               </Select>
// //             </div>

// //             <div>
// //               <Label htmlFor="edit-dueDate">Prazo</Label>
// //               <Input
// //                 id="edit-dueDate"
// //                 type="datetime-local"
// //                 value={editTask.dueDate || ""}
// //                 onChange={(e) =>
// //                   setEditTask((prev) => ({
// //                     ...prev,
// //                     dueDate: e.target.value || null,
// //                   }))
// //                 }
// //               />
// //             </div>

// //             <div className="flex space-x-4 pt-4">
// //               <Button
// //                 type="button"
// //                 variant="outline"
// //                 onClick={() => setIsEditModalOpen(false)}
// //                 className="flex-1"
// //               >
// //                 Cancelar
// //               </Button>
// //               <Button type="submit" disabled={isSubmitting} className="flex-1">
// //                 {isSubmitting ? "Salvando..." : "Salvar Alterações"}
// //               </Button>
// //             </div>
// //           </form>
// //         </DialogContent>
// //       </Dialog>

// //       {/* Modal de Criação */}
// //       <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
// //         <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
// //           <DialogHeader>
// //             <DialogTitle>Criar Nova Tarefa</DialogTitle>
// //           </DialogHeader>
// //           <form onSubmit={createTask} className="space-y-4">
// //             <div>
// //               <Label htmlFor="title">Título *</Label>
// //               <Input
// //                 id="title"
// //                 value={newTask.title}
// //                 onChange={(e) =>
// //                   setNewTask((prev) => ({ ...prev, title: e.target.value }))
// //                 }
// //                 placeholder="Digite o título da tarefa"
// //                 required
// //               />
// //             </div>

// //             <div>
// //               <Label htmlFor="description">Descrição</Label>
// //               <Textarea
// //                 id="description"
// //                 value={newTask.description}
// //                 onChange={(e) =>
// //                   setNewTask((prev) => ({
// //                     ...prev,
// //                     description: e.target.value,
// //                   }))
// //                 }
// //                 placeholder="Descreva a tarefa em detalhes..."
// //                 rows={4}
// //               />
// //             </div>

// //             <div>
// //               <Label htmlFor="image">Imagem</Label>
// //               <Input
// //                 id="image"
// //                 type="file"
// //                 accept="image/*"
// //                 onChange={(e) =>
// //                   setNewTask((prev) => ({
// //                     ...prev,
// //                     image: e.target.files?.[0] || null,
// //                   }))
// //                 }
// //               />
// //             </div>

// //             <div>
// //               <Label>Gravação de Áudio</Label>
// //               <div className="flex items-center space-x-3 mb-2">
// //                 <Button
// //                   type="button"
// //                   onClick={isRecording ? stopRecording : startRecording}
// //                   variant={isRecording ? "destructive" : "default"}
// //                 >
// //                   {isRecording ? "Parar Gravação" : "Iniciar Gravação"}
// //                 </Button>
// //                 <span className="text-sm text-gray-600">
// //                   {Math.floor(recordingTime / 60)}:
// //                   {(recordingTime % 60).toString().padStart(2, "0")}
// //                 </span>
// //               </div>
// //               {audioBlobUrl && (
// //                 <div className="mt-2">
// //                   <audio controls src={audioBlobUrl} className="w-full h-10">
// //                     Seu navegador não suporta o elemento de áudio.
// //                   </audio>
// //                 </div>
// //               )}
// //             </div>

// //             <div>
// //               <Label htmlFor="assignedTo">Responsável</Label>
// //               <Select
// //                 value={newTask.assignedToId}
// //                 onValueChange={(value) =>
// //                   setNewTask((prev) => ({ ...prev, assignedToId: value }))
// //                 }
// //               >
// //                 <SelectTrigger>
// //                   <SelectValue placeholder="Selecione um profissional" />
// //                 </SelectTrigger>
// //                 <SelectContent>
// //                   {professionals.map((professional) => (
// //                     <SelectItem key={professional.id} value={professional.id}>
// //                       {professional.name} - {professional.role}
// //                     </SelectItem>
// //                   ))}
// //                 </SelectContent>
// //               </Select>
// //             </div>

// //             <div>
// //               <Label htmlFor="status">Status</Label>
// //               <Select
// //                 value={newTask.status}
// //                 onValueChange={(value) =>
// //                   setNewTask((prev) => ({
// //                     ...prev,
// //                     status: value as Task["status"],
// //                   }))
// //                 }
// //               >
// //                 <SelectTrigger>
// //                   <SelectValue />
// //                 </SelectTrigger>
// //                 <SelectContent>
// //                   {columns.map((column) => (
// //                     <SelectItem key={column.id} value={column.id}>
// //                       {column.title}
// //                     </SelectItem>
// //                   ))}
// //                 </SelectContent>
// //               </Select>
// //             </div>

// //             <div>
// //               <Label htmlFor="dueDate">Prazo</Label>
// //               <Input
// //                 id="dueDate"
// //                 type="datetime-local"
// //                 value={newTask.dueDate}
// //                 onChange={(e) =>
// //                   setNewTask((prev) => ({ ...prev, dueDate: e.target.value }))
// //                 }
// //               />
// //             </div>

// //             <div className="flex space-x-4 pt-4">
// //               <Button
// //                 type="button"
// //                 variant="outline"
// //                 onClick={() => {
// //                   setIsCreateModalOpen(false);
// //                   setAudioBlobUrl(null);
// //                   setRecordingTime(0);
// //                   if (mediaRecorderRef.current) {
// //                     mediaRecorderRef.current.stream
// //                       .getTracks()
// //                       .forEach((track) => track.stop());
// //                   }
// //                 }}
// //                 className="flex-1"
// //               >
// //                 Cancelar
// //               </Button>
// //               <Button
// //                 type="submit"
// //                 disabled={!newTask.title || isSubmitting}
// //                 className="flex-1"
// //               >
// //                 {isSubmitting ? "Criando..." : "Criar Tarefa"}
// //               </Button>
// //             </div>
// //           </form>
// //         </DialogContent>
// //       </Dialog>
// //     </div>
// //   );
// // };

// // export default ProfessionalKanban;

// // versao top
// "use client";

// import { useState, useEffect, useRef } from "react";
// import { Button } from "@/components/ui/button";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Card, CardContent } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Label } from "@/components/ui/label";

// interface Professional {
//   id: string;
//   name: string;
//   role: string;
//   contact?: string;
// }

// interface Task {
//   id: string;
//   title: string;
//   description: string;
//   status: "A Fazer" | "Em Progresso" | "Revisão" | "Concluído";
//   dueDate: string;
//   assignedTo: Professional;
//   assignedToId: string;
//   createdAt: string;
//   updatedAt: string;
//   imageUrl?: string;
//   audioUrl?: string;
// }

// const ProfessionalKanban = () => {
//   const [tasks, setTasks] = useState<Task[]>([]);
//   const [professionals, setProfessionals] = useState<Professional[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [selectedTask, setSelectedTask] = useState<Task | null>(null);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
//   const [isEditModalOpen, setIsEditModalOpen] = useState(false);
//   const [editingTask, setEditingTask] = useState<Task | null>(null);

//   const [newTask, setNewTask] = useState({
//     title: "",
//     description: "",
//     status: "A Fazer" as Task["status"],
//     dueDate: "",
//     assignedToId: "",
//     image: null as File | null,
//     audio: null as File | null,
//   });

//   const [editTask, setEditTask] = useState({
//     title: "",
//     description: "",
//     status: "A Fazer" as Task["status"],
//     dueDate: "",
//     assignedToId: "",
//   });

//   const [isSubmitting, setIsSubmitting] = useState(false);

//   // Estados para gravação de áudio
//   const [isRecording, setIsRecording] = useState(false);
//   const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
//   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
//   const audioChunksRef = useRef<Blob[]>([]);
//   const [recordingTime, setRecordingTime] = useState(0);

//   const [isClient, setIsClient] = useState(false);

//   const columns = [
//     {
//       id: "A Fazer",
//       title: "A Fazer",
//       color: "bg-blue-500",
//       textColor: "text-blue-700",
//     },
//     {
//       id: "Em Progresso",
//       title: "Em Progresso",
//       color: "bg-yellow-500",
//       textColor: "text-yellow-700",
//     },
//     {
//       id: "Revisão",
//       title: "Em Revisão",
//       color: "bg-purple-500",
//       textColor: "text-purple-700",
//     },
//     {
//       id: "Concluído",
//       title: "Concluído",
//       color: "bg-green-500",
//       textColor: "text-green-700",
//     },
//   ];

//   useEffect(() => {
//     setIsClient(true);
//     fetchData();
//   }, []);

//   // Temporizador para gravação
//   useEffect(() => {
//     let interval: NodeJS.Timeout | null = null;
//     if (isRecording) {
//       interval = setInterval(() => {
//         setRecordingTime((prev) => prev + 1);
//       }, 1000);
//     }
//     return () => {
//       if (interval) clearInterval(interval);
//     };
//   }, [isRecording]);

//   const fetchData = async () => {
//     try {
//       setLoading(true);
//       setError(null);

//       const [professionalsResponse, tasksResponse] = await Promise.all([
//         fetch("http://localhost:3002/professionals"),
//         fetch("http://localhost:3002/tasks")
//       ]);

//       // Processar profissionais
//       if (!professionalsResponse.ok) {
//         throw new Error(`Erro ao buscar profissionais: ${professionalsResponse.status}`);
//       }
//       const professionalsData = await professionalsResponse.json();
//       setProfessionals(Array.isArray(professionalsData) ? professionalsData : []);

//       // Processar tasks
//       if (!tasksResponse.ok) {
//         console.log("Nenhuma task encontrada ou erro na API");
//         setTasks([]);
//         return;
//       }
//       const tasksData = await tasksResponse.json();
//       const tasksArray = Array.isArray(tasksData) ? tasksData : [];
//       tasksArray.sort(
//         (a, b) =>
//           new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
//       );
//       setTasks(tasksArray);
//     } catch (error) {
//       console.error("Erro ao buscar dados:", error);
//       setError(
//         "Erro ao carregar dados. Verifique se o servidor está rodando na porta 3002."
//       );
//       setProfessionals([]);
//       setTasks([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Funções de drag and drop
//   const handleDragStart = (e: React.DragEvent, taskId: string) => {
//     e.dataTransfer.setData("taskId", taskId);
//     const element = e.currentTarget as HTMLElement;
//     element.style.opacity = "0.6";
//   };

//   const handleDragEnd = (e: React.DragEvent) => {
//     const element = e.currentTarget as HTMLElement;
//     element.style.opacity = "1";
//   };

//   const handleDragOver = (e: React.DragEvent) => {
//     e.preventDefault();
//     e.dataTransfer.dropEffect = "move";
//   };

//   const handleDrop = async (e: React.DragEvent, status: Task["status"]) => {
//     e.preventDefault();

//     const taskId = e.dataTransfer.getData("taskId");

//     if (taskId) {
//       await updateTaskStatus(taskId, status);
//     }
//   };

//   // Função de atualização de status
//   const updateTaskStatus = async (taskId: string, newStatus: Task["status"]) => {
//     try {
//       const task = tasks.find(t => t.id === taskId);
//       if (!task || task.status === newStatus) return;

//       // Atualização otimista
//       setTasks((prev) =>
//         prev.map((task) =>
//           task.id === taskId ? { ...task, status: newStatus } : task
//         )
//       );

//       const response = await fetch(`http://localhost:3002/tasks/${taskId}/status`, {
//         method: "PATCH",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ status: newStatus }),
//       });

//       if (!response.ok) {
//         throw new Error(`Erro ${response.status}: ${response.statusText}`);
//       }

//       console.log("✅ Status atualizado com sucesso");

//     } catch (error) {
//       console.error("❌ Erro ao atualizar task:", error);
//       if (error instanceof Error){
//         setError(`Erro ao mover tarefa: ${error.message}`);
//       }
//       fetchData(); // Recarregar dados para sincronizar
//     }
//   };

//   const deleteTask = async (taskId: string) => {
//     if (!confirm("Tem certeza que deseja apagar esta tarefa?")) return;

//     try {
//       const response = await fetch(`http://localhost:3002/tasks/${taskId}`, {
//         method: "DELETE",
//       });

//       if (response.ok) {
//         setTasks((prev) => prev.filter((task) => task.id !== taskId));
//       } else {
//         throw new Error("Erro ao deletar task");
//       }
//     } catch (error) {
//       console.error("Erro ao deletar:", error);
//       setError("Erro ao deletar tarefa");
//     }
//   };

//   // Função para abrir modal de edição
//   const openEditModal = (task: Task) => {
//     setEditingTask(task);
//     setEditTask({
//       title: task.title,
//       description: task.description,
//       status: task.status,
//       dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : "",
//       assignedToId: task.assignedToId || "",
//     });
//     setIsEditModalOpen(true);
//   };

//   // Submeter edição
//   const onEditSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!editingTask) return;

//     setIsSubmitting(true);
//     try {
//       if (!editTask.title.trim()) {
//         setError("O título é obrigatório");
//         return;
//       }

//       const updateData: any = {
//         title: editTask.title.trim(),
//         description: editTask.description?.trim() || "",
//         status: editTask.status,
//       };

//       if (editTask.assignedToId) {
//         updateData.assignedToId = editTask.assignedToId;
//       } else {
//         updateData.assignedToId = null;
//       }

//       if (editTask.dueDate) {
//         updateData.dueDate = editTask.dueDate;
//       } else {
//         updateData.dueDate = null;
//       }

//       const response = await fetch(`http://localhost:3002/tasks/${editingTask.id}`, {
//         method: "PUT",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(updateData),
//       });

//       if (!response.ok) {
//         const errorText = await response.text();
//         throw new Error(errorText || `Erro ${response.status}`);
//       }

//       const updatedTask = await response.json();

//       // Atualizar estado local
//       setTasks((prev) =>
//         prev.map((task) => 
//           task.id === editingTask.id 
//             ? { 
//                 ...task, 
//                 ...updatedTask, 
//                 assignedTo: professionals.find(p => p.id === updatedTask.assignedToId) || task.assignedTo 
//               }
//             : task
//         )
//       );

//       setIsEditModalOpen(false);
//       setEditingTask(null);
//       setError(null);

//     } catch (error) {
//       console.error("❌ Erro ao editar tarefa:", error);
//       if( error instanceof Error){
//         setError(`Erro ao editar tarefa: ${error.message}`);
//       }
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const startRecording = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//       mediaRecorderRef.current = new MediaRecorder(stream);
//       audioChunksRef.current = [];

//       mediaRecorderRef.current.ondataavailable = (event) => {
//         if (event.data.size > 0) {
//           audioChunksRef.current.push(event.data);
//         }
//       };

//       mediaRecorderRef.current.onstop = () => {
//         const audioBlob = new Blob(audioChunksRef.current, {
//           type: "audio/webm",
//         });
//         setAudioBlob(audioBlob);
//         setNewTask((prev) => ({ ...prev, audio: new File([audioBlob], "recording.webm", { type: "audio/webm" }) }));
//       };

//       mediaRecorderRef.current.start();
//       setIsRecording(true);
//     } catch (error) {
//       console.error("Erro ao acessar o microfone:", error);
//       setError(
//         "Não foi possível acessar o microfone. Verifique as permissões."
//       );
//     }
//   };

//   const stopRecording = () => {
//     if (mediaRecorderRef.current) {
//       mediaRecorderRef.current.stop();
//       setIsRecording(false);
//       setRecordingTime(0);
//       mediaRecorderRef.current.stream
//         .getTracks()
//         .forEach((track) => track.stop());
//     }
//   };

//   const createTask = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (isSubmitting) return;

//     setIsSubmitting(true);

//     if (!newTask.title || newTask.title.trim() === "") {
//       setError("Por favor, preencha o título da tarefa");
//       setIsSubmitting(false);
//       return;
//     }

//     try {
//       const formData = new FormData();
//       formData.append("title", newTask.title.trim());
//       formData.append("description", newTask.description?.trim() || "");
//       formData.append("status", newTask.status);

//       if (newTask.dueDate) formData.append("dueDate", newTask.dueDate);
//       if (newTask.assignedToId) formData.append("assignedToId", newTask.assignedToId);

//       // Adicionar arquivos
//       if (newTask.image) {
//         formData.append("files", newTask.image);
//       }
//       if (newTask.audio) {
//         formData.append("files", newTask.audio);
//       }

//       const response = await fetch("http://localhost:3002/tasks", {
//         method: "POST",
//         body: formData,
//       });

//       if (response.ok) {
//         const createdTask = await response.json();
//         setTasks((prev) => [...prev, createdTask]);
//         setIsCreateModalOpen(false);
//         setNewTask({
//           title: "",
//           description: "",
//           status: "A Fazer",
//           dueDate: "",
//           assignedToId: "",
//           image: null,
//           audio: null,
//         });
//         setAudioBlob(null);
//         setRecordingTime(0);
//         setError(null);
//       } else {
//         const errorText = await response.text();
//         setError("Erro ao criar tarefa: " + errorText);
//       }
//     } catch (error) {
//       console.error("💥 ERRO DE CONEXÃO:", error);
//       setError("Erro de conexão: " + (error as Error).message);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   if (!isClient) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
//           <p className="text-gray-600">Carregando...</p>
//         </div>
//       </div>
//     );
//   }

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
//           <p className="text-gray-600">Carregando dados...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
//       <div className="max-w-7xl mx-auto">
//         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
//           <div>
//             <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
//               Kanban de Tarefas
//             </h1>
//             <p className="text-gray-600 text-sm sm:text-base">
//               {professionals.length > 0
//                 ? `${professionals.length} profissional(es) na equipe`
//                 : "Nenhum profissional cadastrado"}
//             </p>
//           </div>
//           <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
//             <Button
//               onClick={fetchData}
//               variant="outline"
//               className="flex items-center space-x-2"
//             >
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
//               </svg>
//               <span>Atualizar</span>
//             </Button>
//             <Button
//               onClick={() => setIsCreateModalOpen(true)}
//               disabled={professionals.length === 0}
//               className="flex items-center space-x-2"
//             >
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
//               </svg>
//               <span>Nova Tarefa</span>
//             </Button>
//           </div>
//         </div>

//         {error && (
//           <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
//             <div className="flex items-center">
//               <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//               </svg>
//               <span className="text-red-700 text-sm">{error}</span>
//             </div>
//             <Button 
//               onClick={() => setError(null)} 
//               variant="ghost" 
//               size="sm" 
//               className="mt-2 text-red-600 hover:text-red-700"
//             >
//               Fechar
//             </Button>
//           </div>
//         )}

//         {professionals.length === 0 && (
//           <Card className="mb-6 border-yellow-200 bg-yellow-50">
//             <CardContent className="p-4">
//               <div className="flex items-start">
//                 <svg className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
//                 </svg>
//                 <div>
//                   <h3 className="font-semibold text-yellow-800 text-sm">
//                     Nenhum profissional cadastrado
//                   </h3>
//                   <p className="text-yellow-700 text-xs mt-1">
//                     Você precisa cadastrar profissionais antes de criar tarefas.
//                   </p>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         )}

//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
//           {columns.map((column) => (
//             <Card
//               key={column.id}
//               className="border-gray-200 transition-colors duration-200"
//               onDragOver={handleDragOver}
//               onDrop={(e) => handleDrop(e, column.id as Task["status"])}
//             >
//               <div className={`p-4 rounded-t-lg ${column.color} text-white`}>
//                 <div className="flex justify-between items-center">
//                   <h3 className="font-semibold text-sm">{column.title}</h3>
//                   <Badge variant="secondary" className="bg-white bg-opacity-20">
//                     {tasks.filter((task) => task.status === column.id).length}
//                   </Badge>
//                 </div>
//               </div>
//               <CardContent className="p-4 space-y-4 min-h-[500px]">
//                 {tasks
//                   .filter((task) => task.status === column.id)
//                   .map((task) => (
//                     <div
//                       key={task.id}
//                       draggable
//                       onDragStart={(e) => handleDragStart(e, task.id)}
//                       onDragEnd={handleDragEnd}
//                       className="bg-white border border-gray-200 rounded-lg p-4 cursor-grab active:cursor-grabbing hover:shadow-lg transition-all duration-200 hover:border-blue-300 shadow-sm relative select-none"
//                     >
//                       {task.imageUrl && (
//                         <div className="mb-3">
//                           <img
//                             src={task.imageUrl}
//                             alt="Task preview"
//                             className="w-full h-32 object-cover rounded-md"
//                             onError={(e) => {
//                               e.currentTarget.src = "/placeholder-image.png";
//                               e.currentTarget.onerror = null;
//                             }}
//                           />
//                         </div>
//                       )}

//                       <DropdownMenu>
//                         <DropdownMenuTrigger asChild>
//                           <Button
//                             variant="ghost"
//                             size="sm"
//                             className="absolute top-2 right-2 h-8 w-8 p-0"
//                             onClick={(e) => e.stopPropagation()}
//                           >
//                             <span className="sr-only">Abrir menu</span>
//                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
//                             </svg>
//                           </Button>
//                         </DropdownMenuTrigger>
//                         <DropdownMenuContent align="end">
//                           <DropdownMenuItem onClick={() => openEditModal(task)}>
//                             <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
//                             </svg>
//                             Editar
//                           </DropdownMenuItem>
//                           <DropdownMenuItem
//                             onClick={() => deleteTask(task.id)}
//                             className="text-red-600"
//                           >
//                             <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
//                             </svg>
//                             Excluir
//                           </DropdownMenuItem>
//                         </DropdownMenuContent>
//                       </DropdownMenu>

//                       <h4
//                         className="font-semibold text-gray-900 mb-2 line-clamp-2 text-base cursor-pointer"
//                         onClick={() => {
//                           setSelectedTask(task);
//                           setIsModalOpen(true);
//                         }}
//                       >
//                         {task.title}
//                       </h4>

//                       {task.description && (
//                         <p className="text-gray-600 text-sm mb-3 line-clamp-2">
//                           {task.description}
//                         </p>
//                       )}

//                       {task.audioUrl && (
//                         <div className="mb-3">
//                           <audio
//                             controls
//                             src={task.audioUrl}
//                             className="w-full h-10"
//                           >
//                             Seu navegador não suporta o elemento de áudio.
//                           </audio>
//                         </div>
//                       )}

//                       <div className="flex items-center justify-between">
//                         <div className="flex items-center space-x-2">
//                           <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
//                             <span className="text-blue-600 text-xs font-semibold">
//                               {task.assignedTo?.name?.charAt(0) || "?"}
//                             </span>
//                           </div>
//                           <span className="text-sm text-gray-500 truncate max-w-[100px]">
//                             {task.assignedTo?.name || "Não atribuído"}
//                           </span>
//                         </div>

//                         {task.dueDate && (
//                           <div className="flex items-center space-x-2">
//                             <span
//                               className={`text-sm ${
//                                 new Date(task.dueDate) < new Date()
//                                   ? "text-red-600"
//                                   : "text-gray-900"
//                               }`}
//                             >
//                               {new Date(task.dueDate).toLocaleDateString("pt-BR")}
//                             </span>
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   ))}

//                 {tasks.filter((task) => task.status === column.id).length === 0 && (
//                   <div className="text-center text-gray-400 py-8 border-2 border-dashed border-gray-200 rounded-lg">
//                     <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//                     </svg>
//                     <p className="text-sm">Nenhuma tarefa</p>
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           ))}
//         </div>
//       </div>

//       {/* Modal de Visualização */}
//       <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
//         <DialogContent className="max-w-md">
//           <DialogHeader>
//             <DialogTitle>{selectedTask?.title}</DialogTitle>
//           </DialogHeader>
//           {selectedTask && (
//             <div className="space-y-4">
//               {selectedTask.imageUrl && (
//                 <img
//                   src={selectedTask.imageUrl}
//                   alt="Task preview"
//                   className="w-full h-48 object-cover rounded-md"
//                 />
//               )}
//               {selectedTask.description && (
//                 <p className="text-gray-600">{selectedTask.description}</p>
//               )}
//               {selectedTask.audioUrl && (
//                 <audio controls className="w-full" src={selectedTask.audioUrl}>
//                   Seu navegador não suporta o elemento de áudio.
//                 </audio>
//               )}
//               <div className="space-y-2 text-sm">
//                 <div className="flex justify-between">
//                   <span className="font-medium">Responsável:</span>
//                   <span>{selectedTask.assignedTo?.name || "Não atribuído"}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="font-medium">Status:</span>
//                   <Badge variant="secondary">{selectedTask.status}</Badge>
//                 </div>
//                 {selectedTask.dueDate && (
//                   <div className="flex justify-between">
//                     <span className="font-medium">Prazo:</span>
//                     <span className={new Date(selectedTask.dueDate) < new Date() ? "text-red-600" : ""}>
//                       {new Date(selectedTask.dueDate).toLocaleString("pt-BR")}
//                     </span>
//                   </div>
//                 )}
//               </div>
//             </div>
//           )}
//         </DialogContent>
//       </Dialog>

//       {/* Modal de Edição */}
//       <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
//         <DialogContent className="max-w-lg">
//           <DialogHeader>
//             <DialogTitle>Editar Tarefa</DialogTitle>
//           </DialogHeader>
//           <form onSubmit={onEditSubmit} className="space-y-4">
//             <div>
//               <Label htmlFor="edit-title">Título *</Label>
//               <Input
//                 id="edit-title"
//                 value={editTask.title}
//                 onChange={(e) => setEditTask((prev) => ({ ...prev, title: e.target.value }))}
//                 placeholder="Digite o título da tarefa"
//                 required
//               />
//             </div>

//             <div>
//               <Label htmlFor="edit-description">Descrição</Label>
//               <Textarea
//                 id="edit-description"
//                 value={editTask.description}
//                 onChange={(e) => setEditTask((prev) => ({ ...prev, description: e.target.value }))}
//                 placeholder="Descreva a tarefa em detalhes..."
//                 rows={4}
//               />
//             </div>

//             <div>
//               <Label htmlFor="edit-assigned">Responsável</Label>
//               <Select
//                 value={editTask.assignedToId}
//                 onValueChange={(value) => setEditTask((prev) => ({ ...prev, assignedToId: value }))}
//               >
//                 <SelectTrigger>
//                   <SelectValue placeholder="Selecione um profissional" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {professionals.map((professional) => (
//                     <SelectItem key={professional.id} value={professional.id}>
//                       {professional.name} - {professional.role}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>

//             <div>
//               <Label htmlFor="edit-status">Status</Label>
//               <Select
//                 value={editTask.status}
//                 onValueChange={(value) => setEditTask((prev) => ({ ...prev, status: value as Task["status"] }))}
//               >
//                 <SelectTrigger>
//                   <SelectValue />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {columns.map((column) => (
//                     <SelectItem key={column.id} value={column.id}>
//                       {column.title}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>

//             <div>
//               <Label htmlFor="edit-dueDate">Prazo</Label>
//               <Input
//                 id="edit-dueDate"
//                 type="datetime-local"
//                 value={editTask.dueDate}
//                 onChange={(e) => setEditTask((prev) => ({ ...prev, dueDate: e.target.value }))}
//               />
//             </div>

//             <div className="flex space-x-4 pt-4">
//               <Button
//                 type="button"
//                 variant="outline"
//                 onClick={() => setIsEditModalOpen(false)}
//                 className="flex-1"
//               >
//                 Cancelar
//               </Button>
//               <Button type="submit" disabled={isSubmitting} className="flex-1">
//                 {isSubmitting ? "Salvando..." : "Salvar Alterações"}
//               </Button>
//             </div>
//           </form>
//         </DialogContent>
//       </Dialog>

//       {/* Modal de Criação */}
//       <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
//         <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
//           <DialogHeader>
//             <DialogTitle>Criar Nova Tarefa</DialogTitle>
//           </DialogHeader>
//           <form onSubmit={createTask} className="space-y-4">
//             <div>
//               <Label htmlFor="title">Título *</Label>
//               <Input
//                 id="title"
//                 value={newTask.title}
//                 onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
//                 placeholder="Digite o título da tarefa"
//                 required
//               />
//             </div>

//             <div>
//               <Label htmlFor="description">Descrição</Label>
//               <Textarea
//                 id="description"
//                 value={newTask.description}
//                 onChange={(e) => setNewTask((prev) => ({ ...prev, description: e.target.value }))}
//                 placeholder="Descreva a tarefa em detalhes..."
//                 rows={4}
//               />
//             </div>

//             <div>
//               <Label htmlFor="image">Imagem</Label>
//               <Input
//                 id="image"
//                 type="file"
//                 accept="image/*"
//                 onChange={(e) => setNewTask((prev) => ({ ...prev, image: e.target.files?.[0] || null }))}
//               />
//             </div>

//             <div>
//               <Label>Gravação de Áudio</Label>
//               <div className="flex items-center space-x-3 mb-2">
//                 <Button
//                   type="button"
//                   onClick={isRecording ? stopRecording : startRecording}
//                   variant={isRecording ? "destructive" : "default"}
//                 >
//                   {isRecording ? "Parar Gravação" : "Iniciar Gravação"}
//                 </Button>
//                 <span className="text-sm text-gray-600">
//                   {Math.floor(recordingTime / 60)}:
//                   {(recordingTime % 60).toString().padStart(2, "0")}
//                 </span>
//               </div>
//               {audioBlob && (
//                 <div className="mt-2">
//                   <audio controls className="w-full h-10">
//                     <source src={URL.createObjectURL(audioBlob)} type="audio/webm" />
//                     Seu navegador não suporta o elemento de áudio.
//                   </audio>
//                 </div>
//               )}
//             </div>

//             <div>
//               <Label htmlFor="assignedTo">Responsável</Label>
//               <Select
//                 value={newTask.assignedToId}
//                 onValueChange={(value) => setNewTask((prev) => ({ ...prev, assignedToId: value }))}
//               >
//                 <SelectTrigger>
//                   <SelectValue placeholder="Selecione um profissional" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {professionals.map((professional) => (
//                     <SelectItem key={professional.id} value={professional.id}>
//                       {professional.name} - {professional.role}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>

//             <div>
//               <Label htmlFor="status">Status</Label>
//               <Select
//                 value={newTask.status}
//                 onValueChange={(value) => setNewTask((prev) => ({ ...prev, status: value as Task["status"] }))}
//               >
//                 <SelectTrigger>
//                   <SelectValue />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {columns.map((column) => (
//                     <SelectItem key={column.id} value={column.id}>
//                       {column.title}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>

//             <div>
//               <Label htmlFor="dueDate">Prazo</Label>
//               <Input
//                 id="dueDate"
//                 type="datetime-local"
//                 value={newTask.dueDate}
//                 onChange={(e) => setNewTask((prev) => ({ ...prev, dueDate: e.target.value }))}
//               />
//             </div>

//             <div className="flex space-x-4 pt-4">
//               <Button
//                 type="button"
//                 variant="outline"
//                 onClick={() => {
//                   setIsCreateModalOpen(false);
//                   setAudioBlob(null);
//                   setRecordingTime(0);
//                   if (mediaRecorderRef.current) {
//                     mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
//                   }
//                 }}
//                 className="flex-1"
//               >
//                 Cancelar
//               </Button>
//               <Button
//                 type="submit"
//                 disabled={!newTask.title || isSubmitting}
//                 className="flex-1"
//               >
//                 {isSubmitting ? "Criando..." : "Criar Tarefa"}
//               </Button>
//             </div>
//           </form>
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// };

// export default ProfessionalKanban;

// VERSAO FUNCIONANDO

// "use client";

// import { useState, useEffect, useRef } from "react";
// import { Button } from "@/components/ui/button";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Card, CardContent } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Label } from "@/components/ui/label";

// interface Professional {
//   id: string;
//   name: string;
//   role: string;
//   contact?: string;
// }

// interface Task {
//   id: string;
//   title: string;
//   description: string;
//   status: "A Fazer" | "Em Progresso" | "Revisão" | "Concluído";
//   dueDate: string;
//   assignedTo: Professional;
//   assignedToId: string;
//   createdAt: string;
//   updatedAt: string;
//   imageUrl?: string;
//   audioUrl?: string;
// }

// // URL base da API - ajustada para porta 3002
// const API_BASE_URL = "http://localhost:3002";

// const ProfessionalKanban = () => {
//   const [tasks, setTasks] = useState<Task[]>([]);
//   const [professionals, setProfessionals] = useState<Professional[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [selectedTask, setSelectedTask] = useState<Task | null>(null);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
//   const [isEditModalOpen, setIsEditModalOpen] = useState(false);
//   const [editingTask, setEditingTask] = useState<Task | null>(null);

//   const [newTask, setNewTask] = useState({
//     title: "",
//     description: "",
//     status: "A Fazer" as Task["status"],
//     dueDate: "",
//     assignedToId: "",
//     image: null as File | null,
//     audio: null as File | null,
//   });

//   const [editTask, setEditTask] = useState({
//     title: "",
//     description: "",
//     status: "A Fazer" as Task["status"],
//     dueDate: "",
//     assignedToId: "",
//   });

//   const [isSubmitting, setIsSubmitting] = useState(false);

//   // Estados para gravação de áudio
//   const [isRecording, setIsRecording] = useState(false);
//   const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
//   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
//   const audioChunksRef = useRef<Blob[]>([]);
//   const [recordingTime, setRecordingTime] = useState(0);

//   const [isClient, setIsClient] = useState(false);

//   const columns = [
//     {
//       id: "A Fazer",
//       title: "A Fazer",
//       color: "bg-blue-500",
//       textColor: "text-blue-700",
//     },
//     {
//       id: "Em Progresso",
//       title: "Em Progresso",
//       color: "bg-yellow-500",
//       textColor: "text-yellow-700",
//     },
//     {
//       id: "Revisão",
//       title: "Em Revisão",
//       color: "bg-purple-500",
//       textColor: "text-purple-700",
//     },
//     {
//       id: "Concluído",
//       title: "Concluído",
//       color: "bg-green-500",
//       textColor: "text-green-700",
//     },
//   ];

//   useEffect(() => {
//     setIsClient(true);
//     fetchData();
//   }, []);

//   // Temporizador para gravação
//   useEffect(() => {
//     let interval: NodeJS.Timeout | null = null;
//     if (isRecording) {
//       interval = setInterval(() => {
//         setRecordingTime((prev) => prev + 1);
//       }, 1000);
//     }
//     return () => {
//       if (interval) clearInterval(interval);
//     };
//   }, [isRecording]);

//   const fetchData = async () => {
//     try {
//       setLoading(true);
//       setError(null);

//       console.log('📡 Buscando dados da API...');

//       const [professionalsResponse, tasksResponse] = await Promise.all([
//         fetch(`${API_BASE_URL}/professionals`),
//         fetch(`${API_BASE_URL}/tasks`)
//       ]);

//       console.log('📊 Resposta profissionais:', professionalsResponse.status);
//       console.log('📊 Resposta tasks:', tasksResponse.status);

//       // Processar profissionais
//       if (!professionalsResponse.ok) {
//         throw new Error(`Erro ao buscar profissionais: ${professionalsResponse.status}`);
//       }
//       const professionalsData = await professionalsResponse.json();
//       console.log('👥 Profissionais carregados:', professionalsData);
//       setProfessionals(Array.isArray(professionalsData) ? professionalsData : []);

//       // Processar tasks
//       if (!tasksResponse.ok) {
//         console.log("❌ Nenhuma task encontrada ou erro na API");
//         setTasks([]);
//         return;
//       }

//       const tasksData = await tasksResponse.json();
//       console.log('📦 Dados brutos das tasks:', tasksData);

//       // Ajuste para diferentes formatos de resposta
//       let tasksArray: Task[] = [];

//       if (Array.isArray(tasksData)) {
//         tasksArray = tasksData;
//       } else if (tasksData.tasks && Array.isArray(tasksData.tasks)) {
//         tasksArray = tasksData.tasks;
//       } else if (tasksData.data && Array.isArray(tasksData.data)) {
//         tasksArray = tasksData.data;
//       }

//       console.log('✅ Tasks processadas:', tasksArray);

//       // Ordenar por data de atualização
//       tasksArray.sort(
//         (a, b) =>
//           new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
//       );

//       setTasks(tasksArray);

//     } catch (error) {
//       console.error("💥 Erro ao buscar dados:", error);
//       setError(
//         "Erro ao carregar dados. Verifique se o servidor está rodando na porta 3002."
//       );
//       setProfessionals([]);
//       setTasks([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Funções de drag and drop
//   const handleDragStart = (e: React.DragEvent, taskId: string) => {
//     e.dataTransfer.setData("taskId", taskId);
//     const element = e.currentTarget as HTMLElement;
//     element.style.opacity = "0.6";
//   };

//   const handleDragEnd = (e: React.DragEvent) => {
//     const element = e.currentTarget as HTMLElement;
//     element.style.opacity = "1";
//   };

//   const handleDragOver = (e: React.DragEvent) => {
//     e.preventDefault();
//     e.dataTransfer.dropEffect = "move";
//   };

//   const handleDrop = async (e: React.DragEvent, status: Task["status"]) => {
//     e.preventDefault();

//     const taskId = e.dataTransfer.getData("taskId");

//     if (taskId) {
//       await updateTaskStatus(taskId, status);
//     }
//   };

//   // Função de atualização de status
//   const updateTaskStatus = async (taskId: string, newStatus: Task["status"]) => {
//     try {
//       const task = tasks.find(t => t.id === taskId);
//       if (!task || task.status === newStatus) return;

//       console.log(`🔄 Atualizando task ${taskId} para status: ${newStatus}`);

//       // Atualização otimista
//       setTasks((prev) =>
//         prev.map((task) =>
//           task.id === taskId ? { ...task, status: newStatus } : task
//         )
//       );

//       const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/status`, {
//         method: "PATCH",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ status: newStatus }),
//       });

//       if (!response.ok) {
//         throw new Error(`Erro ${response.status}: ${response.statusText}`);
//       }

//       console.log("✅ Status atualizado com sucesso");

//     } catch (error) {
//       console.error("❌ Erro ao atualizar task:", error);
//       if (error instanceof Error){
//         setError(`Erro ao mover tarefa: ${error.message}`);
//       }
//       fetchData(); // Recarregar dados para sincronizar
//     }
//   };

//   const deleteTask = async (taskId: string) => {
//     if (!confirm("Tem certeza que deseja apagar esta tarefa?")) return;

//     try {
//       const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
//         method: "DELETE",
//       });

//       if (response.ok) {
//         setTasks((prev) => prev.filter((task) => task.id !== taskId));
//         console.log("✅ Task deletada com sucesso");
//       } else {
//         throw new Error("Erro ao deletar task");
//       }
//     } catch (error) {
//       console.error("Erro ao deletar:", error);
//       setError("Erro ao deletar tarefa");
//     }
//   };

//   // Função para abrir modal de edição
//   const openEditModal = (task: Task) => {
//     setEditingTask(task);
//     setEditTask({
//       title: task.title,
//       description: task.description || "",
//       status: task.status,
//       dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : "",
//       assignedToId: task.assignedToId || "",
//     });
//     setIsEditModalOpen(true);
//   };

//   // Submeter edição
//   const onEditSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!editingTask) return;

//     setIsSubmitting(true);
//     try {
//       if (!editTask.title.trim()) {
//         setError("O título é obrigatório");
//         return;
//       }

//       const updateData: any = {
//         title: editTask.title.trim(),
//         description: editTask.description?.trim() || "",
//         status: editTask.status,
//       };

//       if (editTask.assignedToId) {
//         updateData.assignedToId = editTask.assignedToId;
//       } else {
//         updateData.assignedToId = null;
//       }

//       if (editTask.dueDate) {
//         updateData.dueDate = editTask.dueDate;
//       } else {
//         updateData.dueDate = null;
//       }

//       console.log('📤 Enviando atualização:', updateData);

//       const response = await fetch(`${API_BASE_URL}/tasks/${editingTask.id}`, {
//         method: "PUT",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(updateData),
//       });

//       if (!response.ok) {
//         const errorText = await response.text();
//         throw new Error(errorText || `Erro ${response.status}`);
//       }

//       const updatedTask = await response.json();
//       console.log('✅ Task atualizada:', updatedTask);

//       // Atualizar estado local
//       setTasks((prev) =>
//         prev.map((task) => 
//           task.id === editingTask.id 
//             ? { 
//                 ...task, 
//                 ...updatedTask, 
//                 assignedTo: professionals.find(p => p.id === updatedTask.assignedToId) || task.assignedTo 
//               }
//             : task
//         )
//       );

//       setIsEditModalOpen(false);
//       setEditingTask(null);
//       setError(null);

//     } catch (error) {
//       console.error("❌ Erro ao editar tarefa:", error);
//       if( error instanceof Error){
//         setError(`Erro ao editar tarefa: ${error.message}`);
//       }
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const startRecording = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//       mediaRecorderRef.current = new MediaRecorder(stream);
//       audioChunksRef.current = [];

//       mediaRecorderRef.current.ondataavailable = (event) => {
//         if (event.data.size > 0) {
//           audioChunksRef.current.push(event.data);
//         }
//       };

//       mediaRecorderRef.current.onstop = () => {
//         const audioBlob = new Blob(audioChunksRef.current, {
//           type: "audio/webm",
//         });
//         setAudioBlob(audioBlob);
//         setNewTask((prev) => ({ ...prev, audio: new File([audioBlob], "recording.webm", { type: "audio/webm" }) }));
//       };

//       mediaRecorderRef.current.start();
//       setIsRecording(true);
//     } catch (error) {
//       console.error("Erro ao acessar o microfone:", error);
//       setError(
//         "Não foi possível acessar o microfone. Verifique as permissões."
//       );
//     }
//   };

//   const stopRecording = () => {
//     if (mediaRecorderRef.current) {
//       mediaRecorderRef.current.stop();
//       setIsRecording(false);
//       setRecordingTime(0);
//       mediaRecorderRef.current.stream
//         .getTracks()
//         .forEach((track) => track.stop());
//     }
//   };

//   const createTask = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (isSubmitting) return;

//     setIsSubmitting(true);

//     if (!newTask.title || newTask.title.trim() === "") {
//       setError("Por favor, preencha o título da tarefa");
//       setIsSubmitting(false);
//       return;
//     }

//     try {
//       const formData = new FormData();
//       formData.append("title", newTask.title.trim());
//       formData.append("description", newTask.description?.trim() || "");
//       formData.append("status", newTask.status);

//       if (newTask.dueDate) formData.append("dueDate", newTask.dueDate);
//       if (newTask.assignedToId) formData.append("assignedToId", newTask.assignedToId);

//       // Adicionar arquivos
//       if (newTask.image) {
//         formData.append("files", newTask.image);
//       }
//       if (newTask.audio) {
//         formData.append("files", newTask.audio);
//       }

//       console.log('📤 Criando nova task...');

//       const response = await fetch(`${API_BASE_URL}/tasks`, {
//         method: "POST",
//         body: formData,
//       });

//       if (response.ok) {
//         const createdTask = await response.json();
//         console.log('✅ Task criada:', createdTask);
//         setTasks((prev) => [...prev, createdTask]);
//         setIsCreateModalOpen(false);
//         setNewTask({
//           title: "",
//           description: "",
//           status: "A Fazer",
//           dueDate: "",
//           assignedToId: "",
//           image: null,
//           audio: null,
//         });
//         setAudioBlob(null);
//         setRecordingTime(0);
//         setError(null);
//       } else {
//         const errorText = await response.text();
//         setError("Erro ao criar tarefa: " + errorText);
//       }
//     } catch (error) {
//       console.error("💥 ERRO DE CONEXÃO:", error);
//       setError("Erro de conexão: " + (error as Error).message);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   if (!isClient) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
//           <p className="text-gray-600">Carregando...</p>
//         </div>
//       </div>
//     );
//   }

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
//           <p className="text-gray-600">Carregando dados...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
//       <div className="max-w-7xl mx-auto">
//         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
//           <div>
//             <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
//               Kanban de Tarefas
//             </h1>
//             <p className="text-gray-600 text-sm sm:text-base">
//               {tasks.length} tarefa(s) • {professionals.length} profissional(es)
//             </p>
//           </div>
//           <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
//             <Button
//               onClick={fetchData}
//               variant="outline"
//               className="flex items-center space-x-2"
//             >
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
//               </svg>
//               <span>Atualizar</span>
//             </Button>
//             <Button
//               onClick={() => setIsCreateModalOpen(true)}
//               disabled={professionals.length === 0}
//               className="flex items-center space-x-2"
//             >
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
//               </svg>
//               <span>Nova Tarefa</span>
//             </Button>
//           </div>
//         </div>

//         {error && (
//           <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
//             <div className="flex items-center">
//               <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//               </svg>
//               <span className="text-red-700 text-sm">{error}</span>
//             </div>
//             <Button 
//               onClick={() => setError(null)} 
//               variant="ghost" 
//               size="sm" 
//               className="mt-2 text-red-600 hover:text-red-700"
//             >
//               Fechar
//             </Button>
//           </div>
//         )}

//         {professionals.length === 0 && (
//           <Card className="mb-6 border-yellow-200 bg-yellow-50">
//             <CardContent className="p-4">
//               <div className="flex items-start">
//                 <svg className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
//                 </svg>
//                 <div>
//                   <h3 className="font-semibold text-yellow-800 text-sm">
//                     Nenhum profissional cadastrado
//                   </h3>
//                   <p className="text-yellow-700 text-xs mt-1">
//                     Você precisa cadastrar profissionais antes de criar tarefas.
//                   </p>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         )}

//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
//           {columns.map((column) => (
//             <Card
//               key={column.id}
//               className="border-gray-200 transition-colors duration-200"
//               onDragOver={handleDragOver}
//               onDrop={(e) => handleDrop(e, column.id as Task["status"])}
//             >
//               <div className={`p-4 rounded-t-lg ${column.color} text-white`}>
//                 <div className="flex justify-between items-center">
//                   <h3 className="font-semibold text-sm">{column.title}</h3>
//                   <Badge variant="secondary" className="bg-white bg-opacity-20">
//                     {tasks.filter((task) => task.status === column.id).length}
//                   </Badge>
//                 </div>
//               </div>
//               <CardContent className="p-4 space-y-4 min-h-[500px]">
//                 {tasks
//                   .filter((task) => task.status === column.id)
//                   .map((task) => (
//                     <div
//                       key={task.id}
//                       draggable
//                       onDragStart={(e) => handleDragStart(e, task.id)}
//                       onDragEnd={handleDragEnd}
//                       className="bg-white border border-gray-200 rounded-lg p-4 cursor-grab active:cursor-grabbing hover:shadow-lg transition-all duration-200 hover:border-blue-300 shadow-sm relative select-none"
//                     >
//                       {task.imageUrl && (
//                         <div className="mb-3">
//                           <img
//                             src={task.imageUrl}
//                             alt="Task preview"
//                             className="w-full h-32 object-cover rounded-md"
//                             onError={(e) => {
//                               e.currentTarget.src = "/placeholder-image.png";
//                               e.currentTarget.onerror = null;
//                             }}
//                           />
//                         </div>
//                       )}

//                       <DropdownMenu>
//                         <DropdownMenuTrigger asChild>
//                           <Button
//                             variant="ghost"
//                             size="sm"
//                             className="absolute top-2 right-2 h-8 w-8 p-0"
//                             onClick={(e) => e.stopPropagation()}
//                           >
//                             <span className="sr-only">Abrir menu</span>
//                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
//                             </svg>
//                           </Button>
//                         </DropdownMenuTrigger>
//                         <DropdownMenuContent align="end">
//                           <DropdownMenuItem onClick={() => openEditModal(task)}>
//                             <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
//                             </svg>
//                             Editar
//                           </DropdownMenuItem>
//                           <DropdownMenuItem
//                             onClick={() => deleteTask(task.id)}
//                             className="text-red-600"
//                           >
//                             <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
//                             </svg>
//                             Excluir
//                           </DropdownMenuItem>
//                         </DropdownMenuContent>
//                       </DropdownMenu>

//                       <h4
//                         className="font-semibold text-gray-900 mb-2 line-clamp-2 text-base cursor-pointer"
//                         onClick={() => {
//                           setSelectedTask(task);
//                           setIsModalOpen(true);
//                         }}
//                       >
//                         {task.title}
//                       </h4>

//                       {task.description && (
//                         <p className="text-gray-600 text-sm mb-3 line-clamp-2">
//                           {task.description}
//                         </p>
//                       )}

//                       {task.audioUrl && (
//                         <div className="mb-3">
//                           <audio
//                             controls
//                             src={task.audioUrl}
//                             className="w-full h-10"
//                           >
//                             Seu navegador não suporta o elemento de áudio.
//                           </audio>
//                         </div>
//                       )}

//                       <div className="flex items-center justify-between">
//                         <div className="flex items-center space-x-2">
//                           <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
//                             <span className="text-blue-600 text-xs font-semibold">
//                               {task.assignedTo?.name?.charAt(0) || "?"}
//                             </span>
//                           </div>
//                           <span className="text-sm text-gray-500 truncate max-w-[100px]">
//                             {task.assignedTo?.name || "Não atribuído"}
//                           </span>
//                         </div>

//                         {task.dueDate && (
//                           <div className="flex items-center space-x-2">
//                             <span
//                               className={`text-sm ${
//                                 new Date(task.dueDate) < new Date()
//                                   ? "text-red-600"
//                                   : "text-gray-900"
//                               }`}
//                             >
//                               {new Date(task.dueDate).toLocaleDateString("pt-BR")}
//                             </span>
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   ))}

//                 {tasks.filter((task) => task.status === column.id).length === 0 && (
//                   <div className="text-center text-gray-400 py-8 border-2 border-dashed border-gray-200 rounded-lg">
//                     <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//                     </svg>
//                     <p className="text-sm">Nenhuma tarefa</p>
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           ))}
//         </div>
//       </div>

//       {/* Modal de Visualização */}
//       <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
//         <DialogContent className="max-w-md">
//           <DialogHeader>
//             <DialogTitle>{selectedTask?.title}</DialogTitle>
//           </DialogHeader>
//           {selectedTask && (
//             <div className="space-y-4">
//               {selectedTask.imageUrl && (
//                 <img
//                   src={selectedTask.imageUrl}
//                   alt="Task preview"
//                   className="w-full h-48 object-cover rounded-md"
//                 />
//               )}
//               {selectedTask.description && (
//                 <p className="text-gray-600">{selectedTask.description}</p>
//               )}
//               {selectedTask.audioUrl && (
//                 <audio controls className="w-full" src={selectedTask.audioUrl}>
//                   Seu navegador não suporta o elemento de áudio.
//                 </audio>
//               )}
//               <div className="space-y-2 text-sm">
//                 <div className="flex justify-between">
//                   <span className="font-medium">Responsável:</span>
//                   <span>{selectedTask.assignedTo?.name || "Não atribuído"}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="font-medium">Status:</span>
//                   <Badge variant="secondary">{selectedTask.status}</Badge>
//                 </div>
//                 {selectedTask.dueDate && (
//                   <div className="flex justify-between">
//                     <span className="font-medium">Prazo:</span>
//                     <span className={new Date(selectedTask.dueDate) < new Date() ? "text-red-600" : ""}>
//                       {new Date(selectedTask.dueDate).toLocaleString("pt-BR")}
//                     </span>
//                   </div>
//                 )}
//               </div>
//             </div>
//           )}
//         </DialogContent>
//       </Dialog>

//       {/* Modal de Edição */}
//       <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
//         <DialogContent className="max-w-lg">
//           <DialogHeader>
//             <DialogTitle>Editar Tarefa</DialogTitle>
//           </DialogHeader>
//           <form onSubmit={onEditSubmit} className="space-y-4">
//             <div>
//               <Label htmlFor="edit-title">Título *</Label>
//               <Input
//                 id="edit-title"
//                 value={editTask.title}
//                 onChange={(e) => setEditTask((prev) => ({ ...prev, title: e.target.value }))}
//                 placeholder="Digite o título da tarefa"
//                 required
//               />
//             </div>

//             <div>
//               <Label htmlFor="edit-description">Descrição</Label>
//               <Textarea
//                 id="edit-description"
//                 value={editTask.description}
//                 onChange={(e) => setEditTask((prev) => ({ ...prev, description: e.target.value }))}
//                 placeholder="Descreva a tarefa em detalhes..."
//                 rows={4}
//               />
//             </div>

//             <div>
//               <Label htmlFor="edit-assigned">Responsável</Label>
//               <Select
//                 value={editTask.assignedToId}
//                 onValueChange={(value) => setEditTask((prev) => ({ ...prev, assignedToId: value }))}
//               >
//                 <SelectTrigger>
//                   <SelectValue placeholder="Selecione um profissional" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {professionals.map((professional) => (
//                     <SelectItem key={professional.id} value={professional.id}>
//                       {professional.name} - {professional.role}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>

//             <div>
//               <Label htmlFor="edit-status">Status</Label>
//               <Select
//                 value={editTask.status}
//                 onValueChange={(value) => setEditTask((prev) => ({ ...prev, status: value as Task["status"] }))}
//               >
//                 <SelectTrigger>
//                   <SelectValue />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {columns.map((column) => (
//                     <SelectItem key={column.id} value={column.id}>
//                       {column.title}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>

//             <div>
//               <Label htmlFor="edit-dueDate">Prazo</Label>
//               <Input
//                 id="edit-dueDate"
//                 type="datetime-local"
//                 value={editTask.dueDate}
//                 onChange={(e) => setEditTask((prev) => ({ ...prev, dueDate: e.target.value }))}
//               />
//             </div>

//             <div className="flex space-x-4 pt-4">
//               <Button
//                 type="button"
//                 variant="outline"
//                 onClick={() => setIsEditModalOpen(false)}
//                 className="flex-1"
//               >
//                 Cancelar
//               </Button>
//               <Button type="submit" disabled={isSubmitting} className="flex-1">
//                 {isSubmitting ? "Salvando..." : "Salvar Alterações"}
//               </Button>
//             </div>
//           </form>
//         </DialogContent>
//       </Dialog>

//       {/* Modal de Criação */}
//       <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
//         <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
//           <DialogHeader>
//             <DialogTitle>Criar Nova Tarefa</DialogTitle>
//           </DialogHeader>
//           <form onSubmit={createTask} className="space-y-4">
//             <div>
//               <Label htmlFor="title">Título *</Label>
//               <Input
//                 id="title"
//                 value={newTask.title}
//                 onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
//                 placeholder="Digite o título da tarefa"
//                 required
//               />
//             </div>

//             <div>
//               <Label htmlFor="description">Descrição</Label>
//               <Textarea
//                 id="description"
//                 value={newTask.description}
//                 onChange={(e) => setNewTask((prev) => ({ ...prev, description: e.target.value }))}
//                 placeholder="Descreva a tarefa em detalhes..."
//                 rows={4}
//               />
//             </div>

//             <div>
//               <Label htmlFor="image">Imagem</Label>
//               <Input
//                 id="image"
//                 type="file"
//                 accept="image/*"
//                 onChange={(e) => setNewTask((prev) => ({ ...prev, image: e.target.files?.[0] || null }))}
//               />
//             </div>

//             <div>
//               <Label>Gravação de Áudio</Label>
//               <div className="flex items-center space-x-3 mb-2">
//                 <Button
//                   type="button"
//                   onClick={isRecording ? stopRecording : startRecording}
//                   variant={isRecording ? "destructive" : "default"}
//                 >
//                   {isRecording ? "Parar Gravação" : "Iniciar Gravação"}
//                 </Button>
//                 <span className="text-sm text-gray-600">
//                   {Math.floor(recordingTime / 60)}:
//                   {(recordingTime % 60).toString().padStart(2, "0")}
//                 </span>
//               </div>
//               {audioBlob && (
//                 <div className="mt-2">
//                   <audio controls className="w-full h-10">
//                     <source src={URL.createObjectURL(audioBlob)} type="audio/webm" />
//                     Seu navegador não suporta o elemento de áudio.
//                   </audio>
//                 </div>
//               )}
//             </div>

//             <div>
//               <Label htmlFor="assignedTo">Responsável</Label>
//               <Select
//                 value={newTask.assignedToId}
//                 onValueChange={(value) => setNewTask((prev) => ({ ...prev, assignedToId: value }))}
//               >
//                 <SelectTrigger>
//                   <SelectValue placeholder="Selecione um profissional" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {professionals.map((professional) => (
//                     <SelectItem key={professional.id} value={professional.id}>
//                       {professional.name} - {professional.role}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>

//             <div>
//               <Label htmlFor="status">Status</Label>
//               <Select
//                 value={newTask.status}
//                 onValueChange={(value) => setNewTask((prev) => ({ ...prev, status: value as Task["status"] }))}
//               >
//                 <SelectTrigger>
//                   <SelectValue />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {columns.map((column) => (
//                     <SelectItem key={column.id} value={column.id}>
//                       {column.title}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>

//             <div>
//               <Label htmlFor="dueDate">Prazo</Label>
//               <Input
//                 id="dueDate"
//                 type="datetime-local"
//                 value={newTask.dueDate}
//                 onChange={(e) => setNewTask((prev) => ({ ...prev, dueDate: e.target.value }))}
//               />
//             </div>

//             <div className="flex space-x-4 pt-4">
//               <Button
//                 type="button"
//                 variant="outline"
//                 onClick={() => {
//                   setIsCreateModalOpen(false);
//                   setAudioBlob(null);
//                   setRecordingTime(0);
//                   if (mediaRecorderRef.current) {
//                     mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
//                   }
//                 }}
//                 className="flex-1"
//               >
//                 Cancelar
//               </Button>
//               <Button
//                 type="submit"
//                 disabled={!newTask.title || isSubmitting}
//                 className="flex-1"
//               >
//                 {isSubmitting ? "Criando..." : "Criar Tarefa"}
//               </Button>
//             </div>
//           </form>
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// };

// export default ProfessionalKanban;

// VERSAO NOVA
// "use client";
// import { useState, useEffect, useRef } from "react";
// import { Button } from "@/components/ui/button";
// import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
// import { Badge } from "@/components/ui/badge";
// import { Card, CardContent } from "@/components/ui/card";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
// } from "@/components/ui/dialog";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { 
//   Plus, 
//   Filter, 
//   MoreVertical, 
//   Settings, 
//   Trash2, 
//   Edit,
//   Calendar,
//   User,
//   Mic,
//   Square,
//   Upload,
//   Clock
// } from "lucide-react";

// const API_BASE = "http://localhost:3002";

// interface Professional {
//   id: string;
//   name: string;
// }

// interface Task {
//   id: string;
//   title: string;
//   code?: string;
//   imageUrl?: string;
//   audioUrl?: string;
//   fichaTecnica?: boolean;
//   assignedTo?: Professional;
//   statusId?: string | null;
//   description?: string;
//   dueDate?: string;
// }

// interface Column {
//   id: string;
//   title: string;
// }

// export default function ProductKanban() {
//   const [tasks, setTasks] = useState<Task[]>([]);
//   const [columns, setColumns] = useState<Column[]>([]);
//   const [professionals, setProfessionals] = useState<Professional[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [isColumnModal, setIsColumnModal] = useState(false);
//   const [isTaskModal, setIsTaskModal] = useState(false);
//   const [editingCol, setEditingCol] = useState<Column | null>(null);
//   const [colTitle, setColTitle] = useState("");

//   // Estados para o formulário de tarefa
//   const [taskTitle, setTaskTitle] = useState("");
//   const [taskDescription, setTaskDescription] = useState("");
//   const [taskDueDate, setTaskDueDate] = useState("");
//   const [taskAssignedTo, setTaskAssignedTo] = useState("");
//   const [taskStatus, setTaskStatus] = useState("");
//   const [taskImage, setTaskImage] = useState<File | null>(null);
//   const [taskAudio, setTaskAudio] = useState<File | null>(null);
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   // Estados para gravação de áudio
//   const [isRecording, setIsRecording] = useState(false);
//   const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
//   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
//   const audioChunksRef = useRef<Blob[]>([]);
//   const [recordingTime, setRecordingTime] = useState(0);

//   const fetchColumns = async () => {
//     try {
//       const res = await fetch(`${API_BASE}/kanban-columns`);
//       const data = await res.json();
//       setColumns(data);
//     } catch (error) {
//       console.error('Erro ao buscar colunas:', error);
//     }
//   };

//   const fetchTasks = async () => {
//     try {
//       const res = await fetch(`${API_BASE}/tasks`);
//       const data = await res.json();
//       if (Array.isArray(data)) setTasks(data);
//       else if (data.tasks) setTasks(data.tasks);
//     } catch (error) {
//       console.error('Erro ao buscar tasks:', error);
//     }
//   };

//   const fetchProfessionals = async () => {
//     try {
//       const res = await fetch(`${API_BASE}/professionals`);
//       const data = await res.json();
//       setProfessionals(data);
//     } catch (error) {
//       console.error('Erro ao buscar profissionais:', error);
//     }
//   };

//   const loadInitialData = async () => {
//     setLoading(true);
//     try {
//       await Promise.all([fetchColumns(), fetchTasks(), fetchProfessionals()]);
//     } catch (error) {
//       console.error('Erro ao carregar dados:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadInitialData();
//   }, []);

//   // Temporizador para gravação
//   useEffect(() => {
//     let interval: NodeJS.Timeout | null = null;
//     if (isRecording) {
//       interval = setInterval(() => {
//         setRecordingTime((prev) => prev + 1);
//       }, 1000);
//     }
//     return () => {
//       if (interval) clearInterval(interval);
//     };
//   }, [isRecording]);

//   const handleDrop = async (e: React.DragEvent, statusId: string | null) => {
//     e.preventDefault();
//     const taskId = e.dataTransfer.getData("taskId");
//     if (!taskId) return;

//     const previousTasks = [...tasks];
//     setTasks(prev => prev.map(t => 
//       t.id === taskId ? { ...t, statusId } : t
//     ));

//     try {
//       await fetch(`${API_BASE}/tasks/${taskId}/status`, {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ status: statusId }),
//       });
//     } catch (error) {
//       console.error('Erro ao atualizar status:', error);
//       setTasks(previousTasks);
//     }
//   };

//   const saveColumn = async () => {
//     if (!colTitle.trim()) return;

//     try {
//       if (editingCol) {
//         await fetch(`${API_BASE}/kanban-columns/${editingCol.id}`, {
//           method: "PATCH",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ title: colTitle }),
//         });
//       } else {
//         await fetch(`${API_BASE}/kanban-columns`, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ title: colTitle }),
//         });
//       }

//       setIsColumnModal(false);
//       setColTitle("");
//       setEditingCol(null);
//       await fetchColumns();
//     } catch (error) {
//       console.error('Erro ao salvar coluna:', error);
//     }
//   };

//   // Funções de gravação de áudio
//   const startRecording = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//       mediaRecorderRef.current = new MediaRecorder(stream);
//       audioChunksRef.current = [];

//       mediaRecorderRef.current.ondataavailable = (event) => {
//         if (event.data.size > 0) {
//           audioChunksRef.current.push(event.data);
//         }
//       };

//       mediaRecorderRef.current.onstop = () => {
//         const audioBlob = new Blob(audioChunksRef.current, {
//           type: "audio/webm",
//         });
//         setAudioBlob(audioBlob);
//         setTaskAudio(new File([audioBlob], "recording.webm", { type: "audio/webm" }));
//       };

//       mediaRecorderRef.current.start();
//       setIsRecording(true);
//     } catch (error) {
//       console.error("Erro ao acessar o microfone:", error);
//       alert("Não foi possível acessar o microfone. Verifique as permissões.");
//     }
//   };

//   const stopRecording = () => {
//     if (mediaRecorderRef.current) {
//       mediaRecorderRef.current.stop();
//       setIsRecording(false);
//       setRecordingTime(0);
//       mediaRecorderRef.current.stream
//         .getTracks()
//         .forEach((track) => track.stop());
//     }
//   };

//   const createTask = async () => {
//     if (!taskTitle.trim()) {
//       alert("Título da tarefa é obrigatório");
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       const formData = new FormData();
//       formData.append("title", taskTitle);
//       formData.append("description", taskDescription);
//       formData.append("statusId", taskStatus || "");

//       if (taskDueDate) formData.append("dueDate", taskDueDate);
//       if (taskAssignedTo) formData.append("assignedToId", taskAssignedTo);

//       // Adicionar arquivos
//       if (taskImage) {
//         formData.append("files", taskImage);
//       }
//       if (taskAudio) {
//         formData.append("files", taskAudio);
//       }

//       console.log('📤 Criando nova task com arquivos...');

//       const response = await fetch(`${API_BASE}/tasks`, {
//         method: "POST",
//         body: formData,
//       });

//       if (!response.ok) {
//         throw new Error("Erro ao criar tarefa");
//       }

//       const newTask = await response.json();

//       // Atualizar a lista de tasks
//       setTasks(prev => [newTask, ...prev]);

//       // Resetar o formulário
//       resetTaskForm();
//       setIsTaskModal(false);

//       console.log("✅ Tarefa criada com sucesso:", newTask);
//     } catch (error) {
//       console.error("Erro ao criar tarefa:", error);
//       alert("Erro ao criar tarefa. Tente novamente.");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const resetTaskForm = () => {
//     setTaskTitle("");
//     setTaskDescription("");
//     setTaskDueDate("");
//     setTaskAssignedTo("");
//     setTaskStatus("");
//     setTaskImage(null);
//     setTaskAudio(null);
//     setAudioBlob(null);
//     setRecordingTime(0);
//     if (mediaRecorderRef.current) {
//       mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
//     }
//   };

//   const deleteColumn = async (id: string) => {
//     if (!confirm("Excluir coluna? Todas as tasks serão movidas para 'Sem etapa'.")) return;
//     try {
//       await fetch(`${API_BASE}/kanban-columns/${id}`, { method: "DELETE" });
//       await Promise.all([fetchColumns(), fetchTasks()]);
//     } catch (error) {
//       console.error('Erro ao excluir coluna:', error);
//     }
//   };

//   // Função para formatar a data com hora
//   const formatDateTime = (dateString: string) => {
//     if (!dateString) return "";

//     try {
//       const date = new Date(dateString);
//       return date.toLocaleString('pt-BR', {
//         day: '2-digit',
//         month: '2-digit',
//         year: 'numeric',
//         hour: '2-digit',
//         minute: '2-digit'
//       });
//     } catch (error) {
//       return dateString;
//     }
//   };

//   // Função para verificar se a data está atrasada
//   const isOverdue = (dateString: string) => {
//     if (!dateString) return false;
//     try {
//       const dueDate = new Date(dateString);
//       const today = new Date();
//       return dueDate < today;
//     } catch (error) {
//       return false;
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex h-screen items-center justify-center">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600"></div>
//       </div>
//     );
//   }

//   const semEtapaCount = tasks.filter(t => !t.statusId).length;

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* HEADER ROXO */}
//       <div className="bg-purple-600 text-white px-6 py-4 flex justify-between items-center shadow-lg">
//         <div className="flex items-center gap-4">
//           <h1 className="text-2xl font-bold">KANBAN DE DESENVOLVIMENTO DE PRODUTOS MARCA</h1>
//           <Badge className="bg-white/20">Sem etapa {semEtapaCount}</Badge>
//         </div>
//         <div className="flex gap-3">
//           <Button 
//             onClick={() => { 
//               setEditingCol(null); 
//               setColTitle(""); 
//               setIsColumnModal(true); 
//             }} 
//             variant="secondary" 
//             className="bg-white/20 hover:bg-white/30"
//           >
//             <Settings className="w-4 h-4 mr-2" /> Gerenciar Colunas
//           </Button>

//           {/* BOTÃO NOVO - CRIAR TAREFA */}
//           <Button 
//             onClick={() => setIsTaskModal(true)}
//             variant="secondary" 
//             className="bg-green-600 hover:bg-green-700 text-white"
//           >
//             <Plus className="w-4 h-4 mr-2" /> Nova Tarefa
//           </Button>

//           <Button variant="secondary" className="bg-white/20 hover:bg-white/30">
//             <Filter className="w-4 h-4 mr-2" /> FILTRAR
//           </Button>
//         </div>
//       </div>

//       {/* SCROLL HORIZONTAL */}
//       <ScrollArea className="w-full">
//         <div className="flex gap-6 p-6 min-w-max">
//           {columns.map(col => (
//             <div 
//               key={col.id} 
//               className="w-80 flex-shrink-0"
//               onDragOver={e => e.preventDefault()}
//               onDrop={e => handleDrop(e, col.id)}
//             >
//               <div className="bg-gray-200 rounded-t-lg px-4 py-3 flex justify-between items-center">
//                 <h3 className="font-semibold">{col.title}</h3>
//                 <div className="flex items-center gap-2">
//                   <Badge className="bg-gray-300 text-gray-700">
//                     {tasks.filter(t => t.statusId === col.id).length}
//                   </Badge>
//                   <DropdownMenu>
//                     <DropdownMenuTrigger asChild>
//                       <Button variant="ghost" size="icon" className="h-6 w-6">
//                         <MoreVertical className="w-4 h-4" />
//                       </Button>
//                     </DropdownMenuTrigger>
//                     <DropdownMenuContent>
//                       <DropdownMenuItem 
//                         onClick={() => { 
//                           setEditingCol(col); 
//                           setColTitle(col.title); 
//                           setIsColumnModal(true); 
//                         }}
//                       >
//                         <Edit className="w-4 h-4 mr-2" /> Renomear
//                       </DropdownMenuItem>
//                       <DropdownMenuItem 
//                         className="text-red-600" 
//                         onClick={() => deleteColumn(col.id)}
//                       >
//                         <Trash2 className="w-4 h-4 mr-2" /> Excluir
//                       </DropdownMenuItem>
//                     </DropdownMenuContent>
//                   </DropdownMenu>
//                 </div>
//               </div>

//               <div className="bg-gray-100 rounded-b-lg p-4 space-y-4 min-h-[600px]">
//                 {tasks
//                   .filter(t => t.statusId === col.id)
//                   .map(task => (
//                     <Card 
//                       key={task.id} 
//                       draggable 
//                       onDragStart={e => e.dataTransfer.setData("taskId", task.id)}
//                       className="bg-white shadow-md hover:shadow-xl cursor-grab active:cursor-grabbing transition-shadow"
//                     >
//                       <CardContent className="p-3">
//                         {task.imageUrl ? (
//                           <img 
//                             src={task.imageUrl} 
//                             alt={task.title}
//                             className="w-full h-48 object-cover rounded-md mb-3" 
//                           />
//                         ) : (
//                           <div className="bg-gray-200 border-2 border-dashed h-48 rounded-md mb-3 flex items-center justify-center text-gray-400">
//                             Sem imagem
//                           </div>
//                         )}

//                         <div className="flex justify-between items-start mb-2">
//                           <h4 className="font-semibold text-lg flex-1 mr-2">{task.title}</h4>
//                           <span className="text-sm text-gray-500 shrink-0">#{task.code || '0000'}</span>
//                         </div>

//                         {task.description && (
//                           <p className="text-sm text-gray-600 mb-3 line-clamp-2">
//                             {task.description}
//                           </p>
//                         )}

//                         {/* DATA E HORA DE VENCIMENTO */}
//                         {task.dueDate && (
//                           <div className="mb-3">
//                             <div className="flex items-center space-x-1 text-sm">
//                               <Clock className="w-3 h-3 text-gray-500" />
//                               <span className={`font-medium ${
//                                 isOverdue(task.dueDate) ? 'text-red-600' : 'text-gray-700'
//                               }`}>
//                                 {formatDateTime(task.dueDate)}
//                               </span>
//                               {isOverdue(task.dueDate) && (
//                                 <Badge variant="destructive" className="ml-2 text-xs">
//                                   Atrasado
//                                 </Badge>
//                               )}
//                             </div>
//                           </div>
//                         )}

//                         {task.audioUrl && (
//                           <div className="mb-3">
//                             <audio
//                               controls
//                               src={task.audioUrl}
//                               className="w-full h-8"
//                             >
//                               Seu navegador não suporta o elemento de áudio.
//                             </audio>
//                           </div>
//                         )}

//                         <div className="flex justify-between items-center">
//                           <Badge variant={task.fichaTecnica ? "default" : "secondary"}>
//                             Ficha Técnica
//                           </Badge>
//                           {task.assignedTo && (
//                             <div 
//                               className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center text-xs font-bold"
//                               title={task.assignedTo.name}
//                             >
//                               {task.assignedTo.name[0].toUpperCase()}
//                             </div>
//                           )}
//                         </div>
//                       </CardContent>
//                     </Card>
//                   ))}
//               </div>
//             </div>
//           ))}

//           {/* COLUNA SEM ETAPA */}
//           <div 
//             className="w-80 flex-shrink-0"
//             onDragOver={e => e.preventDefault()}
//             onDrop={e => handleDrop(e, null)}
//           >
//             <div className="bg-gray-200 rounded-t-lg px-4 py-3">
//               <h3 className="font-semibold">Sem etapa</h3>
//             </div>
//             <div className="bg-gray-100 rounded-b-lg p-4 space-y-4 min-h-[600px]">
//               {tasks
//                 .filter(t => !t.statusId)
//                 .map(task => (
//                   <Card 
//                     key={task.id} 
//                     draggable 
//                     onDragStart={e => e.dataTransfer.setData("taskId", task.id)} 
//                     className="bg-white shadow-md hover:shadow-xl cursor-grab active:cursor-grabbing transition-shadow"
//                   >
//                     <CardContent className="p-3">
//                       {task.imageUrl ? (
//                         <img 
//                           src={task.imageUrl} 
//                           alt={task.title}
//                           className="w-full h-48 object-cover rounded-md mb-3" 
//                         />
//                       ) : (
//                         <div className="bg-gray-200 border-2 border-dashed h-48 rounded-md mb-3 flex items-center justify-center text-gray-400">
//                           Sem imagem
//                         </div>
//                       )}

//                       <div className="flex justify-between items-start mb-2">
//                         <h4 className="font-semibold text-lg flex-1 mr-2">{task.title}</h4>
//                         <span className="text-sm text-gray-500 shrink-0">#{task.code || '0000'}</span>
//                       </div>

//                       {task.description && (
//                         <p className="text-sm text-gray-600 mb-3 line-clamp-2">
//                           {task.description}
//                         </p>
//                       )}

//                       {/* DATA E HORA DE VENCIMENTO */}
//                       {task.dueDate && (
//                         <div className="mb-3">
//                           <div className="flex items-center space-x-1 text-sm">
//                             <Clock className="w-3 h-3 text-gray-500" />
//                             <span className={`font-medium ${
//                               isOverdue(task.dueDate) ? 'text-red-600' : 'text-gray-700'
//                             }`}>
//                               {formatDateTime(task.dueDate)}
//                             </span>
//                             {isOverdue(task.dueDate) && (
//                               <Badge variant="destructive" className="ml-2 text-xs">
//                                 Atrasado
//                               </Badge>
//                             )}
//                           </div>
//                         </div>
//                       )}

//                       {task.audioUrl && (
//                         <div className="mb-3">
//                           <audio
//                             controls
//                             src={task.audioUrl}
//                             className="w-full h-8"
//                           >
//                             Seu navegador não suporta o elemento de áudio.
//                           </audio>
//                         </div>
//                       )}

//                       <div className="flex justify-between items-center">
//                         <Badge variant={task.fichaTecnica ? "default" : "secondary"}>
//                           Ficha Técnica
//                         </Badge>
//                         {task.assignedTo && (
//                           <div 
//                             className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center text-xs font-bold"
//                             title={task.assignedTo.name}
//                           >
//                             {task.assignedTo.name[0].toUpperCase()}
//                           </div>
//                         )}
//                       </div>
//                     </CardContent>
//                   </Card>
//                 ))}
//             </div>
//           </div>
//         </div>
//         <ScrollBar orientation="horizontal" />
//       </ScrollArea>

//       {/* MODAL CRIAR COLUNA */}
//       <Dialog open={isColumnModal} onOpenChange={setIsColumnModal}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>{editingCol ? "Editar" : "Nova"} Coluna</DialogTitle>
//           </DialogHeader>
//           <div className="space-y-4">
//             <div>
//               <Label htmlFor="column-title">Título</Label>
//               <Input 
//                 id="column-title"
//                 value={colTitle} 
//                 onChange={e => setColTitle(e.target.value)}
//                 placeholder="Digite o título da coluna"
//                 onKeyDown={(e) => {
//                   if (e.key === 'Enter') saveColumn();
//                 }}
//               />
//             </div>
//             <div className="flex gap-2 justify-end">
//               <Button 
//                 variant="outline" 
//                 onClick={() => setIsColumnModal(false)}
//               >
//                 Cancelar
//               </Button>
//               <Button onClick={saveColumn}>
//                 {editingCol ? "Atualizar" : "Criar"} Coluna
//               </Button>
//             </div>
//           </div>
//         </DialogContent>
//       </Dialog>

//       {/* MODAL CRIAR TAREFA COM UPLOAD */}
//       <Dialog open={isTaskModal} onOpenChange={setIsTaskModal}>
//         <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
//           <DialogHeader>
//             <DialogTitle>Criar Nova Tarefa</DialogTitle>
//             <DialogDescription>
//               Preencha os detalhes da nova tarefa
//             </DialogDescription>
//           </DialogHeader>
//           <div className="space-y-4">
//             <div>
//               <Label htmlFor="task-title">Título *</Label>
//               <Input 
//                 id="task-title"
//                 value={taskTitle} 
//                 onChange={e => setTaskTitle(e.target.value)}
//                 placeholder="Digite o título da tarefa"
//               />
//             </div>

//             <div>
//               <Label htmlFor="task-description">Descrição</Label>
//               <Textarea 
//                 id="task-description"
//                 value={taskDescription} 
//                 onChange={e => setTaskDescription(e.target.value)}
//                 placeholder="Descreva a tarefa..."
//                 rows={3}
//               />
//             </div>

//             {/* UPLOAD DE IMAGEM */}
//             <div>
//               <Label htmlFor="task-image">
//                 <Upload className="w-4 h-4 inline mr-2" />
//                 Imagem
//               </Label>
//               <Input 
//                 id="task-image"
//                 type="file"
//                 accept="image/*"
//                 onChange={(e) => setTaskImage(e.target.files?.[0] || null)}
//                 className="mt-1"
//               />
//               {taskImage && (
//                 <p className="text-sm text-green-600 mt-1">
//                   ✓ {taskImage.name}
//                 </p>
//               )}
//             </div>

//             {/* GRAVAÇÃO DE ÁUDIO */}
//             <div>
//               <Label>
//                 <Mic className="w-4 h-4 inline mr-2" />
//                 Gravação de Áudio
//               </Label>
//               <div className="flex items-center space-x-3 mt-2">
//                 <Button
//                   type="button"
//                   onClick={isRecording ? stopRecording : startRecording}
//                   variant={isRecording ? "destructive" : "outline"}
//                   size="sm"
//                 >
//                   {isRecording ? <Square className="w-4 h-4 mr-1" /> : <Mic className="w-4 h-4 mr-1" />}
//                   {isRecording ? "Parar" : "Gravar"}
//                 </Button>

//                 {isRecording && (
//                   <div className="flex items-center space-x-2">
//                     <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
//                     <span className="text-sm text-gray-600 font-mono">
//                       {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")}
//                     </span>
//                   </div>
//                 )}
//               </div>

//               {audioBlob && (
//                 <div className="mt-3">
//                   <audio 
//                     controls 
//                     className="w-full h-8"
//                     src={URL.createObjectURL(audioBlob)}
//                   >
//                     Seu navegador não suporta o elemento de áudio.
//                   </audio>
//                 </div>
//               )}

//               {/* UPLOAD DE ÁUDIO (alternativo) */}
//               <div className="mt-3">
//                 <Label htmlFor="task-audio">Ou faça upload de um arquivo de áudio</Label>
//                 <Input 
//                   id="task-audio"
//                   type="file"
//                   accept="audio/*"
//                   onChange={(e) => setTaskAudio(e.target.files?.[0] || null)}
//                   className="mt-1"
//                 />
//                 {taskAudio && !audioBlob && (
//                   <p className="text-sm text-green-600 mt-1">
//                     ✓ {taskAudio.name}
//                   </p>
//                 )}
//               </div>
//             </div>

//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <Label htmlFor="task-dueDate">
//                   <Calendar className="w-4 h-4 inline mr-2" />
//                   Data e Hora de Vencimento
//                 </Label>
//                 <Input 
//                   id="task-dueDate"
//                   type="datetime-local"
//                   value={taskDueDate} 
//                   onChange={e => setTaskDueDate(e.target.value)}
//                 />
//               </div>

//               <div>
//                 <Label htmlFor="task-assignedTo">
//                   <User className="w-4 h-4 inline mr-2" />
//                   Responsável
//                 </Label>
//                 <select
//                   id="task-assignedTo"
//                   value={taskAssignedTo}
//                   onChange={e => setTaskAssignedTo(e.target.value)}
//                   className="w-full p-2 border border-gray-300 rounded-md"
//                 >
//                   <option value="">Selecione um responsável</option>
//                   {professionals.map(professional => (
//                     <option key={professional.id} value={professional.id}>
//                       {professional.name}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//             </div>

//             <div>
//               <Label htmlFor="task-status">Coluna</Label>
//               <select
//                 id="task-status"
//                 value={taskStatus}
//                 onChange={e => setTaskStatus(e.target.value)}
//                 className="w-full p-2 border border-gray-300 rounded-md"
//               >
//                 <option value="">Sem etapa</option>
//                 {columns.map(column => (
//                   <option key={column.id} value={column.id}>
//                     {column.title}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <div className="flex gap-2 justify-end pt-4">
//               <Button 
//                 variant="outline" 
//                 onClick={() => {
//                   setIsTaskModal(false);
//                   resetTaskForm();
//                 }}
//                 disabled={isSubmitting}
//               >
//                 Cancelar
//               </Button>
//               <Button 
//                 onClick={createTask}
//                 disabled={!taskTitle.trim() || isSubmitting}
//               >
//                 {isSubmitting ? (
//                   <>
//                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
//                     Criando...
//                   </>
//                 ) : (
//                   <>
//                     <Plus className="w-4 h-4 mr-2" /> Criar Tarefa
//                   </>
//                 )}
//               </Button>
//             </div>
//           </div>
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// }

// VERSAO NOVA  2 FUNCIOANDO
// "use client";
// import { useState, useEffect, useRef } from "react";
// import { Button } from "@/components/ui/button";
// import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
// import { Badge } from "@/components/ui/badge";
// import { Card, CardContent } from "@/components/ui/card";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
// } from "@/components/ui/dialog";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { 
//   Plus, 
//   Filter, 
//   MoreVertical, 
//   Settings, 
//   Trash2, 
//   Edit,
//   Calendar,
//   User,
//   Mic,
//   Square,
//   Upload,
//   Clock,
//   X
// } from "lucide-react";

// const API_BASE = "http://localhost:3002";

// interface Professional {
//   id: string;
//   name: string;
// }

// interface Task {
//   id: string;
//   title: string;
//   code?: string;
//   imageUrl?: string;
//   audioUrl?: string;
//   fichaTecnica?: boolean;
//   assignedTo?: Professional;
//   statusId?: string | null;
//   description?: string;
//   dueDate?: string;
// }

// interface Column {
//   id: string;
//   title: string;
// }

// export default function ProductKanban() {
//   const [tasks, setTasks] = useState<Task[]>([]);
//   const [columns, setColumns] = useState<Column[]>([]);
//   const [professionals, setProfessionals] = useState<Professional[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [isColumnModal, setIsColumnModal] = useState(false);
//   const [isTaskModal, setIsTaskModal] = useState(false);
//   const [isEditTaskModal, setIsEditTaskModal] = useState(false);
//   const [editingCol, setEditingCol] = useState<Column | null>(null);
//   const [editingTask, setEditingTask] = useState<Task | null>(null);
//   const [colTitle, setColTitle] = useState("");

//   // Estados para o formulário de tarefa
//   const [taskTitle, setTaskTitle] = useState("");
//   const [taskDescription, setTaskDescription] = useState("");
//   const [taskDueDate, setTaskDueDate] = useState("");
//   const [taskAssignedTo, setTaskAssignedTo] = useState("");
//   const [taskStatus, setTaskStatus] = useState("");
//   const [taskImage, setTaskImage] = useState<File | null>(null);
//   const [taskAudio, setTaskAudio] = useState<File | null>(null);
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   // Estados para edição de tarefa
//   const [editTaskTitle, setEditTaskTitle] = useState("");
//   const [editTaskDescription, setEditTaskDescription] = useState("");
//   const [editTaskDueDate, setEditTaskDueDate] = useState("");
//   const [editTaskAssignedTo, setEditTaskAssignedTo] = useState("");
//   const [editTaskStatus, setEditTaskStatus] = useState("");
//   const [editTaskImage, setEditTaskImage] = useState<File | null>(null);
//   const [editTaskAudio, setEditTaskAudio] = useState<File | null>(null);

//   // Estados para gravação de áudio
//   const [isRecording, setIsRecording] = useState(false);
//   const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
//   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
//   const audioChunksRef = useRef<Blob[]>([]);
//   const [recordingTime, setRecordingTime] = useState(0);

//   const fetchColumns = async () => {
//     try {
//       const res = await fetch(`${API_BASE}/kanban-columns`);
//       const data = await res.json();
//       setColumns(data);
//     } catch (error) {
//       console.error('Erro ao buscar colunas:', error);
//     }
//   };

//   const fetchTasks = async () => {
//     try {
//       const res = await fetch(`${API_BASE}/tasks`);
//       const data = await res.json();
//       if (Array.isArray(data)) setTasks(data);
//       else if (data.tasks) setTasks(data.tasks);
//     } catch (error) {
//       console.error('Erro ao buscar tasks:', error);
//     }
//   };

//   const fetchProfessionals = async () => {
//     try {
//       const res = await fetch(`${API_BASE}/professionals`);
//       const data = await res.json();
//       setProfessionals(data);
//     } catch (error) {
//       console.error('Erro ao buscar profissionais:', error);
//     }
//   };

//   const loadInitialData = async () => {
//     setLoading(true);
//     try {
//       await Promise.all([fetchColumns(), fetchTasks(), fetchProfessionals()]);
//     } catch (error) {
//       console.error('Erro ao carregar dados:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadInitialData();
//   }, []);

//   // Temporizador para gravação
//   useEffect(() => {
//     let interval: NodeJS.Timeout | null = null;
//     if (isRecording) {
//       interval = setInterval(() => {
//         setRecordingTime((prev) => prev + 1);
//       }, 1000);
//     }
//     return () => {
//       if (interval) clearInterval(interval);
//     };
//   }, [isRecording]);

//   const handleDrop = async (e: React.DragEvent, statusId: string | null) => {
//     e.preventDefault();
//     const taskId = e.dataTransfer.getData("taskId");
//     if (!taskId) return;

//     const previousTasks = [...tasks];
//     setTasks(prev => prev.map(t => 
//       t.id === taskId ? { ...t, statusId } : t
//     ));

//     try {
//       await fetch(`${API_BASE}/tasks/${taskId}/status`, {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ status: statusId }),
//       });
//     } catch (error) {
//       console.error('Erro ao atualizar status:', error);
//       setTasks(previousTasks);
//     }
//   };

//   const saveColumn = async () => {
//     if (!colTitle.trim()) return;

//     try {
//       if (editingCol) {
//         await fetch(`${API_BASE}/kanban-columns/${editingCol.id}`, {
//           method: "PATCH",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ title: colTitle }),
//         });
//       } else {
//         await fetch(`${API_BASE}/kanban-columns`, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ title: colTitle }),
//         });
//       }

//       setIsColumnModal(false);
//       setColTitle("");
//       setEditingCol(null);
//       await fetchColumns();
//     } catch (error) {
//       console.error('Erro ao salvar coluna:', error);
//     }
//   };

//   // Funções de gravação de áudio
//   const startRecording = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//       mediaRecorderRef.current = new MediaRecorder(stream);
//       audioChunksRef.current = [];

//       mediaRecorderRef.current.ondataavailable = (event) => {
//         if (event.data.size > 0) {
//           audioChunksRef.current.push(event.data);
//         }
//       };

//       mediaRecorderRef.current.onstop = () => {
//         const audioBlob = new Blob(audioChunksRef.current, {
//           type: "audio/webm",
//         });
//         setAudioBlob(audioBlob);
//         setTaskAudio(new File([audioBlob], "recording.webm", { type: "audio/webm" }));
//       };

//       mediaRecorderRef.current.start();
//       setIsRecording(true);
//     } catch (error) {
//       console.error("Erro ao acessar o microfone:", error);
//       alert("Não foi possível acessar o microfone. Verifique as permissões.");
//     }
//   };

//   const stopRecording = () => {
//     if (mediaRecorderRef.current) {
//       mediaRecorderRef.current.stop();
//       setIsRecording(false);
//       setRecordingTime(0);
//       mediaRecorderRef.current.stream
//         .getTracks()
//         .forEach((track) => track.stop());
//     }
//   };

//   const createTask = async () => {
//     if (!taskTitle.trim()) {
//       alert("Título da tarefa é obrigatório");
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       const formData = new FormData();
//       formData.append("title", taskTitle);
//       formData.append("description", taskDescription);
//       formData.append("statusId", taskStatus || "");

//       if (taskDueDate) formData.append("dueDate", taskDueDate);
//       if (taskAssignedTo) formData.append("assignedToId", taskAssignedTo);

//       // Adicionar arquivos
//       if (taskImage) {
//         formData.append("files", taskImage);
//       }
//       if (taskAudio) {
//         formData.append("files", taskAudio);
//       }

//       console.log('📤 Criando nova task com arquivos...');

//       const response = await fetch(`${API_BASE}/tasks`, {
//         method: "POST",
//         body: formData,
//       });

//       if (!response.ok) {
//         throw new Error("Erro ao criar tarefa");
//       }

//       const newTask = await response.json();

//       // Atualizar a lista de tasks
//       setTasks(prev => [newTask, ...prev]);

//       // Resetar o formulário
//       resetTaskForm();
//       setIsTaskModal(false);

//       console.log("✅ Tarefa criada com sucesso:", newTask);
//     } catch (error) {
//       console.error("Erro ao criar tarefa:", error);
//       alert("Erro ao criar tarefa. Tente novamente.");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   // Função para abrir modal de edição
//   const openEditModal = (task: Task) => {
//     setEditingTask(task);
//     setEditTaskTitle(task.title);
//     setEditTaskDescription(task.description || "");
//     setEditTaskDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : "");
//     setEditTaskAssignedTo(task.assignedTo?.id || "");
//     setEditTaskStatus(task.statusId || "");
//     setEditTaskImage(null);
//     setEditTaskAudio(null);
//     setIsEditTaskModal(true);
//   };

//   // Função para editar tarefa
//   const updateTask = async () => {
//     if (!editingTask || !editTaskTitle.trim()) {
//       alert("Título da tarefa é obrigatório");
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       const formData = new FormData();
//       formData.append("title", editTaskTitle);
//       formData.append("description", editTaskDescription);
//       formData.append("statusId", editTaskStatus || "");

//       if (editTaskDueDate) formData.append("dueDate", editTaskDueDate);
//       if (editTaskAssignedTo) formData.append("assignedToId", editTaskAssignedTo);

//       // Adicionar novos arquivos (se houver)
//       if (editTaskImage) {
//         formData.append("files", editTaskImage);
//       }
//       if (editTaskAudio) {
//         formData.append("files", editTaskAudio);
//       }

//       console.log('📤 Atualizando task...');

//       const response = await fetch(`${API_BASE}/tasks/${editingTask.id}`, {
//         method: "PUT",
//         body: formData,
//       });

//       if (!response.ok) {
//         throw new Error("Erro ao atualizar tarefa");
//       }

//       const updatedTask = await response.json();

//       // Atualizar a lista de tasks
//       setTasks(prev => prev.map(t => 
//         t.id === editingTask.id ? updatedTask : t
//       ));

//       // Fechar modal e resetar
//       setIsEditTaskModal(false);
//       setEditingTask(null);
//       resetEditForm();

//       console.log("✅ Tarefa atualizada com sucesso:", updatedTask);
//     } catch (error) {
//       console.error("Erro ao atualizar tarefa:", error);
//       alert("Erro ao atualizar tarefa. Tente novamente.");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   // Função para deletar tarefa
//   const deleteTask = async (taskId: string) => {
//     if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;

//     try {
//       const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
//         method: "DELETE",
//       });

//       if (response.ok) {
//         // Remover da lista local
//         setTasks(prev => prev.filter(t => t.id !== taskId));
//         console.log("✅ Tarefa excluída com sucesso");
//       } else {
//         throw new Error("Erro ao excluir tarefa");
//       }
//     } catch (error) {
//       console.error("Erro ao excluir tarefa:", error);
//       alert("Erro ao excluir tarefa. Tente novamente.");
//     }
//   };

//   const resetTaskForm = () => {
//     setTaskTitle("");
//     setTaskDescription("");
//     setTaskDueDate("");
//     setTaskAssignedTo("");
//     setTaskStatus("");
//     setTaskImage(null);
//     setTaskAudio(null);
//     setAudioBlob(null);
//     setRecordingTime(0);
//     if (mediaRecorderRef.current) {
//       mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
//     }
//   };

//   const resetEditForm = () => {
//     setEditTaskTitle("");
//     setEditTaskDescription("");
//     setEditTaskDueDate("");
//     setEditTaskAssignedTo("");
//     setEditTaskStatus("");
//     setEditTaskImage(null);
//     setEditTaskAudio(null);
//     setAudioBlob(null);
//     setRecordingTime(0);
//   };

//   const deleteColumn = async (id: string) => {
//     if (!confirm("Excluir coluna? Todas as tasks serão movidas para 'Sem etapa'.")) return;
//     try {
//       await fetch(`${API_BASE}/kanban-columns/${id}`, { method: "DELETE" });
//       await Promise.all([fetchColumns(), fetchTasks()]);
//     } catch (error) {
//       console.error('Erro ao excluir coluna:', error);
//     }
//   };

//   // Função para formatar a data com hora
//   const formatDateTime = (dateString: string) => {
//     if (!dateString) return "";

//     try {
//       const date = new Date(dateString);
//       return date.toLocaleString('pt-BR', {
//         day: '2-digit',
//         month: '2-digit',
//         year: 'numeric',
//         hour: '2-digit',
//         minute: '2-digit'
//       });
//     } catch (error) {
//       return dateString;
//     }
//   };

//   // Função para verificar se a data está atrasada
//   const isOverdue = (dateString: string) => {
//     if (!dateString) return false;
//     try {
//       const dueDate = new Date(dateString);
//       const today = new Date();
//       return dueDate < today;
//     } catch (error) {
//       return false;
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex h-screen items-center justify-center">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600"></div>
//       </div>
//     );
//   }

//   const semEtapaCount = tasks.filter(t => !t.statusId).length;

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* HEADER ROXO */}
//       <div className="bg-purple-600 text-white px-6 py-4 flex justify-between items-center shadow-lg">
//         <div className="flex items-center gap-4">
//           <h1 className="text-2xl font-bold">KANBAN DE DESENVOLVIMENTO DE PRODUTOS MARCA</h1>
//           <Badge className="bg-white/20">Sem etapa {semEtapaCount}</Badge>
//         </div>
//         <div className="flex gap-3">
//           <Button 
//             onClick={() => { 
//               setEditingCol(null); 
//               setColTitle(""); 
//               setIsColumnModal(true); 
//             }} 
//             variant="secondary" 
//             className="bg-white/20 hover:bg-white/30"
//           >
//             <Settings className="w-4 h-4 mr-2" /> Gerenciar Colunas
//           </Button>

//           {/* BOTÃO NOVO - CRIAR TAREFA */}
//           <Button 
//             onClick={() => setIsTaskModal(true)}
//             variant="secondary" 
//             className="bg-green-600 hover:bg-green-700 text-white"
//           >
//             <Plus className="w-4 h-4 mr-2" /> Nova Tarefa
//           </Button>

//           <Button variant="secondary" className="bg-white/20 hover:bg-white/30">
//             <Filter className="w-4 h-4 mr-2" /> FILTRAR
//           </Button>
//         </div>
//       </div>

//       {/* SCROLL HORIZONTAL */}
//       <ScrollArea className="w-full">
//         <div className="flex gap-6 p-6 min-w-max">
//           {columns.map(col => (
//             <div 
//               key={col.id} 
//               className="w-80 flex-shrink-0"
//               onDragOver={e => e.preventDefault()}
//               onDrop={e => handleDrop(e, col.id)}
//             >
//               <div className="bg-gray-200 rounded-t-lg px-4 py-3 flex justify-between items-center">
//                 <h3 className="font-semibold">{col.title}</h3>
//                 <div className="flex items-center gap-2">
//                   <Badge className="bg-gray-300 text-gray-700">
//                     {tasks.filter(t => t.statusId === col.id).length}
//                   </Badge>
//                   <DropdownMenu>
//                     <DropdownMenuTrigger asChild>
//                       <Button variant="ghost" size="icon" className="h-6 w-6">
//                         <MoreVertical className="w-4 h-4" />
//                       </Button>
//                     </DropdownMenuTrigger>
//                     <DropdownMenuContent>
//                       <DropdownMenuItem 
//                         onClick={() => { 
//                           setEditingCol(col); 
//                           setColTitle(col.title); 
//                           setIsColumnModal(true); 
//                         }}
//                       >
//                         <Edit className="w-4 h-4 mr-2" /> Renomear
//                       </DropdownMenuItem>
//                       <DropdownMenuItem 
//                         className="text-red-600" 
//                         onClick={() => deleteColumn(col.id)}
//                       >
//                         <Trash2 className="w-4 h-4 mr-2" /> Excluir
//                       </DropdownMenuItem>
//                     </DropdownMenuContent>
//                   </DropdownMenu>
//                 </div>
//               </div>

//               <div className="bg-gray-100 rounded-b-lg p-4 space-y-4 min-h-[600px]">
//                 {tasks
//                   .filter(t => t.statusId === col.id)
//                   .map(task => (
//                     <Card 
//                       key={task.id} 
//                       draggable 
//                       onDragStart={e => e.dataTransfer.setData("taskId", task.id)}
//                       className="bg-white shadow-md hover:shadow-xl cursor-grab active:cursor-grabbing transition-shadow"
//                     >
//                       <CardContent className="p-3">
//                         {/* Menu de opções da task */}
//                         <div className="flex justify-end mb-2">
//                           <DropdownMenu>
//                             <DropdownMenuTrigger asChild>
//                               <Button variant="ghost" size="icon" className="h-6 w-6">
//                                 <MoreVertical className="w-4 h-4" />
//                               </Button>
//                             </DropdownMenuTrigger>
//                             <DropdownMenuContent>
//                               <DropdownMenuItem 
//                                 onClick={() => openEditModal(task)}
//                               >
//                                 <Edit className="w-4 h-4 mr-2" /> Editar
//                               </DropdownMenuItem>
//                               <DropdownMenuItem 
//                                 className="text-red-600" 
//                                 onClick={() => deleteTask(task.id)}
//                               >
//                                 <Trash2 className="w-4 h-4 mr-2" /> Excluir
//                               </DropdownMenuItem>
//                             </DropdownMenuContent>
//                           </DropdownMenu>
//                         </div>

//                         {task.imageUrl ? (
//                           <img 
//                             src={task.imageUrl} 
//                             alt={task.title}
//                             className="w-full h-48 object-cover rounded-md mb-3" 
//                           />
//                         ) : (
//                           <div className="bg-gray-200 border-2 border-dashed h-48 rounded-md mb-3 flex items-center justify-center text-gray-400">
//                             Sem imagem
//                           </div>
//                         )}

//                         <div className="flex justify-between items-start mb-2">
//                           <h4 className="font-semibold text-lg flex-1 mr-2">{task.title}</h4>
//                           <span className="text-sm text-gray-500 shrink-0">#{task.code || task.id.slice(0, 4).toUpperCase()}</span>
//                         </div>

//                         {task.description && (
//                           <p className="text-sm text-gray-600 mb-3 line-clamp-2">
//                             {task.description}
//                           </p>
//                         )}

//                         {/* DATA E HORA DE VENCIMENTO */}
//                         {task.dueDate && (
//                           <div className="mb-3">
//                             <div className="flex items-center space-x-1 text-sm">
//                               <Clock className="w-3 h-3 text-gray-500" />
//                               <span className={`font-medium ${
//                                 isOverdue(task.dueDate) ? 'text-red-600' : 'text-gray-700'
//                               }`}>
//                                 {formatDateTime(task.dueDate)}
//                               </span>
//                               {isOverdue(task.dueDate) && (
//                                 <Badge variant="destructive" className="ml-2 text-xs">
//                                   Atrasado
//                                 </Badge>
//                               )}
//                             </div>
//                           </div>
//                         )}

//                         {task.audioUrl && (
//                           <div className="mb-3">
//                             <audio
//                               controls
//                               src={task.audioUrl}
//                               className="w-full h-8"
//                             >
//                               Seu navegador não suporta o elemento de áudio.
//                             </audio>
//                           </div>
//                         )}

//                         <div className="flex justify-between items-center">
//                           <Badge variant={task.fichaTecnica ? "default" : "secondary"}>
//                             Ficha Técnica
//                           </Badge>
//                           {task.assignedTo && (
//                             <div 
//                               className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center text-xs font-bold"
//                               title={task.assignedTo.name}
//                             >
//                               {task.assignedTo.name[0].toUpperCase()}
//                             </div>
//                           )}
//                         </div>
//                       </CardContent>
//                     </Card>
//                   ))}
//               </div>
//             </div>
//           ))}

//           {/* COLUNA SEM ETAPA */}
//           <div 
//             className="w-80 flex-shrink-0"
//             onDragOver={e => e.preventDefault()}
//             onDrop={e => handleDrop(e, null)}
//           >
//             <div className="bg-gray-200 rounded-t-lg px-4 py-3">
//               <h3 className="font-semibold">Sem etapa</h3>
//             </div>
//             <div className="bg-gray-100 rounded-b-lg p-4 space-y-4 min-h-[600px]">
//               {tasks
//                 .filter(t => !t.statusId)
//                 .map(task => (
//                   <Card 
//                     key={task.id} 
//                     draggable 
//                     onDragStart={e => e.dataTransfer.setData("taskId", task.id)} 
//                     className="bg-white shadow-md hover:shadow-xl cursor-grab active:cursor-grabbing transition-shadow"
//                   >
//                     <CardContent className="p-3">
//                       {/* Menu de opções da task */}
//                       <div className="flex justify-end mb-2">
//                         <DropdownMenu>
//                           <DropdownMenuTrigger asChild>
//                             <Button variant="ghost" size="icon" className="h-6 w-6">
//                               <MoreVertical className="w-4 h-4" />
//                             </Button>
//                           </DropdownMenuTrigger>
//                           <DropdownMenuContent>
//                             <DropdownMenuItem 
//                               onClick={() => openEditModal(task)}
//                             >
//                               <Edit className="w-4 h-4 mr-2" /> Editar
//                             </DropdownMenuItem>
//                             <DropdownMenuItem 
//                               className="text-red-600" 
//                               onClick={() => deleteTask(task.id)}
//                             >
//                               <Trash2 className="w-4 h-4 mr-2" /> Excluir
//                             </DropdownMenuItem>
//                           </DropdownMenuContent>
//                         </DropdownMenu>
//                       </div>

//                       {task.imageUrl ? (
//                         <img 
//                           src={task.imageUrl} 
//                           alt={task.title}
//                           className="w-full h-48 object-cover rounded-md mb-3" 
//                         />
//                       ) : (
//                         <div className="bg-gray-200 border-2 border-dashed h-48 rounded-md mb-3 flex items-center justify-center text-gray-400">
//                           Sem imagem
//                         </div>
//                       )}

//                       <div className="flex justify-between items-start mb-2">
//                         <h4 className="font-semibold text-lg flex-1 mr-2">{task.title}</h4>
//                         <span className="text-sm text-gray-500 shrink-0">#{task.code || task.id.slice(0, 4).toUpperCase()}</span>
//                       </div>

//                       {task.description && (
//                         <p className="text-sm text-gray-600 mb-3 line-clamp-2">
//                           {task.description}
//                         </p>
//                       )}

//                       {/* DATA E HORA DE VENCIMENTO */}
//                       {task.dueDate && (
//                         <div className="mb-3">
//                           <div className="flex items-center space-x-1 text-sm">
//                             <Clock className="w-3 h-3 text-gray-500" />
//                             <span className={`font-medium ${
//                               isOverdue(task.dueDate) ? 'text-red-600' : 'text-gray-700'
//                             }`}>
//                               {formatDateTime(task.dueDate)}
//                             </span>
//                             {isOverdue(task.dueDate) && (
//                               <Badge variant="destructive" className="ml-2 text-xs">
//                                 Atrasado
//                               </Badge>
//                             )}
//                           </div>
//                         </div>
//                       )}

//                       {task.audioUrl && (
//                         <div className="mb-3">
//                           <audio
//                             controls
//                             src={task.audioUrl}
//                             className="w-full h-8"
//                           >
//                             Seu navegador não suporta o elemento de áudio.
//                           </audio>
//                         </div>
//                       )}

//                       <div className="flex justify-between items-center">
//                         <Badge variant={task.fichaTecnica ? "default" : "secondary"}>
//                           Ficha Técnica
//                         </Badge>
//                         {task.assignedTo && (
//                           <div 
//                             className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center text-xs font-bold"
//                             title={task.assignedTo.name}
//                           >
//                             {task.assignedTo.name[0].toUpperCase()}
//                           </div>
//                         )}
//                       </div>
//                     </CardContent>
//                   </Card>
//                 ))}
//             </div>
//           </div>
//         </div>
//         <ScrollBar orientation="horizontal" />
//       </ScrollArea>

//       {/* MODAL CRIAR COLUNA */}
//       <Dialog open={isColumnModal} onOpenChange={setIsColumnModal}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>{editingCol ? "Editar" : "Nova"} Coluna</DialogTitle>
//           </DialogHeader>
//           <div className="space-y-4">
//             <div>
//               <Label htmlFor="column-title">Título</Label>
//               <Input 
//                 id="column-title"
//                 value={colTitle} 
//                 onChange={e => setColTitle(e.target.value)}
//                 placeholder="Digite o título da coluna"
//                 onKeyDown={(e) => {
//                   if (e.key === 'Enter') saveColumn();
//                 }}
//               />
//             </div>
//             <div className="flex gap-2 justify-end">
//               <Button 
//                 variant="outline" 
//                 onClick={() => setIsColumnModal(false)}
//               >
//                 Cancelar
//               </Button>
//               <Button onClick={saveColumn}>
//                 {editingCol ? "Atualizar" : "Criar"} Coluna
//               </Button>
//             </div>
//           </div>
//         </DialogContent>
//       </Dialog>

//       {/* MODAL CRIAR TAREFA */}
//       <Dialog open={isTaskModal} onOpenChange={setIsTaskModal}>
//         <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
//           <DialogHeader>
//             <DialogTitle>Criar Nova Tarefa</DialogTitle>
//             <DialogDescription>
//               Preencha os detalhes da nova tarefa
//             </DialogDescription>
//           </DialogHeader>
//           <div className="space-y-4">
//             <div>
//               <Label htmlFor="task-title">Título *</Label>
//               <Input 
//                 id="task-title"
//                 value={taskTitle} 
//                 onChange={e => setTaskTitle(e.target.value)}
//                 placeholder="Digite o título da tarefa"
//               />
//             </div>

//             <div>
//               <Label htmlFor="task-description">Descrição</Label>
//               <Textarea 
//                 id="task-description"
//                 value={taskDescription} 
//                 onChange={e => setTaskDescription(e.target.value)}
//                 placeholder="Descreva a tarefa..."
//                 rows={3}
//               />
//             </div>

//             {/* UPLOAD DE IMAGEM */}
//             <div>
//               <Label htmlFor="task-image">
//                 <Upload className="w-4 h-4 inline mr-2" />
//                 Imagem
//               </Label>
//               <Input 
//                 id="task-image"
//                 type="file"
//                 accept="image/*"
//                 onChange={(e) => setTaskImage(e.target.files?.[0] || null)}
//                 className="mt-1"
//               />
//               {taskImage && (
//                 <p className="text-sm text-green-600 mt-1">
//                   ✓ {taskImage.name}
//                 </p>
//               )}
//             </div>

//             {/* GRAVAÇÃO DE ÁUDIO */}
//             <div>
//               <Label>
//                 <Mic className="w-4 h-4 inline mr-2" />
//                 Gravação de Áudio
//               </Label>
//               <div className="flex items-center space-x-3 mt-2">
//                 <Button
//                   type="button"
//                   onClick={isRecording ? stopRecording : startRecording}
//                   variant={isRecording ? "destructive" : "outline"}
//                   size="sm"
//                 >
//                   {isRecording ? <Square className="w-4 h-4 mr-1" /> : <Mic className="w-4 h-4 mr-1" />}
//                   {isRecording ? "Parar" : "Gravar"}
//                 </Button>

//                 {isRecording && (
//                   <div className="flex items-center space-x-2">
//                     <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
//                     <span className="text-sm text-gray-600 font-mono">
//                       {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")}
//                     </span>
//                   </div>
//                 )}
//               </div>

//               {audioBlob && (
//                 <div className="mt-3">
//                   <audio 
//                     controls 
//                     className="w-full h-8"
//                     src={URL.createObjectURL(audioBlob)}
//                   >
//                     Seu navegador não suporta o elemento de áudio.
//                   </audio>
//                 </div>
//               )}

//               {/* UPLOAD DE ÁUDIO (alternativo) */}
//               <div className="mt-3">
//                 <Label htmlFor="task-audio">Ou faça upload de um arquivo de áudio</Label>
//                 <Input 
//                   id="task-audio"
//                   type="file"
//                   accept="audio/*"
//                   onChange={(e) => setTaskAudio(e.target.files?.[0] || null)}
//                   className="mt-1"
//                 />
//                 {taskAudio && !audioBlob && (
//                   <p className="text-sm text-green-600 mt-1">
//                     ✓ {taskAudio.name}
//                   </p>
//                 )}
//               </div>
//             </div>

//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <Label htmlFor="task-dueDate">
//                   <Calendar className="w-4 h-4 inline mr-2" />
//                   Data e Hora de Vencimento
//                 </Label>
//                 <Input 
//                   id="task-dueDate"
//                   type="datetime-local"
//                   value={taskDueDate} 
//                   onChange={e => setTaskDueDate(e.target.value)}
//                 />
//               </div>

//               <div>
//                 <Label htmlFor="task-assignedTo">
//                   <User className="w-4 h-4 inline mr-2" />
//                   Responsável
//                 </Label>
//                 <select
//                   id="task-assignedTo"
//                   value={taskAssignedTo}
//                   onChange={e => setTaskAssignedTo(e.target.value)}
//                   className="w-full p-2 border border-gray-300 rounded-md"
//                 >
//                   <option value="">Selecione um responsável</option>
//                   {professionals.map(professional => (
//                     <option key={professional.id} value={professional.id}>
//                       {professional.name}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//             </div>

//             <div>
//               <Label htmlFor="task-status">Coluna</Label>
//               <select
//                 id="task-status"
//                 value={taskStatus}
//                 onChange={e => setTaskStatus(e.target.value)}
//                 className="w-full p-2 border border-gray-300 rounded-md"
//               >
//                 <option value="">Sem etapa</option>
//                 {columns.map(column => (
//                   <option key={column.id} value={column.id}>
//                     {column.title}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <div className="flex gap-2 justify-end pt-4">
//               <Button 
//                 variant="outline" 
//                 onClick={() => {
//                   setIsTaskModal(false);
//                   resetTaskForm();
//                 }}
//                 disabled={isSubmitting}
//               >
//                 Cancelar
//               </Button>
//               <Button 
//                 onClick={createTask}
//                 disabled={!taskTitle.trim() || isSubmitting}
//               >
//                 {isSubmitting ? (
//                   <>
//                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
//                     Criando...
//                   </>
//                 ) : (
//                   <>
//                     <Plus className="w-4 h-4 mr-2" /> Criar Tarefa
//                   </>
//                 )}
//               </Button>
//             </div>
//           </div>
//         </DialogContent>
//       </Dialog>

//       {/* MODAL EDITAR TAREFA */}
//       <Dialog open={isEditTaskModal} onOpenChange={setIsEditTaskModal}>
//         <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
//           <DialogHeader>
//             <DialogTitle>Editar Tarefa</DialogTitle>
//             <DialogDescription>
//               Edite os detalhes da tarefa
//             </DialogDescription>
//           </DialogHeader>
//           {editingTask && (
//             <div className="space-y-4">
//               <div>
//                 <Label htmlFor="edit-task-title">Título *</Label>
//                 <Input 
//                   id="edit-task-title"
//                   value={editTaskTitle} 
//                   onChange={e => setEditTaskTitle(e.target.value)}
//                   placeholder="Digite o título da tarefa"
//                 />
//               </div>

//               <div>
//                 <Label htmlFor="edit-task-description">Descrição</Label>
//                 <Textarea 
//                   id="edit-task-description"
//                   value={editTaskDescription} 
//                   onChange={e => setEditTaskDescription(e.target.value)}
//                   placeholder="Descreva a tarefa..."
//                   rows={3}
//                 />
//               </div>

//               {/* PREVIEW DA IMAGEM ATUAL */}
//               {editingTask.imageUrl && (
//                 <div>
//                   <Label>Imagem Atual</Label>
//                   <div className="mt-2 relative">
//                     <img 
//                       src={editingTask.imageUrl} 
//                       alt="Imagem atual"
//                       className="w-full h-48 object-cover rounded-md border"
//                     />
//                     <div className="absolute top-2 right-2">
//                       <Badge variant="secondary">Atual</Badge>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {/* UPLOAD DE NOVA IMAGEM */}
//               <div>
//                 <Label htmlFor="edit-task-image">
//                   <Upload className="w-4 h-4 inline mr-2" />
//                   {editingTask.imageUrl ? "Substituir Imagem" : "Adicionar Imagem"}
//                 </Label>
//                 <Input 
//                   id="edit-task-image"
//                   type="file"
//                   accept="image/*"
//                   onChange={(e) => setEditTaskImage(e.target.files?.[0] || null)}
//                   className="mt-1"
//                 />
//                 {editTaskImage && (
//                   <p className="text-sm text-green-600 mt-1">
//                     ✓ Nova imagem selecionada: {editTaskImage.name}
//                   </p>
//                 )}
//               </div>

//               {/* PREVIEW DO ÁUDIO ATUAL */}
//               {editingTask.audioUrl && (
//                 <div>
//                   <Label>Áudio Atual</Label>
//                   <div className="mt-2">
//                     <audio
//                       controls
//                       src={editingTask.audioUrl}
//                       className="w-full h-8"
//                     >
//                       Seu navegador não suporta o elemento de áudio.
//                     </audio>
//                     <div className="mt-1">
//                       <Badge variant="secondary">Atual</Badge>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {/* UPLOAD DE NOVO ÁUDIO */}
//               <div>
//                 <Label>
//                   <Mic className="w-4 h-4 inline mr-2" />
//                   {editingTask.audioUrl ? "Substituir Áudio" : "Adicionar Áudio"}
//                 </Label>

//                 {/* UPLOAD DE ÁUDIO (alternativo) */}
//                 <div className="mt-3">
//                   <Label htmlFor="edit-task-audio">Fazer upload de um arquivo de áudio</Label>
//                   <Input 
//                     id="edit-task-audio"
//                     type="file"
//                     accept="audio/*"
//                     onChange={(e) => setEditTaskAudio(e.target.files?.[0] || null)}
//                     className="mt-1"
//                   />
//                   {editTaskAudio && (
//                     <p className="text-sm text-green-600 mt-1">
//                       ✓ Novo áudio selecionado: {editTaskAudio.name}
//                     </p>
//                   )}
//                 </div>
//               </div>

//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <Label htmlFor="edit-task-dueDate">
//                     <Calendar className="w-4 h-4 inline mr-2" />
//                     Data e Hora de Vencimento
//                   </Label>
//                   <Input 
//                     id="edit-task-dueDate"
//                     type="datetime-local"
//                     value={editTaskDueDate} 
//                     onChange={e => setEditTaskDueDate(e.target.value)}
//                   />
//                 </div>

//                 <div>
//                   <Label htmlFor="edit-task-assignedTo">
//                     <User className="w-4 h-4 inline mr-2" />
//                     Responsável
//                   </Label>
//                   <select
//                     id="edit-task-assignedTo"
//                     value={editTaskAssignedTo}
//                     onChange={e => setEditTaskAssignedTo(e.target.value)}
//                     className="w-full p-2 border border-gray-300 rounded-md"
//                   >
//                     <option value="">Selecione um responsável</option>
//                     {professionals.map(professional => (
//                       <option key={professional.id} value={professional.id}>
//                         {professional.name}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               </div>

//               <div>
//                 <Label htmlFor="edit-task-status">Coluna</Label>
//                 <select
//                   id="edit-task-status"
//                   value={editTaskStatus}
//                   onChange={e => setEditTaskStatus(e.target.value)}
//                   className="w-full p-2 border border-gray-300 rounded-md"
//                 >
//                   <option value="">Sem etapa</option>
//                   {columns.map(column => (
//                     <option key={column.id} value={column.id}>
//                       {column.title}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div className="flex gap-2 justify-end pt-4">
//                 <Button 
//                   variant="outline" 
//                   onClick={() => {
//                     setIsEditTaskModal(false);
//                     setEditingTask(null);
//                     resetEditForm();
//                   }}
//                   disabled={isSubmitting}
//                 >
//                   Cancelar
//                 </Button>
//                 <Button 
//                   onClick={updateTask}
//                   disabled={!editTaskTitle.trim() || isSubmitting}
//                 >
//                   {isSubmitting ? (
//                     <>
//                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
//                       Atualizando...
//                     </>
//                   ) : (
//                     <>
//                       <Edit className="w-4 h-4 mr-2" /> Atualizar Tarefa
//                     </>
//                   )}
//                 </Button>
//               </div>
//             </div>
//           )}
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// }

// VERSAO 2 FUNCIONANDO BARRA HORIZONTAL
// "use client";
// import { useState, useEffect, useRef } from "react";
// import { Button } from "@/components/ui/button";
// import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
// import { Badge } from "@/components/ui/badge";
// import { Card, CardContent } from "@/components/ui/card";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
// } from "@/components/ui/dialog";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { 
//   Plus, 
//   Filter, 
//   MoreVertical, 
//   Settings, 
//   Trash2, 
//   Edit,
//   Calendar,
//   User,
//   Mic,
//   Square,
//   Upload,
//   Clock,
//   X
// } from "lucide-react";

// const API_BASE = "http://localhost:3002";

// interface Professional {
//   id: string;
//   name: string;
// }

// interface Task {
//   id: string;
//   title: string;
//   code?: string;
//   imageUrl?: string;
//   audioUrl?: string;
//   fichaTecnica?: boolean;
//   assignedTo?: Professional;
//   statusId?: string | null;
//   description?: string;
//   dueDate?: string;
// }

// interface Column {
//   id: string;
//   title: string;
// }

// export default function ProductKanban() {
//   const [tasks, setTasks] = useState<Task[]>([]);
//   const [columns, setColumns] = useState<Column[]>([]);
//   const [professionals, setProfessionals] = useState<Professional[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [isColumnModal, setIsColumnModal] = useState(false);
//   const [isTaskModal, setIsTaskModal] = useState(false);
//   const [isEditTaskModal, setIsEditTaskModal] = useState(false);
//   const [editingCol, setEditingCol] = useState<Column | null>(null);
//   const [editingTask, setEditingTask] = useState<Task | null>(null);
//   const [colTitle, setColTitle] = useState("");

//   // Estados para o formulário de tarefa
//   const [taskTitle, setTaskTitle] = useState("");
//   const [taskDescription, setTaskDescription] = useState("");
//   const [taskDueDate, setTaskDueDate] = useState("");
//   const [taskAssignedTo, setTaskAssignedTo] = useState("");
//   const [taskStatus, setTaskStatus] = useState("");
//   const [taskImage, setTaskImage] = useState<File | null>(null);
//   const [taskAudio, setTaskAudio] = useState<File | null>(null);
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   // Estados para edição de tarefa
//   const [editTaskTitle, setEditTaskTitle] = useState("");
//   const [editTaskDescription, setEditTaskDescription] = useState("");
//   const [editTaskDueDate, setEditTaskDueDate] = useState("");
//   const [editTaskAssignedTo, setEditTaskAssignedTo] = useState("");
//   const [editTaskStatus, setEditTaskStatus] = useState("");
//   const [editTaskImage, setEditTaskImage] = useState<File | null>(null);
//   const [editTaskAudio, setEditTaskAudio] = useState<File | null>(null);

//   // Estados para gravação de áudio
//   const [isRecording, setIsRecording] = useState(false);
//   const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
//   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
//   const audioChunksRef = useRef<Blob[]>([]);
//   const [recordingTime, setRecordingTime] = useState(0);

//   const fetchColumns = async () => {
//     try {
//       const res = await fetch(`${API_BASE}/kanban-columns`);
//       const data = await res.json();
//       setColumns(data);
//     } catch (error) {
//       console.error('Erro ao buscar colunas:', error);
//     }
//   };

//   const fetchTasks = async () => {
//     try {
//       const res = await fetch(`${API_BASE}/tasks`);
//       const data = await res.json();
//       if (Array.isArray(data)) setTasks(data);
//       else if (data.tasks) setTasks(data.tasks);
//     } catch (error) {
//       console.error('Erro ao buscar tasks:', error);
//     }
//   };

//   const fetchProfessionals = async () => {
//     try {
//       const res = await fetch(`${API_BASE}/professionals`);
//       const data = await res.json();
//       setProfessionals(data);
//     } catch (error) {
//       console.error('Erro ao buscar profissionais:', error);
//     }
//   };

//   const loadInitialData = async () => {
//     setLoading(true);
//     try {
//       await Promise.all([fetchColumns(), fetchTasks(), fetchProfessionals()]);
//     } catch (error) {
//       console.error('Erro ao carregar dados:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadInitialData();
//   }, []);

//   // Temporizador para gravação
//   useEffect(() => {
//     let interval: NodeJS.Timeout | null = null;
//     if (isRecording) {
//       interval = setInterval(() => {
//         setRecordingTime((prev) => prev + 1);
//       }, 1000);
//     }
//     return () => {
//       if (interval) clearInterval(interval);
//     };
//   }, [isRecording]);

//   const handleDrop = async (e: React.DragEvent, statusId: string | null) => {
//     e.preventDefault();
//     const taskId = e.dataTransfer.getData("taskId");
//     if (!taskId) return;

//     const previousTasks = [...tasks];
//     setTasks(prev => prev.map(t => 
//       t.id === taskId ? { ...t, statusId } : t
//     ));

//     try {
//       await fetch(`${API_BASE}/tasks/${taskId}/status`, {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ status: statusId }),
//       });
//     } catch (error) {
//       console.error('Erro ao atualizar status:', error);
//       setTasks(previousTasks);
//     }
//   };

//   const saveColumn = async () => {
//     if (!colTitle.trim()) return;

//     try {
//       if (editingCol) {
//         await fetch(`${API_BASE}/kanban-columns/${editingCol.id}`, {
//           method: "PATCH",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ title: colTitle }),
//         });
//       } else {
//         await fetch(`${API_BASE}/kanban-columns`, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ title: colTitle }),
//         });
//       }

//       setIsColumnModal(false);
//       setColTitle("");
//       setEditingCol(null);
//       await fetchColumns();
//     } catch (error) {
//       console.error('Erro ao salvar coluna:', error);
//     }
//   };

//   // Funções de gravação de áudio
//   const startRecording = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//       mediaRecorderRef.current = new MediaRecorder(stream);
//       audioChunksRef.current = [];

//       mediaRecorderRef.current.ondataavailable = (event) => {
//         if (event.data.size > 0) {
//           audioChunksRef.current.push(event.data);
//         }
//       };

//       mediaRecorderRef.current.onstop = () => {
//         const audioBlob = new Blob(audioChunksRef.current, {
//           type: "audio/webm",
//         });
//         setAudioBlob(audioBlob);
//         setTaskAudio(new File([audioBlob], "recording.webm", { type: "audio/webm" }));
//       };

//       mediaRecorderRef.current.start();
//       setIsRecording(true);
//     } catch (error) {
//       console.error("Erro ao acessar o microfone:", error);
//       alert("Não foi possível acessar o microfone. Verifique as permissões.");
//     }
//   };

//   const stopRecording = () => {
//     if (mediaRecorderRef.current) {
//       mediaRecorderRef.current.stop();
//       setIsRecording(false);
//       setRecordingTime(0);
//       mediaRecorderRef.current.stream
//         .getTracks()
//         .forEach((track) => track.stop());
//     }
//   };

//   const createTask = async () => {
//     if (!taskTitle.trim()) {
//       alert("Título da tarefa é obrigatório");
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       const formData = new FormData();
//       formData.append("title", taskTitle);
//       formData.append("description", taskDescription);
//       formData.append("statusId", taskStatus || "");

//       if (taskDueDate) formData.append("dueDate", taskDueDate);
//       if (taskAssignedTo) formData.append("assignedToId", taskAssignedTo);

//       // Adicionar arquivos
//       if (taskImage) {
//         formData.append("files", taskImage);
//       }
//       if (taskAudio) {
//         formData.append("files", taskAudio);
//       }

//       console.log('📤 Criando nova task com arquivos...');

//       const response = await fetch(`${API_BASE}/tasks`, {
//         method: "POST",
//         body: formData,
//       });

//       if (!response.ok) {
//         throw new Error("Erro ao criar tarefa");
//       }

//       const newTask = await response.json();

//       // Atualizar a lista de tasks
//       setTasks(prev => [newTask, ...prev]);

//       // Resetar o formulário
//       resetTaskForm();
//       setIsTaskModal(false);

//       console.log("✅ Tarefa criada com sucesso:", newTask);
//     } catch (error) {
//       console.error("Erro ao criar tarefa:", error);
//       alert("Erro ao criar tarefa. Tente novamente.");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   // Função para abrir modal de edição
//   const openEditModal = (task: Task) => {
//     setEditingTask(task);
//     setEditTaskTitle(task.title);
//     setEditTaskDescription(task.description || "");
//     setEditTaskDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : "");
//     setEditTaskAssignedTo(task.assignedTo?.id || "");
//     setEditTaskStatus(task.statusId || "");
//     setEditTaskImage(null);
//     setEditTaskAudio(null);
//     setIsEditTaskModal(true);
//   };

//   // Função para editar tarefa
//   const updateTask = async () => {
//     if (!editingTask || !editTaskTitle.trim()) {
//       alert("Título da tarefa é obrigatório");
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       const formData = new FormData();
//       formData.append("title", editTaskTitle);
//       formData.append("description", editTaskDescription);
//       formData.append("statusId", editTaskStatus || "");

//       if (editTaskDueDate) formData.append("dueDate", editTaskDueDate);
//       if (editTaskAssignedTo) formData.append("assignedToId", editTaskAssignedTo);

//       // Adicionar novos arquivos (se houver)
//       if (editTaskImage) {
//         formData.append("files", editTaskImage);
//       }
//       if (editTaskAudio) {
//         formData.append("files", editTaskAudio);
//       }

//       console.log('📤 Atualizando task...');

//       const response = await fetch(`${API_BASE}/tasks/${editingTask.id}`, {
//         method: "PUT",
//         body: formData,
//       });

//       if (!response.ok) {
//         throw new Error("Erro ao atualizar tarefa");
//       }

//       const updatedTask = await response.json();

//       // Atualizar a lista de tasks
//       setTasks(prev => prev.map(t => 
//         t.id === editingTask.id ? updatedTask : t
//       ));

//       // Fechar modal e resetar
//       setIsEditTaskModal(false);
//       setEditingTask(null);
//       resetEditForm();

//       console.log("✅ Tarefa atualizada com sucesso:", updatedTask);
//     } catch (error) {
//       console.error("Erro ao atualizar tarefa:", error);
//       alert("Erro ao atualizar tarefa. Tente novamente.");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   // Função para deletar tarefa
//   const deleteTask = async (taskId: string) => {
//     if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;

//     try {
//       const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
//         method: "DELETE",
//       });

//       if (response.ok) {
//         // Remover da lista local
//         setTasks(prev => prev.filter(t => t.id !== taskId));
//         console.log("✅ Tarefa excluída com sucesso");
//       } else {
//         throw new Error("Erro ao excluir tarefa");
//       }
//     } catch (error) {
//       console.error("Erro ao excluir tarefa:", error);
//       alert("Erro ao excluir tarefa. Tente novamente.");
//     }
//   };

//   const resetTaskForm = () => {
//     setTaskTitle("");
//     setTaskDescription("");
//     setTaskDueDate("");
//     setTaskAssignedTo("");
//     setTaskStatus("");
//     setTaskImage(null);
//     setTaskAudio(null);
//     setAudioBlob(null);
//     setRecordingTime(0);
//     if (mediaRecorderRef.current) {
//       mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
//     }
//   };

//   const resetEditForm = () => {
//     setEditTaskTitle("");
//     setEditTaskDescription("");
//     setEditTaskDueDate("");
//     setEditTaskAssignedTo("");
//     setEditTaskStatus("");
//     setEditTaskImage(null);
//     setEditTaskAudio(null);
//     setAudioBlob(null);
//     setRecordingTime(0);
//   };

//   const deleteColumn = async (id: string) => {
//     if (!confirm("Excluir coluna? Todas as tasks serão movidas para 'Sem etapa'.")) return;
//     try {
//       await fetch(`${API_BASE}/kanban-columns/${id}`, { method: "DELETE" });
//       await Promise.all([fetchColumns(), fetchTasks()]);
//     } catch (error) {
//       console.error('Erro ao excluir coluna:', error);
//     }
//   };

//   // Função para formatar a data com hora
//   const formatDateTime = (dateString: string) => {
//     if (!dateString) return "";

//     try {
//       const date = new Date(dateString);
//       return date.toLocaleString('pt-BR', {
//         day: '2-digit',
//         month: '2-digit',
//         year: 'numeric',
//         hour: '2-digit',
//         minute: '2-digit'
//       });
//     } catch (error) {
//       return dateString;
//     }
//   };

//   // Função para verificar se a data está atrasada
//   const isOverdue = (dateString: string) => {
//     if (!dateString) return false;
//     try {
//       const dueDate = new Date(dateString);
//       const today = new Date();
//       return dueDate < today;
//     } catch (error) {
//       return false;
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex h-screen items-center justify-center">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600"></div>
//       </div>
//     );
//   }

//   const semEtapaCount = tasks.filter(t => !t.statusId).length;

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* HEADER ROXO */}
//       <div className="bg-purple-600 text-white px-6 py-4 flex justify-between items-center shadow-lg">
//         <div className="flex items-center gap-4">
//           <h1 className="text-2xl font-bold">KANBAN DE DESENVOLVIMENTO DE PRODUTOS MARCA</h1>
//           <Badge className="bg-white/20">Sem etapa {semEtapaCount}</Badge>
//         </div>
//         <div className="flex gap-3">
//           <Button 
//             onClick={() => { 
//               setEditingCol(null); 
//               setColTitle(""); 
//               setIsColumnModal(true); 
//             }} 
//             variant="secondary" 
//             className="bg-white/20 hover:bg-white/30"
//           >
//             <Settings className="w-4 h-4 mr-2" /> Gerenciar Colunas
//           </Button>

//           {/* BOTÃO NOVO - CRIAR TAREFA */}
//           <Button 
//             onClick={() => setIsTaskModal(true)}
//             variant="secondary" 
//             className="bg-green-600 hover:bg-green-700 text-white"
//           >
//             <Plus className="w-4 h-4 mr-2" /> Nova Tarefa
//           </Button>

//           <Button variant="secondary" className="bg-white/20 hover:bg-white/30">
//             <Filter className="w-4 h-4 mr-2" /> FILTRAR
//           </Button>
//         </div>
//       </div>

//       {/* CONTAINER PRINCIPAL COM SCROLL HORIZONTAL */}
//       <div className="w-full overflow-x-auto">
//         <div className="flex gap-6 p-6 min-w-max">
//           {columns.map(col => (
//             <div 
//               key={col.id} 
//               className="w-80 flex-shrink-0"
//               onDragOver={e => e.preventDefault()}
//               onDrop={e => handleDrop(e, col.id)}
//             >
//               <div className="bg-gray-200 rounded-t-lg px-4 py-3 flex justify-between items-center">
//                 <h3 className="font-semibold">{col.title}</h3>
//                 <div className="flex items-center gap-2">
//                   <Badge className="bg-gray-300 text-gray-700">
//                     {tasks.filter(t => t.statusId === col.id).length}
//                   </Badge>
//                   <DropdownMenu>
//                     <DropdownMenuTrigger asChild>
//                       <Button variant="ghost" size="icon" className="h-6 w-6">
//                         <MoreVertical className="w-4 h-4" />
//                       </Button>
//                     </DropdownMenuTrigger>
//                     <DropdownMenuContent>
//                       <DropdownMenuItem 
//                         onClick={() => { 
//                           setEditingCol(col); 
//                           setColTitle(col.title); 
//                           setIsColumnModal(true); 
//                         }}
//                       >
//                         <Edit className="w-4 h-4 mr-2" /> Renomear
//                       </DropdownMenuItem>
//                       <DropdownMenuItem 
//                         className="text-red-600" 
//                         onClick={() => deleteColumn(col.id)}
//                       >
//                         <Trash2 className="w-4 h-4 mr-2" /> Excluir
//                       </DropdownMenuItem>
//                     </DropdownMenuContent>
//                   </DropdownMenu>
//                 </div>
//               </div>

//               <div className="bg-gray-100 rounded-b-lg p-4 space-y-4 min-h-[600px]">
//                 {tasks
//                   .filter(t => t.statusId === col.id)
//                   .map(task => (
//                     <Card 
//                       key={task.id} 
//                       draggable 
//                       onDragStart={e => e.dataTransfer.setData("taskId", task.id)}
//                       className="bg-white shadow-md hover:shadow-xl cursor-grab active:cursor-grabbing transition-shadow"
//                     >
//                       <CardContent className="p-3">
//                         {/* Menu de opções da task */}
//                         <div className="flex justify-end mb-2">
//                           <DropdownMenu>
//                             <DropdownMenuTrigger asChild>
//                               <Button variant="ghost" size="icon" className="h-6 w-6">
//                                 <MoreVertical className="w-4 h-4" />
//                               </Button>
//                             </DropdownMenuTrigger>
//                             <DropdownMenuContent>
//                               <DropdownMenuItem 
//                                 onClick={() => openEditModal(task)}
//                               >
//                                 <Edit className="w-4 h-4 mr-2" /> Editar
//                               </DropdownMenuItem>
//                               <DropdownMenuItem 
//                                 className="text-red-600" 
//                                 onClick={() => deleteTask(task.id)}
//                               >
//                                 <Trash2 className="w-4 h-4 mr-2" /> Excluir
//                               </DropdownMenuItem>
//                             </DropdownMenuContent>
//                           </DropdownMenu>
//                         </div>

//                         {task.imageUrl ? (
//                           <img 
//                             src={task.imageUrl} 
//                             alt={task.title}
//                             className="w-full h-48 object-cover rounded-md mb-3" 
//                           />
//                         ) : (
//                           <div className="bg-gray-200 border-2 border-dashed h-48 rounded-md mb-3 flex items-center justify-center text-gray-400">
//                             Sem imagem
//                           </div>
//                         )}

//                         <div className="flex justify-between items-start mb-2">
//                           <h4 className="font-semibold text-lg flex-1 mr-2">{task.title}</h4>
//                           <span className="text-sm text-gray-500 shrink-0">#{task.code || task.id.slice(0, 4).toUpperCase()}</span>
//                         </div>

//                         {task.description && (
//                           <p className="text-sm text-gray-600 mb-3 line-clamp-2">
//                             {task.description}
//                           </p>
//                         )}

//                         {/* DATA E HORA DE VENCIMENTO */}
//                         {task.dueDate && (
//                           <div className="mb-3">
//                             <div className="flex items-center space-x-1 text-sm">
//                               <Clock className="w-3 h-3 text-gray-500" />
//                               <span className={`font-medium ${
//                                 isOverdue(task.dueDate) ? 'text-red-600' : 'text-gray-700'
//                               }`}>
//                                 {formatDateTime(task.dueDate)}
//                               </span>
//                               {isOverdue(task.dueDate) && (
//                                 <Badge variant="destructive" className="ml-2 text-xs">
//                                   Atrasado
//                                 </Badge>
//                               )}
//                             </div>
//                           </div>
//                         )}

//                         {task.audioUrl && (
//                           <div className="mb-3">
//                             <audio
//                               controls
//                               src={task.audioUrl}
//                               className="w-full h-8"
//                             >
//                               Seu navegador não suporta o elemento de áudio.
//                             </audio>
//                           </div>
//                         )}

//                         <div className="flex justify-between items-center">
//                           <Badge variant={task.fichaTecnica ? "default" : "secondary"}>
//                             Ficha Técnica
//                           </Badge>
//                           {task.assignedTo && (
//                             <div 
//                               className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center text-xs font-bold"
//                               title={task.assignedTo.name}
//                             >
//                               {task.assignedTo.name[0].toUpperCase()}
//                             </div>
//                           )}
//                         </div>
//                       </CardContent>
//                     </Card>
//                   ))}
//               </div>
//             </div>
//           ))}

//           {/* COLUNA SEM ETAPA */}
//           <div 
//             className="w-80 flex-shrink-0"
//             onDragOver={e => e.preventDefault()}
//             onDrop={e => handleDrop(e, null)}
//           >
//             <div className="bg-gray-200 rounded-t-lg px-4 py-3">
//               <h3 className="font-semibold">Sem etapa</h3>
//             </div>
//             <div className="bg-gray-100 rounded-b-lg p-4 space-y-4 min-h-[600px]">
//               {tasks
//                 .filter(t => !t.statusId)
//                 .map(task => (
//                   <Card 
//                     key={task.id} 
//                     draggable 
//                     onDragStart={e => e.dataTransfer.setData("taskId", task.id)} 
//                     className="bg-white shadow-md hover:shadow-xl cursor-grab active:cursor-grabbing transition-shadow"
//                   >
//                     <CardContent className="p-3">
//                       {/* Menu de opções da task */}
//                       <div className="flex justify-end mb-2">
//                         <DropdownMenu>
//                           <DropdownMenuTrigger asChild>
//                             <Button variant="ghost" size="icon" className="h-6 w-6">
//                               <MoreVertical className="w-4 h-4" />
//                             </Button>
//                           </DropdownMenuTrigger>
//                           <DropdownMenuContent>
//                             <DropdownMenuItem 
//                               onClick={() => openEditModal(task)}
//                             >
//                               <Edit className="w-4 h-4 mr-2" /> Editar
//                             </DropdownMenuItem>
//                             <DropdownMenuItem 
//                               className="text-red-600" 
//                               onClick={() => deleteTask(task.id)}
//                             >
//                               <Trash2 className="w-4 h-4 mr-2" /> Excluir
//                             </DropdownMenuItem>
//                           </DropdownMenuContent>
//                         </DropdownMenu>
//                       </div>

//                       {task.imageUrl ? (
//                         <img 
//                           src={task.imageUrl} 
//                           alt={task.title}
//                           className="w-full h-48 object-cover rounded-md mb-3" 
//                         />
//                       ) : (
//                         <div className="bg-gray-200 border-2 border-dashed h-48 rounded-md mb-3 flex items-center justify-center text-gray-400">
//                           Sem imagem
//                         </div>
//                       )}

//                       <div className="flex justify-between items-start mb-2">
//                         <h4 className="font-semibold text-lg flex-1 mr-2">{task.title}</h4>
//                         <span className="text-sm text-gray-500 shrink-0">#{task.code || task.id.slice(0, 4).toUpperCase()}</span>
//                       </div>

//                       {task.description && (
//                         <p className="text-sm text-gray-600 mb-3 line-clamp-2">
//                           {task.description}
//                         </p>
//                       )}

//                       {/* DATA E HORA DE VENCIMENTO */}
//                       {task.dueDate && (
//                         <div className="mb-3">
//                           <div className="flex items-center space-x-1 text-sm">
//                             <Clock className="w-3 h-3 text-gray-500" />
//                             <span className={`font-medium ${
//                               isOverdue(task.dueDate) ? 'text-red-600' : 'text-gray-700'
//                             }`}>
//                               {formatDateTime(task.dueDate)}
//                             </span>
//                             {isOverdue(task.dueDate) && (
//                               <Badge variant="destructive" className="ml-2 text-xs">
//                                 Atrasado
//                               </Badge>
//                             )}
//                           </div>
//                         </div>
//                       )}

//                       {task.audioUrl && (
//                         <div className="mb-3">
//                           <audio
//                             controls
//                             src={task.audioUrl}
//                             className="w-full h-8"
//                           >
//                             Seu navegador não suporta o elemento de áudio.
//                           </audio>
//                         </div>
//                       )}

//                       <div className="flex justify-between items-center">
//                         <Badge variant={task.fichaTecnica ? "default" : "secondary"}>
//                           Ficha Técnica
//                         </Badge>
//                         {task.assignedTo && (
//                           <div 
//                             className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center text-xs font-bold"
//                             title={task.assignedTo.name}
//                           >
//                             {task.assignedTo.name[0].toUpperCase()}
//                           </div>
//                         )}
//                       </div>
//                     </CardContent>
//                   </Card>
//                 ))}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* MODAL CRIAR COLUNA */}
//       <Dialog open={isColumnModal} onOpenChange={setIsColumnModal}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>{editingCol ? "Editar" : "Nova"} Coluna</DialogTitle>
//           </DialogHeader>
//           <div className="space-y-4">
//             <div>
//               <Label htmlFor="column-title">Título</Label>
//               <Input 
//                 id="column-title"
//                 value={colTitle} 
//                 onChange={e => setColTitle(e.target.value)}
//                 placeholder="Digite o título da coluna"
//                 onKeyDown={(e) => {
//                   if (e.key === 'Enter') saveColumn();
//                 }}
//               />
//             </div>
//             <div className="flex gap-2 justify-end">
//               <Button 
//                 variant="outline" 
//                 onClick={() => setIsColumnModal(false)}
//               >
//                 Cancelar
//               </Button>
//               <Button onClick={saveColumn}>
//                 {editingCol ? "Atualizar" : "Criar"} Coluna
//               </Button>
//             </div>
//           </div>
//         </DialogContent>
//       </Dialog>

//       {/* MODAL CRIAR TAREFA */}
//       <Dialog open={isTaskModal} onOpenChange={setIsTaskModal}>
//         <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
//           <DialogHeader>
//             <DialogTitle>Criar Nova Tarefa</DialogTitle>
//             <DialogDescription>
//               Preencha os detalhes da nova tarefa
//             </DialogDescription>
//           </DialogHeader>
//           <div className="space-y-4">
//             <div>
//               <Label htmlFor="task-title">Título *</Label>
//               <Input 
//                 id="task-title"
//                 value={taskTitle} 
//                 onChange={e => setTaskTitle(e.target.value)}
//                 placeholder="Digite o título da tarefa"
//               />
//             </div>

//             <div>
//               <Label htmlFor="task-description">Descrição</Label>
//               <Textarea 
//                 id="task-description"
//                 value={taskDescription} 
//                 onChange={e => setTaskDescription(e.target.value)}
//                 placeholder="Descreva a tarefa..."
//                 rows={3}
//               />
//             </div>

//             {/* UPLOAD DE IMAGEM */}
//             <div>
//               <Label htmlFor="task-image">
//                 <Upload className="w-4 h-4 inline mr-2" />
//                 Imagem
//               </Label>
//               <Input 
//                 id="task-image"
//                 type="file"
//                 accept="image/*"
//                 onChange={(e) => setTaskImage(e.target.files?.[0] || null)}
//                 className="mt-1"
//               />
//               {taskImage && (
//                 <p className="text-sm text-green-600 mt-1">
//                   ✓ {taskImage.name}
//                 </p>
//               )}
//             </div>

//             {/* GRAVAÇÃO DE ÁUDIO */}
//             <div>
//               <Label>
//                 <Mic className="w-4 h-4 inline mr-2" />
//                 Gravação de Áudio
//               </Label>
//               <div className="flex items-center space-x-3 mt-2">
//                 <Button
//                   type="button"
//                   onClick={isRecording ? stopRecording : startRecording}
//                   variant={isRecording ? "destructive" : "outline"}
//                   size="sm"
//                 >
//                   {isRecording ? <Square className="w-4 h-4 mr-1" /> : <Mic className="w-4 h-4 mr-1" />}
//                   {isRecording ? "Parar" : "Gravar"}
//                 </Button>

//                 {isRecording && (
//                   <div className="flex items-center space-x-2">
//                     <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
//                     <span className="text-sm text-gray-600 font-mono">
//                       {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")}
//                     </span>
//                   </div>
//                 )}
//               </div>

//               {audioBlob && (
//                 <div className="mt-3">
//                   <audio 
//                     controls 
//                     className="w-full h-8"
//                     src={URL.createObjectURL(audioBlob)}
//                   >
//                     Seu navegador não suporta o elemento de áudio.
//                   </audio>
//                 </div>
//               )}

//               {/* UPLOAD DE ÁUDIO (alternativo) */}
//               <div className="mt-3">
//                 <Label htmlFor="task-audio">Ou faça upload de um arquivo de áudio</Label>
//                 <Input 
//                   id="task-audio"
//                   type="file"
//                   accept="audio/*"
//                   onChange={(e) => setTaskAudio(e.target.files?.[0] || null)}
//                   className="mt-1"
//                 />
//                 {taskAudio && !audioBlob && (
//                   <p className="text-sm text-green-600 mt-1">
//                     ✓ {taskAudio.name}
//                   </p>
//                 )}
//               </div>
//             </div>

//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <Label htmlFor="task-dueDate">
//                   <Calendar className="w-4 h-4 inline mr-2" />
//                   Data e Hora de Vencimento
//                 </Label>
//                 <Input 
//                   id="task-dueDate"
//                   type="datetime-local"
//                   value={taskDueDate} 
//                   onChange={e => setTaskDueDate(e.target.value)}
//                 />
//               </div>

//               <div>
//                 <Label htmlFor="task-assignedTo">
//                   <User className="w-4 h-4 inline mr-2" />
//                   Responsável
//                 </Label>
//                 <select
//                   id="task-assignedTo"
//                   value={taskAssignedTo}
//                   onChange={e => setTaskAssignedTo(e.target.value)}
//                   className="w-full p-2 border border-gray-300 rounded-md"
//                 >
//                   <option value="">Selecione um responsável</option>
//                   {professionals.map(professional => (
//                     <option key={professional.id} value={professional.id}>
//                       {professional.name}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//             </div>

//             <div>
//               <Label htmlFor="task-status">Coluna</Label>
//               <select
//                 id="task-status"
//                 value={taskStatus}
//                 onChange={e => setTaskStatus(e.target.value)}
//                 className="w-full p-2 border border-gray-300 rounded-md"
//               >
//                 <option value="">Sem etapa</option>
//                 {columns.map(column => (
//                   <option key={column.id} value={column.id}>
//                     {column.title}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <div className="flex gap-2 justify-end pt-4">
//               <Button 
//                 variant="outline" 
//                 onClick={() => {
//                   setIsTaskModal(false);
//                   resetTaskForm();
//                 }}
//                 disabled={isSubmitting}
//               >
//                 Cancelar
//               </Button>
//               <Button 
//                 onClick={createTask}
//                 disabled={!taskTitle.trim() || isSubmitting}
//               >
//                 {isSubmitting ? (
//                   <>
//                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
//                     Criando...
//                   </>
//                 ) : (
//                   <>
//                     <Plus className="w-4 h-4 mr-2" /> Criar Tarefa
//                   </>
//                 )}
//               </Button>
//             </div>
//           </div>
//         </DialogContent>
//       </Dialog>

//       {/* MODAL EDITAR TAREFA */}
//       <Dialog open={isEditTaskModal} onOpenChange={setIsEditTaskModal}>
//         <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
//           <DialogHeader>
//             <DialogTitle>Editar Tarefa</DialogTitle>
//             <DialogDescription>
//               Edite os detalhes da tarefa
//             </DialogDescription>
//           </DialogHeader>
//           {editingTask && (
//             <div className="space-y-4">
//               <div>
//                 <Label htmlFor="edit-task-title">Título *</Label>
//                 <Input 
//                   id="edit-task-title"
//                   value={editTaskTitle} 
//                   onChange={e => setEditTaskTitle(e.target.value)}
//                   placeholder="Digite o título da tarefa"
//                 />
//               </div>

//               <div>
//                 <Label htmlFor="edit-task-description">Descrição</Label>
//                 <Textarea 
//                   id="edit-task-description"
//                   value={editTaskDescription} 
//                   onChange={e => setEditTaskDescription(e.target.value)}
//                   placeholder="Descreva a tarefa..."
//                   rows={3}
//                 />
//               </div>

//               {/* PREVIEW DA IMAGEM ATUAL */}
//               {editingTask.imageUrl && (
//                 <div>
//                   <Label>Imagem Atual</Label>
//                   <div className="mt-2 relative">
//                     <img 
//                       src={editingTask.imageUrl} 
//                       alt="Imagem atual"
//                       className="w-full h-48 object-cover rounded-md border"
//                     />
//                     <div className="absolute top-2 right-2">
//                       <Badge variant="secondary">Atual</Badge>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {/* UPLOAD DE NOVA IMAGEM */}
//               <div>
//                 <Label htmlFor="edit-task-image">
//                   <Upload className="w-4 h-4 inline mr-2" />
//                   {editingTask.imageUrl ? "Substituir Imagem" : "Adicionar Imagem"}
//                 </Label>
//                 <Input 
//                   id="edit-task-image"
//                   type="file"
//                   accept="image/*"
//                   onChange={(e) => setEditTaskImage(e.target.files?.[0] || null)}
//                   className="mt-1"
//                 />
//                 {editTaskImage && (
//                   <p className="text-sm text-green-600 mt-1">
//                     ✓ Nova imagem selecionada: {editTaskImage.name}
//                   </p>
//                 )}
//               </div>

//               {/* PREVIEW DO ÁUDIO ATUAL */}
//               {editingTask.audioUrl && (
//                 <div>
//                   <Label>Áudio Atual</Label>
//                   <div className="mt-2">
//                     <audio
//                       controls
//                       src={editingTask.audioUrl}
//                       className="w-full h-8"
//                     >
//                       Seu navegador não suporta o elemento de áudio.
//                     </audio>
//                     <div className="mt-1">
//                       <Badge variant="secondary">Atual</Badge>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {/* UPLOAD DE NOVO ÁUDIO */}
//               <div>
//                 <Label>
//                   <Mic className="w-4 h-4 inline mr-2" />
//                   {editingTask.audioUrl ? "Substituir Áudio" : "Adicionar Áudio"}
//                 </Label>

//                 {/* UPLOAD DE ÁUDIO (alternativo) */}
//                 <div className="mt-3">
//                   <Label htmlFor="edit-task-audio">Fazer upload de um arquivo de áudio</Label>
//                   <Input 
//                     id="edit-task-audio"
//                     type="file"
//                     accept="audio/*"
//                     onChange={(e) => setEditTaskAudio(e.target.files?.[0] || null)}
//                     className="mt-1"
//                   />
//                   {editTaskAudio && (
//                     <p className="text-sm text-green-600 mt-1">
//                       ✓ Novo áudio selecionado: {editTaskAudio.name}
//                     </p>
//                   )}
//                 </div>
//               </div>

//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <Label htmlFor="edit-task-dueDate">
//                     <Calendar className="w-4 h-4 inline mr-2" />
//                     Data e Hora de Vencimento
//                   </Label>
//                   <Input 
//                     id="edit-task-dueDate"
//                     type="datetime-local"
//                     value={editTaskDueDate} 
//                     onChange={e => setEditTaskDueDate(e.target.value)}
//                   />
//                 </div>

//                 <div>
//                   <Label htmlFor="edit-task-assignedTo">
//                     <User className="w-4 h-4 inline mr-2" />
//                     Responsável
//                   </Label>
//                   <select
//                     id="edit-task-assignedTo"
//                     value={editTaskAssignedTo}
//                     onChange={e => setEditTaskAssignedTo(e.target.value)}
//                     className="w-full p-2 border border-gray-300 rounded-md"
//                   >
//                     <option value="">Selecione um responsável</option>
//                     {professionals.map(professional => (
//                       <option key={professional.id} value={professional.id}>
//                         {professional.name}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               </div>

//               <div>
//                 <Label htmlFor="edit-task-status">Coluna</Label>
//                 <select
//                   id="edit-task-status"
//                   value={editTaskStatus}
//                   onChange={e => setEditTaskStatus(e.target.value)}
//                   className="w-full p-2 border border-gray-300 rounded-md"
//                 >
//                   <option value="">Sem etapa</option>
//                   {columns.map(column => (
//                     <option key={column.id} value={column.id}>
//                       {column.title}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div className="flex gap-2 justify-end pt-4">
//                 <Button 
//                   variant="outline" 
//                   onClick={() => {
//                     setIsEditTaskModal(false);
//                     setEditingTask(null);
//                     resetEditForm();
//                   }}
//                   disabled={isSubmitting}
//                 >
//                   Cancelar
//                 </Button>
//                 <Button 
//                   onClick={updateTask}
//                   disabled={!editTaskTitle.trim() || isSubmitting}
//                 >
//                   {isSubmitting ? (
//                     <>
//                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
//                       Atualizando...
//                     </>
//                   ) : (
//                     <>
//                       <Edit className="w-4 h-4 mr-2" /> Atualizar Tarefa
//                     </>
//                   )}
//                 </Button>
//               </div>
//             </div>
//           )}
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// }

// VERSAO 2 FUNCIONANDO BARRA DE ROLAGEM HORIZONTAL E COLUNA SEM ETAPA TIRADA
// "use client";
// import { useState, useEffect, useRef } from "react";
// import { Button } from "@/components/ui/button";
// import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
// import { Badge } from "@/components/ui/badge";
// import { Card, CardContent } from "@/components/ui/card";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
// } from "@/components/ui/dialog";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import {
//   Plus,
//   Filter,
//   MoreVertical,
//   Settings,
//   Trash2,
//   Edit,
//   Calendar,
//   User,
//   Mic,
//   Square,
//   Upload,
//   Clock,
//   X
// } from "lucide-react";

// const API_BASE = "http://localhost:3002";

// interface Professional {
//   id: string;
//   name: string;
// }

// interface Task {
//   id: string;
//   title: string;
//   code?: string;
//   imageUrl?: string;
//   audioUrl?: string;
//   fichaTecnica?: boolean;
//   assignedTo?: Professional;
//   statusId?: string | null;
//   description?: string;
//   dueDate?: string;
// }

// interface Column {
//   id: string;
//   title: string;
// }

// export default function ProductKanban() {
//   const [tasks, setTasks] = useState<Task[]>([]);
//   const [columns, setColumns] = useState<Column[]>([]);
//   const [professionals, setProfessionals] = useState<Professional[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [isColumnModal, setIsColumnModal] = useState(false);
//   const [isTaskModal, setIsTaskModal] = useState(false);
//   const [isEditTaskModal, setIsEditTaskModal] = useState(false);
//   const [editingCol, setEditingCol] = useState<Column | null>(null);
//   const [editingTask, setEditingTask] = useState<Task | null>(null);
//   const [colTitle, setColTitle] = useState("");

//   // Estados para o formulário de tarefa
//   const [taskTitle, setTaskTitle] = useState("");
//   const [taskDescription, setTaskDescription] = useState("");
//   const [taskDueDate, setTaskDueDate] = useState("");
//   const [taskAssignedTo, setTaskAssignedTo] = useState("");
//   const [taskStatus, setTaskStatus] = useState("");
//   const [taskImage, setTaskImage] = useState<File | null>(null);
//   const [taskAudio, setTaskAudio] = useState<File | null>(null);
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   // Estados para edição de tarefa
//   const [editTaskTitle, setEditTaskTitle] = useState("");
//   const [editTaskDescription, setEditTaskDescription] = useState("");
//   const [editTaskDueDate, setEditTaskDueDate] = useState("");
//   const [editTaskAssignedTo, setEditTaskAssignedTo] = useState("");
//   const [editTaskStatus, setEditTaskStatus] = useState("");
//   const [editTaskImage, setEditTaskImage] = useState<File | null>(null);
//   const [editTaskAudio, setEditTaskAudio] = useState<File | null>(null);

//   // Estados para gravação de áudio
//   const [isRecording, setIsRecording] = useState(false);
//   const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
//   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
//   const audioChunksRef = useRef<Blob[]>([]);
//   const [recordingTime, setRecordingTime] = useState(0);

//   const fetchColumns = async () => {
//     try {
//       const res = await fetch(`${API_BASE}/kanban-columns`);
//       const data = await res.json();
//       setColumns(data);
//     } catch (error) {
//       console.error('Erro ao buscar colunas:', error);
//     }
//   };

//   const fetchTasks = async () => {
//     try {
//       const res = await fetch(`${API_BASE}/tasks`);
//       const data = await res.json();
//       if (Array.isArray(data)) setTasks(data);
//       else if (data.tasks) setTasks(data.tasks);
//     } catch (error) {
//       console.error('Erro ao buscar tasks:', error);
//     }
//   };

//   const fetchProfessionals = async () => {
//     try {
//       const res = await fetch(`${API_BASE}/professionals`);
//       const data = await res.json();
//       setProfessionals(data);
//     } catch (error) {
//       console.error('Erro ao buscar profissionais:', error);
//     }
//   };

//   const loadInitialData = async () => {
//     setLoading(true);
//     try {
//       await Promise.all([fetchColumns(), fetchTasks(), fetchProfessionals()]);
//     } catch (error) {
//       console.error('Erro ao carregar dados:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadInitialData();
//   }, []);

//   // Temporizador para gravação
//   useEffect(() => {
//     let interval: NodeJS.Timeout | null = null;
//     if (isRecording) {
//       interval = setInterval(() => {
//         setRecordingTime((prev) => prev + 1);
//       }, 1000);
//     }
//     return () => {
//       if (interval) clearInterval(interval);
//     };
//   }, [isRecording]);

//   const handleDrop = async (e: React.DragEvent, statusId: string | null) => {
//     e.preventDefault();
//     const taskId = e.dataTransfer.getData("taskId");
//     if (!taskId) return;

//     const previousTasks = [...tasks];
//     setTasks(prev => prev.map(t =>
//       t.id === taskId ? { ...t, statusId } : t
//     ));

//     try {
//       await fetch(`${API_BASE}/tasks/${taskId}/status`, {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ status: statusId }),
//       });
//     } catch (error) {
//       console.error('Erro ao atualizar status:', error);
//       setTasks(previousTasks);
//     }
//   };

//   const saveColumn = async () => {
//     if (!colTitle.trim()) return;

//     try {
//       if (editingCol) {
//         await fetch(`${API_BASE}/kanban-columns/${editingCol.id}`, {
//           method: "PATCH",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ title: colTitle }),
//         });
//       } else {
//         await fetch(`${API_BASE}/kanban-columns`, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ title: colTitle }),
//         });
//       }

//       setIsColumnModal(false);
//       setColTitle("");
//       setEditingCol(null);
//       await fetchColumns();
//     } catch (error) {
//       console.error('Erro ao salvar coluna:', error);
//     }
//   };

//   // Funções de gravação de áudio
//   const startRecording = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//       mediaRecorderRef.current = new MediaRecorder(stream);
//       audioChunksRef.current = [];

//       mediaRecorderRef.current.ondataavailable = (event) => {
//         if (event.data.size > 0) {
//           audioChunksRef.current.push(event.data);
//         }
//       };

//       mediaRecorderRef.current.onstop = () => {
//         const audioBlob = new Blob(audioChunksRef.current, {
//           type: "audio/webm",
//         });
//         setAudioBlob(audioBlob);
//         setTaskAudio(new File([audioBlob], "recording.webm", { type: "audio/webm" }));
//       };

//       mediaRecorderRef.current.start();
//       setIsRecording(true);
//     } catch (error) {
//       console.error("Erro ao acessar o microfone:", error);
//       alert("Não foi possível acessar o microfone. Verifique as permissões.");
//     }
//   };

//   const stopRecording = () => {
//     if (mediaRecorderRef.current) {
//       mediaRecorderRef.current.stop();
//       setIsRecording(false);
//       setRecordingTime(0);
//       mediaRecorderRef.current.stream
//         .getTracks()
//         .forEach((track) => track.stop());
//     }
//   };

//   const createTask = async () => {
//     if (!taskTitle.trim()) {
//       alert("Título da tarefa é obrigatório");
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       const formData = new FormData();
//       formData.append("title", taskTitle);
//       formData.append("description", taskDescription);
//       formData.append("statusId", taskStatus || "");

//       if (taskDueDate) formData.append("dueDate", taskDueDate);
//       if (taskAssignedTo) formData.append("assignedToId", taskAssignedTo);

//       // Adicionar arquivos
//       if (taskImage) {
//         formData.append("files", taskImage);
//       }
//       if (taskAudio) {
//         formData.append("files", taskAudio);
//       }

//       console.log('📤 Criando nova task com arquivos...');

//       const response = await fetch(`${API_BASE}/tasks`, {
//         method: "POST",
//         body: formData,
//       });

//       if (!response.ok) {
//         throw new Error("Erro ao criar tarefa");
//       }

//       const newTask = await response.json();

//       // Atualizar a lista de tasks
//       setTasks(prev => [newTask, ...prev]);

//       // Resetar o formulário
//       resetTaskForm();
//       setIsTaskModal(false);

//       console.log("✅ Tarefa criada com sucesso:", newTask);
//     } catch (error) {
//       console.error("Erro ao criar tarefa:", error);
//       alert("Erro ao criar tarefa. Tente novamente.");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   // Função para abrir modal de edição
//   const openEditModal = (task: Task) => {
//     setEditingTask(task);
//     setEditTaskTitle(task.title);
//     setEditTaskDescription(task.description || "");
//     setEditTaskDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : "");
//     setEditTaskAssignedTo(task.assignedTo?.id || "");
//     setEditTaskStatus(task.statusId || "");
//     setEditTaskImage(null);
//     setEditTaskAudio(null);
//     setIsEditTaskModal(true);
//   };

//   // Função para editar tarefa
//   const updateTask = async () => {
//     if (!editingTask || !editTaskTitle.trim()) {
//       alert("Título da tarefa é obrigatório");
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       const formData = new FormData();
//       formData.append("title", editTaskTitle);
//       formData.append("description", editTaskDescription);
//       formData.append("statusId", editTaskStatus || "");

//       if (editTaskDueDate) formData.append("dueDate", editTaskDueDate);
//       if (editTaskAssignedTo) formData.append("assignedToId", editTaskAssignedTo);

//       // Adicionar novos arquivos (se houver)
//       if (editTaskImage) {
//         formData.append("files", editTaskImage);
//       }
//       if (editTaskAudio) {
//         formData.append("files", editTaskAudio);
//       }

//       console.log('📤 Atualizando task...');

//       const response = await fetch(`${API_BASE}/tasks/${editingTask.id}`, {
//         method: "PUT",
//         body: formData,
//       });

//       if (!response.ok) {
//         throw new Error("Erro ao atualizar tarefa");
//       }

//       const updatedTask = await response.json();

//       // Atualizar a lista de tasks
//       setTasks(prev => prev.map(t =>
//         t.id === editingTask.id ? updatedTask : t
//       ));

//       // Fechar modal e resetar
//       setIsEditTaskModal(false);
//       setEditingTask(null);
//       resetEditForm();

//       console.log("✅ Tarefa atualizada com sucesso:", updatedTask);
//     } catch (error) {
//       console.error("Erro ao atualizar tarefa:", error);
//       alert("Erro ao atualizar tarefa. Tente novamente.");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   // Função para deletar tarefa
//   const deleteTask = async (taskId: string) => {
//     if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;

//     try {
//       const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
//         method: "DELETE",
//       });

//       if (response.ok) {
//         // Remover da lista local
//         setTasks(prev => prev.filter(t => t.id !== taskId));
//         console.log("✅ Tarefa excluída com sucesso");
//       } else {
//         throw new Error("Erro ao excluir tarefa");
//       }
//     } catch (error) {
//       console.error("Erro ao excluir tarefa:", error);
//       alert("Erro ao excluir tarefa. Tente novamente.");
//     }
//   };

//   const resetTaskForm = () => {
//     setTaskTitle("");
//     setTaskDescription("");
//     setTaskDueDate("");
//     setTaskAssignedTo("");
//     setTaskStatus("");
//     setTaskImage(null);
//     setTaskAudio(null);
//     setAudioBlob(null);
//     setRecordingTime(0);
//     if (mediaRecorderRef.current) {
//       mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
//     }
//   };

//   const resetEditForm = () => {
//     setEditTaskTitle("");
//     setEditTaskDescription("");
//     setEditTaskDueDate("");
//     setEditTaskAssignedTo("");
//     setEditTaskStatus("");
//     setEditTaskImage(null);
//     setEditTaskAudio(null);
//     setAudioBlob(null);
//     setRecordingTime(0);
//   };

//   const deleteColumn = async (id: string) => {
//     if (!confirm("Excluir coluna? Todas as tasks desta coluna ficarão sem coluna.")) return;
//     try {
//       await fetch(`${API_BASE}/kanban-columns/${id}`, { method: "DELETE" });
//       await Promise.all([fetchColumns(), fetchTasks()]);
//     } catch (error) {
//       console.error('Erro ao excluir coluna:', error);
//     }
//   };

//   // Função para formatar a data com hora
//   const formatDateTime = (dateString: string) => {
//     if (!dateString) return "";

//     try {
//       const date = new Date(dateString);
//       return date.toLocaleString('pt-BR', {
//         day: '2-digit',
//         month: '2-digit',
//         year: 'numeric',
//         hour: '2-digit',
//         minute: '2-digit'
//       });
//     } catch (error) {
//       return dateString;
//     }
//   };

//   // Função para verificar se a data está atrasada
//   const isOverdue = (dateString: string) => {
//     if (!dateString) return false;
//     try {
//       const dueDate = new Date(dateString);
//       const today = new Date();
//       return dueDate < today;
//     } catch (error) {
//       return false;
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex h-screen items-center justify-center">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* HEADER ROXO */}
//       <div className="bg-purple-600 text-white px-6 py-4 flex justify-between items-center shadow-lg">
//         <div className="flex items-center gap-4">
//           <h1 className="text-2xl font-bold">KANBAN DE DESENVOLVIMENTO DE PRODUTOS MARCA</h1>
//           <Badge className="bg-white/20">
//             {columns.length} coluna{columns.length !== 1 ? 's' : ''}
//           </Badge>
//         </div>
//         <div className="flex gap-3">
//           <Button
//             onClick={() => {
//               setEditingCol(null);
//               setColTitle("");
//               setIsColumnModal(true);
//             }}
//             variant="secondary"
//             className="bg-white/20 hover:bg-white/30"
//           >
//             <Settings className="w-4 h-4 mr-2" /> Gerenciar Colunas
//           </Button>

//           {/* BOTÃO NOVO - CRIAR TAREFA */}
//           <Button
//             onClick={() => setIsTaskModal(true)}
//             variant="secondary"
//             className="bg-green-600 hover:bg-green-700 text-white"
//           >
//             <Plus className="w-4 h-4 mr-2" /> Nova Tarefa
//           </Button>

//           <Button variant="secondary" className="bg-white/20 hover:bg-white/30">
//             <Filter className="w-4 h-4 mr-2" /> FILTRAR
//           </Button>
//         </div>
//       </div>

//       {/* CONTAINER PRINCIPAL COM SCROLL HORIZONTAL */}
//       <div className="w-full overflow-x-auto">
//         <div className="flex gap-6 p-6 min-w-max">
//           {/* COLUNAS CRIADAS PELO USUÁRIO */}
//           {columns.map(col => (
//             <div
//               key={col.id}
//               className="w-80 flex-shrink-0"
//               onDragOver={e => e.preventDefault()}
//               onDrop={e => handleDrop(e, col.id)}
//             >
//               <div className="bg-gray-200 rounded-t-lg px-4 py-3 flex justify-between items-center">
//                 <h3 className="font-semibold">{col.title}</h3>
//                 <div className="flex items-center gap-2">
//                   <Badge className="bg-gray-300 text-gray-700">
//                     {tasks.filter(t => t.statusId === col.id).length}
//                   </Badge>
//                   <DropdownMenu>
//                     <DropdownMenuTrigger asChild>
//                       <Button variant="ghost" size="icon" className="h-6 w-6">
//                         <MoreVertical className="w-4 h-4" />
//                       </Button>
//                     </DropdownMenuTrigger>
//                     <DropdownMenuContent>
//                       <DropdownMenuItem
//                         onClick={() => {
//                           setEditingCol(col);
//                           setColTitle(col.title);
//                           setIsColumnModal(true);
//                         }}
//                       >
//                         <Edit className="w-4 h-4 mr-2" /> Renomear
//                       </DropdownMenuItem>
//                       <DropdownMenuItem
//                         className="text-red-600"
//                         onClick={() => deleteColumn(col.id)}
//                       >
//                         <Trash2 className="w-4 h-4 mr-2" /> Excluir
//                       </DropdownMenuItem>
//                     </DropdownMenuContent>
//                   </DropdownMenu>
//                 </div>
//               </div>

//               <div className="bg-gray-100 rounded-b-lg p-4 space-y-4 min-h-[600px]">
//                 {tasks
//                   .filter(t => t.statusId === col.id)
//                   .map(task => (
//                     <Card
//                       key={task.id}
//                       draggable
//                       onDragStart={e => e.dataTransfer.setData("taskId", task.id)}
//                       className="bg-white shadow-md hover:shadow-xl cursor-grab active:cursor-grabbing transition-shadow"
//                     >
//                       <CardContent className="p-3">
//                         {/* Menu de opções da task */}
//                         <div className="flex justify-end mb-2">
//                           <DropdownMenu>
//                             <DropdownMenuTrigger asChild>
//                               <Button variant="ghost" size="icon" className="h-6 w-6">
//                                 <MoreVertical className="w-4 h-4" />
//                               </Button>
//                             </DropdownMenuTrigger>
//                             <DropdownMenuContent>
//                               <DropdownMenuItem
//                                 onClick={() => openEditModal(task)}
//                               >
//                                 <Edit className="w-4 h-4 mr-2" /> Editar
//                               </DropdownMenuItem>
//                               <DropdownMenuItem
//                                 className="text-red-600"
//                                 onClick={() => deleteTask(task.id)}
//                               >
//                                 <Trash2 className="w-4 h-4 mr-2" /> Excluir
//                               </DropdownMenuItem>
//                             </DropdownMenuContent>
//                           </DropdownMenu>
//                         </div>

//                         {task.imageUrl ? (
//                           <img
//                             src={task.imageUrl}
//                             alt={task.title}
//                             className="w-full h-48 object-cover rounded-md mb-3"
//                           />
//                         ) : (
//                           <div className="bg-gray-200 border-2 border-dashed h-48 rounded-md mb-3 flex items-center justify-center text-gray-400">
//                             Sem imagem
//                           </div>
//                         )}

//                         <div className="flex justify-between items-start mb-2">
//                           <h4 className="font-semibold text-lg flex-1 mr-2">{task.title}</h4>
//                           <span className="text-sm text-gray-500 shrink-0">#{task.code || task.id.slice(0, 4).toUpperCase()}</span>
//                         </div>

//                         {task.description && (
//                           <p className="text-sm text-gray-600 mb-3 line-clamp-2">
//                             {task.description}
//                           </p>
//                         )}

//                         {/* DATA E HORA DE VENCIMENTO */}
//                         {task.dueDate && (
//                           <div className="mb-3">
//                             <div className="flex items-center space-x-1 text-sm">
//                               <Clock className="w-3 h-3 text-gray-500" />
//                               <span className={`font-medium ${isOverdue(task.dueDate) ? 'text-red-600' : 'text-gray-700'
//                                 }`}>
//                                 {formatDateTime(task.dueDate)}
//                               </span>
//                               {isOverdue(task.dueDate) && (
//                                 <Badge variant="destructive" className="ml-2 text-xs">
//                                   Atrasado
//                                 </Badge>
//                               )}
//                             </div>
//                           </div>
//                         )}

//                         {task.audioUrl && (
//                           <div className="mb-3">
//                             <audio
//                               controls
//                               src={task.audioUrl}
//                               className="w-full h-8"
//                             >
//                               Seu navegador não suporta o elemento de áudio.
//                             </audio>
//                           </div>
//                         )}

//                         <div className="flex justify-between items-center">
//                           <Badge variant={task.fichaTecnica ? "default" : "secondary"}>
//                             Ficha Técnica
//                           </Badge>
//                           {task.assignedTo && (
//                             <div className="flex items-center gap-2 bg-purple-100 px-3 py-1 rounded-full">
//                               <User className="w-3 h-3 text-purple-600" />
//                               <span className="text-xs font-medium text-purple-700">
//                                 {task.assignedTo.name}
//                               </span>
//                             </div>
//                           )}
//                         </div>
//                       </CardContent>
//                     </Card>
//                   ))}
//               </div>
//             </div>
//           ))}

//           {/* MENSAGEM QUANDO NÃO HÁ COLUNAS */}
//           {columns.length === 0 && (
//             <div className="w-80 flex-shrink-0">
//               <div className="bg-gray-200 rounded-t-lg px-4 py-3">
//                 <h3 className="font-semibold text-gray-600">Nenhuma coluna criada</h3>
//               </div>
//               <div className="bg-gray-100 rounded-b-lg p-4 min-h-[600px] flex items-center justify-center">
//                 <div className="text-center text-gray-500">
//                   <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
//                   <p className="mb-2">Nenhuma coluna criada ainda</p>
//                   <Button
//                     onClick={() => {
//                       setEditingCol(null);
//                       setColTitle("");
//                       setIsColumnModal(true);
//                     }}
//                     variant="outline"
//                   >
//                     <Plus className="w-4 h-4 mr-2" /> Criar Primeira Coluna
//                   </Button>
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* MODAL CRIAR COLUNA */}
//       <Dialog open={isColumnModal} onOpenChange={setIsColumnModal}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>{editingCol ? "Editar" : "Nova"} Coluna</DialogTitle>
//           </DialogHeader>
//           <div className="space-y-4">
//             <div>
//               <Label htmlFor="column-title">Título</Label>
//               <Input
//                 id="column-title"
//                 value={colTitle}
//                 onChange={e => setColTitle(e.target.value)}
//                 placeholder="Digite o título da coluna"
//                 onKeyDown={(e) => {
//                   if (e.key === 'Enter') saveColumn();
//                 }}
//               />
//             </div>
//             <div className="flex gap-2 justify-end">
//               <Button
//                 variant="outline"
//                 onClick={() => setIsColumnModal(false)}
//               >
//                 Cancelar
//               </Button>
//               <Button onClick={saveColumn}>
//                 {editingCol ? "Atualizar" : "Criar"} Coluna
//               </Button>
//             </div>
//           </div>
//         </DialogContent>
//       </Dialog>

//       {/* MODAL CRIAR TAREFA */}
//       <Dialog open={isTaskModal} onOpenChange={setIsTaskModal}>
//         <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
//           <DialogHeader>
//             <DialogTitle>Criar Nova Tarefa</DialogTitle>
//             <DialogDescription>
//               Preencha os detalhes da nova tarefa
//             </DialogDescription>
//           </DialogHeader>
//           <div className="space-y-4">
//             <div>
//               <Label htmlFor="task-title">Título *</Label>
//               <Input
//                 id="task-title"
//                 value={taskTitle}
//                 onChange={e => setTaskTitle(e.target.value)}
//                 placeholder="Digite o título da tarefa"
//               />
//             </div>

//             <div>
//               <Label htmlFor="task-description">Descrição</Label>
//               <Textarea
//                 id="task-description"
//                 value={taskDescription}
//                 onChange={e => setTaskDescription(e.target.value)}
//                 placeholder="Descreva a tarefa..."
//                 rows={3}
//               />
//             </div>

//             {/* UPLOAD DE IMAGEM */}
//             <div>
//               <Label htmlFor="task-image">
//                 <Upload className="w-4 h-4 inline mr-2" />
//                 Imagem
//               </Label>
//               <Input
//                 id="task-image"
//                 type="file"
//                 accept="image/*"
//                 onChange={(e) => setTaskImage(e.target.files?.[0] || null)}
//                 className="mt-1"
//               />
//               {taskImage && (
//                 <p className="text-sm text-green-600 mt-1">
//                   ✓ {taskImage.name}
//                 </p>
//               )}
//             </div>

//             {/* GRAVAÇÃO DE ÁUDIO */}
//             <div>
//               <Label>
//                 <Mic className="w-4 h-4 inline mr-2" />
//                 Gravação de Áudio
//               </Label>
//               <div className="flex items-center space-x-3 mt-2">
//                 <Button
//                   type="button"
//                   onClick={isRecording ? stopRecording : startRecording}
//                   variant={isRecording ? "destructive" : "outline"}
//                   size="sm"
//                 >
//                   {isRecording ? <Square className="w-4 h-4 mr-1" /> : <Mic className="w-4 h-4 mr-1" />}
//                   {isRecording ? "Parar" : "Gravar"}
//                 </Button>

//                 {isRecording && (
//                   <div className="flex items-center space-x-2">
//                     <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
//                     <span className="text-sm text-gray-600 font-mono">
//                       {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")}
//                     </span>
//                   </div>
//                 )}
//               </div>

//               {audioBlob && (
//                 <div className="mt-3">
//                   <audio
//                     controls
//                     className="w-full h-8"
//                     src={URL.createObjectURL(audioBlob)}
//                   >
//                     Seu navegador não suporta o elemento de áudio.
//                   </audio>
//                 </div>
//               )}

//               {/* UPLOAD DE ÁUDIO (alternativo) */}
//               <div className="mt-3">
//                 <Label htmlFor="task-audio">Ou faça upload de um arquivo de áudio</Label>
//                 <Input
//                   id="task-audio"
//                   type="file"
//                   accept="audio/*"
//                   onChange={(e) => setTaskAudio(e.target.files?.[0] || null)}
//                   className="mt-1"
//                 />
//                 {taskAudio && !audioBlob && (
//                   <p className="text-sm text-green-600 mt-1">
//                     ✓ {taskAudio.name}
//                   </p>
//                 )}
//               </div>
//             </div>

//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <Label htmlFor="task-dueDate">
//                   <Calendar className="w-4 h-4 inline mr-2" />
//                   Data e Hora de Vencimento
//                 </Label>
//                 <Input
//                   id="task-dueDate"
//                   type="datetime-local"
//                   value={taskDueDate}
//                   onChange={e => setTaskDueDate(e.target.value)}
//                 />
//               </div>

//               <div>
//                 <Label htmlFor="task-assignedTo">
//                   <User className="w-4 h-4 inline mr-2" />
//                   Responsável
//                 </Label>
//                 <select
//                   id="task-assignedTo"
//                   value={taskAssignedTo}
//                   onChange={e => setTaskAssignedTo(e.target.value)}
//                   className="w-full p-2 border border-gray-300 rounded-md"
//                 >
//                   <option value="">Selecione um responsável</option>
//                   {professionals.map(professional => (
//                     <option key={professional.id} value={professional.id}>
//                       {professional.name}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//             </div>

//             <div>
//               <Label htmlFor="task-status">Coluna</Label>
//               <select
//                 id="task-status"
//                 value={taskStatus}
//                 onChange={e => setTaskStatus(e.target.value)}
//                 className="w-full p-2 border border-gray-300 rounded-md"
//               >
//                 <option value="">Nenhuma coluna</option>
//                 {columns.map(column => (
//                   <option key={column.id} value={column.id}>
//                     {column.title}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <div className="flex gap-2 justify-end pt-4">
//               <Button
//                 variant="outline"
//                 onClick={() => {
//                   setIsTaskModal(false);
//                   resetTaskForm();
//                 }}
//                 disabled={isSubmitting}
//               >
//                 Cancelar
//               </Button>
//               <Button
//                 onClick={createTask}
//                 disabled={!taskTitle.trim() || isSubmitting}
//               >
//                 {isSubmitting ? (
//                   <>
//                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
//                     Criando...
//                   </>
//                 ) : (
//                   <>
//                     <Plus className="w-4 h-4 mr-2" /> Criar Tarefa
//                   </>
//                 )}
//               </Button>
//             </div>
//           </div>
//         </DialogContent>
//       </Dialog>

//       {/* MODAL EDITAR TAREFA */}
//       <Dialog open={isEditTaskModal} onOpenChange={setIsEditTaskModal}>
//         <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
//           <DialogHeader>
//             <DialogTitle>Editar Tarefa</DialogTitle>
//             <DialogDescription>
//               Edite os detalhes da tarefa
//             </DialogDescription>
//           </DialogHeader>
//           {editingTask && (
//             <div className="space-y-4">
//               <div>
//                 <Label htmlFor="edit-task-title">Título *</Label>
//                 <Input
//                   id="edit-task-title"
//                   value={editTaskTitle}
//                   onChange={e => setEditTaskTitle(e.target.value)}
//                   placeholder="Digite o título da tarefa"
//                 />
//               </div>

//               <div>
//                 <Label htmlFor="edit-task-description">Descrição</Label>
//                 <Textarea
//                   id="edit-task-description"
//                   value={editTaskDescription}
//                   onChange={e => setEditTaskDescription(e.target.value)}
//                   placeholder="Descreva a tarefa..."
//                   rows={3}
//                 />
//               </div>

//               {/* PREVIEW DA IMAGEM ATUAL */}
//               {editingTask.imageUrl && (
//                 <div>
//                   <Label>Imagem Atual</Label>
//                   <div className="mt-2 relative">
//                     <img
//                       src={editingTask.imageUrl}
//                       alt="Imagem atual"
//                       className="w-full h-48 object-cover rounded-md border"
//                     />
//                     <div className="absolute top-2 right-2">
//                       <Badge variant="secondary">Atual</Badge>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {/* UPLOAD DE NOVA IMAGEM */}
//               <div>
//                 <Label htmlFor="edit-task-image">
//                   <Upload className="w-4 h-4 inline mr-2" />
//                   {editingTask.imageUrl ? "Substituir Imagem" : "Adicionar Imagem"}
//                 </Label>
//                 <Input
//                   id="edit-task-image"
//                   type="file"
//                   accept="image/*"
//                   onChange={(e) => setEditTaskImage(e.target.files?.[0] || null)}
//                   className="mt-1"
//                 />
//                 {editTaskImage && (
//                   <p className="text-sm text-green-600 mt-1">
//                     ✓ Nova imagem selecionada: {editTaskImage.name}
//                   </p>
//                 )}
//               </div>

//               {/* PREVIEW DO ÁUDIO ATUAL */}
//               {editingTask.audioUrl && (
//                 <div>
//                   <Label>Áudio Atual</Label>
//                   <div className="mt-2">
//                     <audio
//                       controls
//                       src={editingTask.audioUrl}
//                       className="w-full h-8"
//                     >
//                       Seu navegador não suporta o elemento de áudio.
//                     </audio>
//                     <div className="mt-1">
//                       <Badge variant="secondary">Atual</Badge>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {/* UPLOAD DE NOVO ÁUDIO */}
//               <div>
//                 <Label>
//                   <Mic className="w-4 h-4 inline mr-2" />
//                   {editingTask.audioUrl ? "Substituir Áudio" : "Adicionar Áudio"}
//                 </Label>

//                 {/* UPLOAD DE ÁUDIO (alternativo) */}
//                 <div className="mt-3">
//                   <Label htmlFor="edit-task-audio">Fazer upload de um arquivo de áudio</Label>
//                   <Input
//                     id="edit-task-audio"
//                     type="file"
//                     accept="audio/*"
//                     onChange={(e) => setEditTaskAudio(e.target.files?.[0] || null)}
//                     className="mt-1"
//                   />
//                   {editTaskAudio && (
//                     <p className="text-sm text-green-600 mt-1">
//                       ✓ Novo áudio selecionado: {editTaskAudio.name}
//                     </p>
//                   )}
//                 </div>
//               </div>

//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <Label htmlFor="edit-task-dueDate">
//                     <Calendar className="w-4 h-4 inline mr-2" />
//                     Data e Hora de Vencimento
//                   </Label>
//                   <Input
//                     id="edit-task-dueDate"
//                     type="datetime-local"
//                     value={editTaskDueDate}
//                     onChange={e => setEditTaskDueDate(e.target.value)}
//                   />
//                 </div>

//                 <div>
//                   <Label htmlFor="edit-task-assignedTo">
//                     <User className="w-4 h-4 inline mr-2" />
//                     Responsável
//                   </Label>
//                   <select
//                     id="edit-task-assignedTo"
//                     value={editTaskAssignedTo}
//                     onChange={e => setEditTaskAssignedTo(e.target.value)}
//                     className="w-full p-2 border border-gray-300 rounded-md"
//                   >
//                     <option value="">Selecione um responsável</option>
//                     {professionals.map(professional => (
//                       <option key={professional.id} value={professional.id}>
//                         {professional.name}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               </div>

//               <div>
//                 <Label htmlFor="edit-task-status">Coluna</Label>
//                 <select
//                   id="edit-task-status"
//                   value={editTaskStatus}
//                   onChange={e => setEditTaskStatus(e.target.value)}
//                   className="w-full p-2 border border-gray-300 rounded-md"
//                 >
//                   <option value="">Nenhuma coluna</option>
//                   {columns.map(column => (
//                     <option key={column.id} value={column.id}>
//                       {column.title}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div className="flex gap-2 justify-end pt-4">
//                 <Button
//                   variant="outline"
//                   onClick={() => {
//                     setIsEditTaskModal(false);
//                     setEditingTask(null);
//                     resetEditForm();
//                   }}
//                   disabled={isSubmitting}
//                 >
//                   Cancelar
//                 </Button>
//                 <Button
//                   onClick={updateTask}
//                   disabled={!editTaskTitle.trim() || isSubmitting}
//                 >
//                   {isSubmitting ? (
//                     <>
//                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
//                       Atualizando...
//                     </>
//                   ) : (
//                     <>
//                       <Edit className="w-4 h-4 mr-2" /> Atualizar Tarefa
//                     </>
//                   )}
//                 </Button>
//               </div>
//             </div>
//           )}
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// }

// VERSAO COM COLUMN.MAP CORRIGIDDO
"use client";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Filter,
  MoreVertical,
  Settings,
  Trash2,
  Edit,
  Calendar,
  User,
  Mic,
  Square,
  Upload,
  Clock,
} from "lucide-react";

const API_BASE = "http://localhost:3002";

interface Professional {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
  code?: string;
  imageUrl?: string;
  audioUrl?: string;
  fichaTecnica?: boolean;
  assignedTo?: Professional;
  statusId?: string | null;
  description?: string;
  dueDate?: string;
}

interface Column {
  id: string;
  title: string;
}

export default function ProductKanban() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [isColumnModal, setIsColumnModal] = useState(false);
  const [isTaskModal, setIsTaskModal] = useState(false);
  const [isEditTaskModal, setIsEditTaskModal] = useState(false);
  const [editingCol, setEditingCol] = useState<Column | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [colTitle, setColTitle] = useState("");

  // Estados para o formulário de tarefa
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskAssignedTo, setTaskAssignedTo] = useState("");
  const [taskStatus, setTaskStatus] = useState("");
  const [taskImage, setTaskImage] = useState<File | null>(null);
  const [taskAudio, setTaskAudio] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para edição de tarefa
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDescription, setEditTaskDescription] = useState("");
  const [editTaskDueDate, setEditTaskDueDate] = useState("");
  const [editTaskAssignedTo, setEditTaskAssignedTo] = useState("");
  const [editTaskStatus, setEditTaskStatus] = useState("");
  const [editTaskImage, setEditTaskImage] = useState<File | null>(null);
  const [editTaskAudio, setEditTaskAudio] = useState<File | null>(null);

  // Estados para gravação de áudio
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);

  // 🔥 CORREÇÃO: Função para garantir que columns seja sempre um array
  const fetchColumns = async () => {
    try {
      const res = await fetch(`${API_BASE}/kanban-columns`);
      const data = await res.json();

      // 🔥 GARANTIR que data seja um array
      if (Array.isArray(data)) {
        setColumns(data);
      } else if (data && Array.isArray(data.columns)) {
        setColumns(data.columns);
      } else if (data && typeof data === 'object') {
        // Se for um objeto, tentar extrair um array
        const possibleArray = Object.values(data).find(val => Array.isArray(val));
        setColumns(possibleArray || []);
      } else {
        console.warn('Dados de colunas inesperados:', data);
        setColumns([]);
      }
    } catch (error) {
      console.error('Erro ao buscar colunas:', error);
      setColumns([]); // 🔥 Garantir array vazio em caso de erro
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_BASE}/tasks`);
      const data = await res.json();

      // 🔥 CORREÇÃO: Garantir que tasks seja sempre um array
      if (Array.isArray(data)) {
        setTasks(data);
      } else if (data && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
      } else {
        console.warn('Dados de tasks inesperados:', data);
        setTasks([]);
      }
    } catch (error) {
      console.error('Erro ao buscar tasks:', error);
      setTasks([]);
    }
  };

  const fetchProfessionals = async () => {
    try {
      const res = await fetch(`${API_BASE}/professionals`);
      const data = await res.json();

      // 🔥 CORREÇÃO: Garantir que professionals seja sempre um array
      if (Array.isArray(data)) {
        setProfessionals(data);
      } else {
        console.warn('Dados de profissionais inesperados:', data);
        setProfessionals([]);
      }
    } catch (error) {
      console.error('Erro ao buscar profissionais:', error);
      setProfessionals([]);
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchColumns(), fetchTasks(), fetchProfessionals()]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Temporizador para gravação
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const handleDrop = async (e: React.DragEvent, statusId: string | null) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;

    const previousTasks = [...tasks];
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, statusId } : t
    ));

    try {
      await fetch(`${API_BASE}/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusId }),
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      setTasks(previousTasks);
    }
  };

  const saveColumn = async () => {
    if (!colTitle.trim()) return;

    try {
      if (editingCol) {
        await fetch(`${API_BASE}/kanban-columns/${editingCol.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: colTitle }),
        });
      } else {
        await fetch(`${API_BASE}/kanban-columns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: colTitle }),
        });
      }

      setIsColumnModal(false);
      setColTitle("");
      setEditingCol(null);
      await fetchColumns();
    } catch (error) {
      console.error('Erro ao salvar coluna:', error);
    }
  };

  // Funções de gravação de áudio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        setAudioBlob(audioBlob);
        setTaskAudio(new File([audioBlob], "recording.webm", { type: "audio/webm" }));
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Erro ao acessar o microfone:", error);
      alert("Não foi possível acessar o microfone. Verifique as permissões.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  const createTask = async () => {
    if (!taskTitle.trim()) {
      alert("Título da tarefa é obrigatório");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("title", taskTitle);
      formData.append("description", taskDescription);
      formData.append("statusId", taskStatus || "");

      if (taskDueDate) formData.append("dueDate", taskDueDate);
      if (taskAssignedTo) formData.append("assignedToId", taskAssignedTo);

      // Adicionar arquivos
      if (taskImage) {
        formData.append("files", taskImage);
      }
      if (taskAudio) {
        formData.append("files", taskAudio);
      }

      console.log('📤 Criando nova task com arquivos...');

      const response = await fetch(`${API_BASE}/tasks`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Erro ao criar tarefa");
      }

      const newTask = await response.json();

      // Atualizar a lista de tasks
      setTasks(prev => [newTask, ...prev]);

      // Resetar o formulário
      resetTaskForm();
      setIsTaskModal(false);

      console.log("✅ Tarefa criada com sucesso:", newTask);
    } catch (error) {
      console.error("Erro ao criar tarefa:", error);
      alert("Erro ao criar tarefa. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função para abrir modal de edição
  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditTaskTitle(task.title);
    setEditTaskDescription(task.description || "");
    setEditTaskDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : "");
    setEditTaskAssignedTo(task.assignedTo?.id || "");
    setEditTaskStatus(task.statusId || "");
    setEditTaskImage(null);
    setEditTaskAudio(null);
    setIsEditTaskModal(true);
  };

  // Função para editar tarefa
  const updateTask = async () => {
    if (!editingTask || !editTaskTitle.trim()) {
      alert("Título da tarefa é obrigatório");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("title", editTaskTitle);
      formData.append("description", editTaskDescription);
      formData.append("statusId", editTaskStatus || "");

      if (editTaskDueDate) formData.append("dueDate", editTaskDueDate);
      if (editTaskAssignedTo) formData.append("assignedToId", editTaskAssignedTo);

      // Adicionar novos arquivos (se houver)
      if (editTaskImage) {
        formData.append("files", editTaskImage);
      }
      if (editTaskAudio) {
        formData.append("files", editTaskAudio);
      }

      console.log('📤 Atualizando task...');

      const response = await fetch(`${API_BASE}/tasks/${editingTask.id}`, {
        method: "PUT",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar tarefa");
      }

      const updatedTask = await response.json();

      // Atualizar a lista de tasks
      setTasks(prev => prev.map(t =>
        t.id === editingTask.id ? updatedTask : t
      ));

      // Fechar modal e resetar
      setIsEditTaskModal(false);
      setEditingTask(null);
      resetEditForm();

      console.log("✅ Tarefa atualizada com sucesso:", updatedTask);
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
      alert("Erro ao atualizar tarefa. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função para deletar tarefa
  const deleteTask = async (taskId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;

    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remover da lista local
        setTasks(prev => prev.filter(t => t.id !== taskId));
        console.log("✅ Tarefa excluída com sucesso");
      } else {
        throw new Error("Erro ao excluir tarefa");
      }
    } catch (error) {
      console.error("Erro ao excluir tarefa:", error);
      alert("Erro ao excluir tarefa. Tente novamente.");
    }
  };

  const resetTaskForm = () => {
    setTaskTitle("");
    setTaskDescription("");
    setTaskDueDate("");
    setTaskAssignedTo("");
    setTaskStatus("");
    setTaskImage(null);
    setTaskAudio(null);
    setAudioBlob(null);
    setRecordingTime(0);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const resetEditForm = () => {
    setEditTaskTitle("");
    setEditTaskDescription("");
    setEditTaskDueDate("");
    setEditTaskAssignedTo("");
    setEditTaskStatus("");
    setEditTaskImage(null);
    setEditTaskAudio(null);
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const deleteColumn = async (id: string) => {
    if (!confirm("Excluir coluna? Todas as tasks desta coluna ficarão sem coluna.")) return;
    try {
      await fetch(`${API_BASE}/kanban-columns/${id}`, { method: "DELETE" });
      await Promise.all([fetchColumns(), fetchTasks()]);
    } catch (error) {
      console.error('Erro ao excluir coluna:', error);
    }
  };

  // Função para formatar a data com hora
  const formatDateTime = (dateString: string) => {
    if (!dateString) return "";

    try {
      const date = new Date(dateString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Função para verificar se a data está atrasada
  const isOverdue = (dateString: string) => {
    if (!dateString) return false;
    try {
      const dueDate = new Date(dateString);
      const today = new Date();
      return dueDate < today;
    } catch (error) {
      return false;
    }
  };

  // 🔥 CORREÇÃO: Verificar se columns é um array antes de renderizar
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600"></div>
      </div>
    );
  }

  // 🔥 CORREÇÃO: Garantir que columns seja um array
  const safeColumns = Array.isArray(columns) ? columns : [];

  return (
    <div className="p-6">
      <div className="min-h-screen bg-gray-50">
        {/* HEADER ROXO */}
        <div className="bg-purple-600 text-white px-6 py-4 flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">KANBAN DE DESENVOLVIMENTO DE PRODUTOS MARCA</h1>
            <Badge className="bg-white/20">
              {safeColumns.length} coluna{safeColumns.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setEditingCol(null);
                setColTitle("");
                setIsColumnModal(true);
              }}
              variant="secondary"
              className="bg-white/20 hover:bg-white/30"
            >
              <Settings className="w-4 h-4 mr-2" /> Gerenciar Colunas
            </Button>

            {/* BOTÃO NOVO - CRIAR TAREFA */}
            <Button
              onClick={() => setIsTaskModal(true)}
              variant="secondary"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" /> Nova Tarefa
            </Button>

            <Button variant="secondary" className="bg-white/20 hover:bg-white/30">
              <Filter className="w-4 h-4 mr-2" /> FILTRAR
            </Button>
          </div>
        </div>

        {/* CONTAINER PRINCIPAL COM SCROLL HORIZONTAL */}
        <div className="w-full overflow-x-auto">
          <div className="flex gap-6 p-6 min-w-max">
            {/* 🔥 CORREÇÃO: Usar safeColumns em vez de columns */}
            {safeColumns.map(col => (
              <div
                key={col.id}
                className="w-80 flex-shrink-0"
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDrop(e, col.id)}
              >
                <div className="bg-gray-200 rounded-t-lg px-4 py-3 flex justify-between items-center">
                  <h3 className="font-semibold">{col.title}</h3>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-gray-300 text-gray-700">
                      {tasks.filter(t => t.statusId === col.id).length}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingCol(col);
                            setColTitle(col.title);
                            setIsColumnModal(true);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" /> Renomear
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => deleteColumn(col.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="bg-gray-100 rounded-b-lg p-4 space-y-4 min-h-[600px]">
                  {tasks
                    .filter(t => t.statusId === col.id)
                    .map(task => (
                      <Card
                        key={task.id}
                        draggable
                        onDragStart={e => e.dataTransfer.setData("taskId", task.id)}
                        className="bg-white shadow-md hover:shadow-xl cursor-grab active:cursor-grabbing transition-shadow"
                      >
                        <CardContent className="p-3">
                          {/* Menu de opções da task */}
                          <div className="flex justify-end mb-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem
                                  onClick={() => openEditModal(task)}
                                >
                                  <Edit className="w-4 h-4 mr-2" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => deleteTask(task.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {task.imageUrl ? (
                            <img
                              src={task.imageUrl}
                              alt={task.title}
                              className="w-full h-48 object-cover rounded-md mb-3"
                            />
                          ) : (
                            <div className="bg-gray-200 border-2 border-dashed h-48 rounded-md mb-3 flex items-center justify-center text-gray-400">
                              Sem imagem
                            </div>
                          )}

                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-lg flex-1 mr-2">{task.title}</h4>
                            <span className="text-sm text-gray-500 shrink-0">#{task.code || task.id.slice(0, 4).toUpperCase()}</span>
                          </div>

                          {task.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          {/* DATA E HORA DE VENCIMENTO */}
                          {task.dueDate && (
                            <div className="mb-3">
                              <div className="flex items-center space-x-1 text-sm">
                                <Clock className="w-3 h-3 text-gray-500" />
                                <span className={`font-medium ${isOverdue(task.dueDate) ? 'text-red-600' : 'text-gray-700'
                                  }`}>
                                  {formatDateTime(task.dueDate)}
                                </span>
                                {isOverdue(task.dueDate) && (
                                  <Badge variant="destructive" className="ml-2 text-xs">
                                    Atrasado
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                          {task.audioUrl && (
                            <div className="mb-3">
                              <audio
                                controls
                                src={task.audioUrl}
                                className="w-full h-8"
                              >
                                Seu navegador não suporta o elemento de áudio.
                              </audio>
                            </div>
                          )}

                          <div className="flex justify-between items-center">
                            <Badge variant={task.fichaTecnica ? "default" : "secondary"}>
                              Ficha Técnica
                            </Badge>
                            {task.assignedTo && (
                              <div className="flex items-center gap-2 bg-purple-100 px-3 py-1 rounded-full">
                                <User className="w-3 h-3 text-purple-600" />
                                <span className="text-xs font-medium text-purple-700">
                                  {task.assignedTo.name}
                                </span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            ))}

            {/* MENSAGEM QUANDO NÃO HÁ COLUNAS */}
            {safeColumns.length === 0 && (
              <div className="w-80 flex-shrink-0">
                <div className="bg-gray-200 rounded-t-lg px-4 py-3">
                  <h3 className="font-semibold text-gray-600">Nenhuma coluna criada</h3>
                </div>
                <div className="bg-gray-100 rounded-b-lg p-4 min-h-[600px] flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-2">Nenhuma coluna criada ainda</p>
                    <Button
                      onClick={() => {
                        setEditingCol(null);
                        setColTitle("");
                        setIsColumnModal(true);
                      }}
                      variant="outline"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Criar Primeira Coluna
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MODAL CRIAR COLUNA */}
        <Dialog open={isColumnModal} onOpenChange={setIsColumnModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCol ? "Editar" : "Nova"} Coluna</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="column-title">Título</Label>
                <Input
                  id="column-title"
                  value={colTitle}
                  onChange={e => setColTitle(e.target.value)}
                  placeholder="Digite o título da coluna"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveColumn();
                  }}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsColumnModal(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={saveColumn}>
                  {editingCol ? "Atualizar" : "Criar"} Coluna
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL CRIAR TAREFA */}
        <Dialog open={isTaskModal} onOpenChange={setIsTaskModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Nova Tarefa</DialogTitle>
              <DialogDescription>
                Preencha os detalhes da nova tarefa
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="task-title">Título *</Label>
                <Input
                  id="task-title"
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder="Digite o título da tarefa"
                />
              </div>

              <div>
                <Label htmlFor="task-description">Descrição</Label>
                <Textarea
                  id="task-description"
                  value={taskDescription}
                  onChange={e => setTaskDescription(e.target.value)}
                  placeholder="Descreva a tarefa..."
                  rows={3}
                />
              </div>

              {/* UPLOAD DE IMAGEM */}
              <div>
                <Label htmlFor="task-image">
                  <Upload className="w-4 h-4 inline mr-2" />
                  Imagem
                </Label>
                <Input
                  id="task-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setTaskImage(e.target.files?.[0] || null)}
                  className="mt-1"
                />
                {taskImage && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ {taskImage.name}
                  </p>
                )}
              </div>

              {/* GRAVAÇÃO DE ÁUDIO */}
              <div>
                <Label>
                  <Mic className="w-4 h-4 inline mr-2" />
                  Gravação de Áudio
                </Label>
                <div className="flex items-center space-x-3 mt-2">
                  <Button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    variant={isRecording ? "destructive" : "outline"}
                    size="sm"
                  >
                    {isRecording ? <Square className="w-4 h-4 mr-1" /> : <Mic className="w-4 h-4 mr-1" />}
                    {isRecording ? "Parar" : "Gravar"}
                  </Button>

                  {isRecording && (
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-gray-600 font-mono">
                        {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")}
                      </span>
                    </div>
                  )}
                </div>

                {audioBlob && (
                  <div className="mt-3">
                    <audio
                      controls
                      className="w-full h-8"
                      src={URL.createObjectURL(audioBlob)}
                    >
                      Seu navegador não suporta o elemento de áudio.
                    </audio>
                  </div>
                )}

                {/* UPLOAD DE ÁUDIO (alternativo) */}
                <div className="mt-3">
                  <Label htmlFor="task-audio">Ou faça upload de um arquivo de áudio</Label>
                  <Input
                    id="task-audio"
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setTaskAudio(e.target.files?.[0] || null)}
                    className="mt-1"
                  />
                  {taskAudio && !audioBlob && (
                    <p className="text-sm text-green-600 mt-1">
                      ✓ {taskAudio.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="task-dueDate">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Data e Hora de Vencimento
                  </Label>
                  <Input
                    id="task-dueDate"
                    type="datetime-local"
                    value={taskDueDate}
                    onChange={e => setTaskDueDate(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="task-assignedTo">
                    <User className="w-4 h-4 inline mr-2" />
                    Responsável
                  </Label>
                  <select
                    id="task-assignedTo"
                    value={taskAssignedTo}
                    onChange={e => setTaskAssignedTo(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Selecione um responsável</option>
                    {professionals.map(professional => (
                      <option key={professional.id} value={professional.id}>
                        {professional.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="task-status">Coluna</Label>
                <select
                  id="task-status"
                  value={taskStatus}
                  onChange={e => setTaskStatus(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Nenhuma coluna</option>
                  {safeColumns.map(column => (
                    <option key={column.id} value={column.id}>
                      {column.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsTaskModal(false);
                    resetTaskForm();
                  }}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={createTask}
                  disabled={!taskTitle.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Criando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" /> Criar Tarefa
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL EDITAR TAREFA */}
        <Dialog open={isEditTaskModal} onOpenChange={setIsEditTaskModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Tarefa</DialogTitle>
              <DialogDescription>
                Edite os detalhes da tarefa
              </DialogDescription>
            </DialogHeader>
            {editingTask && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-task-title">Título *</Label>
                  <Input
                    id="edit-task-title"
                    value={editTaskTitle}
                    onChange={e => setEditTaskTitle(e.target.value)}
                    placeholder="Digite o título da tarefa"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-task-description">Descrição</Label>
                  <Textarea
                    id="edit-task-description"
                    value={editTaskDescription}
                    onChange={e => setEditTaskDescription(e.target.value)}
                    placeholder="Descreva a tarefa..."
                    rows={3}
                  />
                </div>

                {/* PREVIEW DA IMAGEM ATUAL */}
                {editingTask.imageUrl && (
                  <div>
                    <Label>Imagem Atual</Label>
                    <div className="mt-2 relative">
                      <img
                        src={editingTask.imageUrl}
                        alt="Imagem atual"
                        className="w-full h-48 object-cover rounded-md border"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary">Atual</Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* UPLOAD DE NOVA IMAGEM */}
                <div>
                  <Label htmlFor="edit-task-image">
                    <Upload className="w-4 h-4 inline mr-2" />
                    {editingTask.imageUrl ? "Substituir Imagem" : "Adicionar Imagem"}
                  </Label>
                  <Input
                    id="edit-task-image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEditTaskImage(e.target.files?.[0] || null)}
                    className="mt-1"
                  />
                  {editTaskImage && (
                    <p className="text-sm text-green-600 mt-1">
                      ✓ Nova imagem selecionada: {editTaskImage.name}
                    </p>
                  )}
                </div>

                {/* PREVIEW DO ÁUDIO ATUAL */}
                {editingTask.audioUrl && (
                  <div>
                    <Label>Áudio Atual</Label>
                    <div className="mt-2">
                      <audio
                        controls
                        src={editingTask.audioUrl}
                        className="w-full h-8"
                      >
                        Seu navegador não suporta o elemento de áudio.
                      </audio>
                      <div className="mt-1">
                        <Badge variant="secondary">Atual</Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* UPLOAD DE NOVO ÁUDIO */}
                <div>
                  <Label>
                    <Mic className="w-4 h-4 inline mr-2" />
                    {editingTask.audioUrl ? "Substituir Áudio" : "Adicionar Áudio"}
                  </Label>

                  {/* UPLOAD DE ÁUDIO (alternativo) */}
                  <div className="mt-3">
                    <Label htmlFor="edit-task-audio">Fazer upload de um arquivo de áudio</Label>
                    <Input
                      id="edit-task-audio"
                      type="file"
                      accept="audio/*"
                      onChange={(e) => setEditTaskAudio(e.target.files?.[0] || null)}
                      className="mt-1"
                    />
                    {editTaskAudio && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ Novo áudio selecionado: {editTaskAudio.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-task-dueDate">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      Data e Hora de Vencimento
                    </Label>
                    <Input
                      id="edit-task-dueDate"
                      type="datetime-local"
                      value={editTaskDueDate}
                      onChange={e => setEditTaskDueDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-task-assignedTo">
                      <User className="w-4 h-4 inline mr-2" />
                      Responsável
                    </Label>
                    <select
                      id="edit-task-assignedTo"
                      value={editTaskAssignedTo}
                      onChange={e => setEditTaskAssignedTo(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Selecione um responsável</option>
                      {professionals.map(professional => (
                        <option key={professional.id} value={professional.id}>
                          {professional.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-task-status">Coluna</Label>
                  <select
                    id="edit-task-status"
                    value={editTaskStatus}
                    onChange={e => setEditTaskStatus(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Nenhuma coluna</option>
                    {safeColumns.map(column => (
                      <option key={column.id} value={column.id}>
                        {column.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditTaskModal(false);
                      setEditingTask(null);
                      resetEditForm();
                    }}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={updateTask}
                    disabled={!editTaskTitle.trim() || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Atualizando...
                      </>
                    ) : (
                      <>
                        <Edit className="w-4 h-4 mr-2" /> Atualizar Tarefa
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}