/* eslint-disable @typescript-eslint/no-explicit-any */
// app/WhatsAppIntegration/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  QrCode,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Database,
  Smartphone,
  Bell,
  Package,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Send,
  Trash2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/services/api";

// Tipagem profissional e robusta
interface WhatsAppInstance {
  id: string | number;
  name: string;
  token: string;
  status: "creating" | "pending" | "connected" | "error" | "qrcode" | string;
  qrCode?: string;
  instanceId?: number;
  connectionId?: string;
}

interface FormData {
  name: string;
}

interface ApiResponse {
  id: number;
  name: string;
  status: string;
  qrcode?: string;
  [key: string]: any;
}

// Função para gerar token aleatório
const generateRandomToken = (): string => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += characters.charAt(Math.random() * characters.length);
  }
  const timestamp = Date.now().toString(36);
  return `${timestamp}_${token}`;
};

// Componentes premium reutilizáveis
const GlassCard = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/80 backdrop-blur-xl shadow-2xl ${className}`}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
    {children}
  </div>
);

const PremiumButton = ({
  children,
  onClick,
  loading = false,
  type = "button",
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) => {
  const variants = {
    primary:
      "bg-gradient-to-r from-[#2F80ED] to-[#1E5CB8] text-white shadow-lg shadow-[#2F80ED]/25 hover:shadow-xl hover:shadow-[#2F80ED]/30",
    secondary:
      "bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20",
    ghost: "text-white/70 hover:text-white hover:bg-white/10",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      type={type}
      disabled={loading}
      className={`relative flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${variants[variant]} ${loading ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </motion.button>
  );
};

const InputField = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon: Icon,
  required = true,
}: any) => (
  <div className="space-y-2">
    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4 text-[#2F80ED]" />}
      {label}
    </label>
    <div className="relative group">
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F80ED]/50 focus:border-transparent transition-all duration-200 placeholder:text-gray-400"
      />
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#2F80ED]/0 to-[#2F80ED]/0 group-focus-within:from-[#2F80ED]/5 group-focus-within:to-transparent pointer-events-none transition-all duration-300" />
    </div>
  </div>
);

// Componente: Card de Notificações
const NotificationInfoCard = () => {
  const notificationTypes = [
    {
      icon: Package,
      title: "Produto Criado",
      description: "Notificação imediata quando um novo produto é cadastrado",
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      icon: Calendar,
      title: "Produtos Próximos ao Vencimento",
      description: "Alertas automáticos para produtos com validade próxima",
      bgColor: "bg-yellow-50",
      iconColor: "text-yellow-600",
    },
    {
      icon: AlertTriangle,
      title: "Produtos Atrasados",
      description: "Notificações críticas para produtos já vencidos",
      bgColor: "bg-red-50",
      iconColor: "text-red-600",
    },
  ];

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-[#2F80ED] to-[#1E5CB8] rounded-xl">
          <Bell className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-800">
            Notificações Inteligentes
          </h3>
          <p className="text-sm text-gray-500">
            Receba alertas em tempo real no seu WhatsApp
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {notificationTypes.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`p-4 rounded-xl ${item.bgColor} border border-gray-100`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg bg-white shadow-sm`}>
                <item.icon className={`w-5 h-5 ${item.iconColor}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-800">{item.title}</h4>
                  <div className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/80 text-gray-600">
                    Automático
                  </div>
                </div>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
              <Send className="w-4 h-4 text-gray-400" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">24/7</div>
            <div className="text-xs text-gray-500">Monitoramento</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">&lt; 30d</div>
            <div className="text-xs text-gray-500">Alertas Prévios</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">Imediato</div>
            <div className="text-xs text-gray-500">Atrasos Críticos</div>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-gradient-to-r from-[#2F80ED]/10 to-transparent rounded-lg">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <TrendingUp className="w-3 h-3 text-[#2F80ED]" />
          <span>Reduza perdas com alertas preventivos de vencimento</span>
        </div>
      </div>
    </GlassCard>
  );
};

export default function WhatsAppIntegration() {
  const [loading, setLoading] = useState(false);
  const [instance, setInstance] = useState<WhatsAppInstance | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState<FormData>({ name: "" });
  const statusPollingRef = useRef<NodeJS.Timeout | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchExistingInstance();
    return () => {
      if (statusPollingRef.current) clearInterval(statusPollingRef.current);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Adicione este useEffect APÓS o useEffect existente
useEffect(() => {
  let pollingInterval: NodeJS.Timeout;
  
  // Só faz polling se:
  // 1. Tem uma instância
  // 2. O status NÃO é 'connected'
  // 3. O modal do QR Code está aberto OU a instância está em qrcode
  if (instance && instance.status !== 'connected') {
    console.log('🔄 Iniciando polling de status para instância:', instance.instanceId || instance.id);
    
    pollingInterval = setInterval(async () => {
      try {
        // Busca o status atualizado da conexão
        const response = await api.get('/whatsapp/connection');
        const updatedConnection = response.data?.data;
        
        console.log('📊 Status atual:', updatedConnection?.status);
        
        if (updatedConnection && updatedConnection.status !== instance.status) {
          console.log(`✅ Status mudou: ${instance.status} -> ${updatedConnection.status}`);
          setInstance(updatedConnection);
          
          if (updatedConnection.status === 'connected') {
            toast.success('🎉 WhatsApp conectado com sucesso!');
            setShowQRModal(false);
            clearInterval(pollingInterval);
          } else if (updatedConnection.status === 'qrcode' && updatedConnection.qrCode) {
            setQrCode(updatedConnection.qrCode);
            setQrLoading(false);
          }
        }
      } catch (error) {
        console.error('Erro no polling:', error);
      }
    }, 3000); // Verifica a cada 3 segundos
  }
  
  return () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      console.log('🛑 Polling parado');
    }
  };
}, [instance]); // Dependência no instance

  // 🔥 Função auxiliar para obter o ID da instância de forma segura
  const getValidInstanceId = (): number | null => {
    const instanceId = instance?.instanceId || instance?.id;
    
    if (!instanceId) {
      console.error("❌ Nenhum ID de instância encontrado");
      return null;
    }

    // Converte para número
    const idNum = typeof instanceId === "string" ? parseInt(instanceId, 10) : instanceId;
    
    // Valida se é um número válido
    if (isNaN(idNum) || idNum <= 0) {
      console.error("❌ ID de instância inválido:", instanceId);
      return null;
    }

    return idNum;
  };

  // Buscar instância existente
  const fetchExistingInstance = async () => {
    try {
      const response = await api.get("/whatsapp/connection");

      // 🔥 NOVA LÓGICA: O backend retorna { success: true, data: connection }
      const connection = response.data?.data;

      if (connection) {
        setInstance(connection);

        if (connection.status === "connected") {
          toast.success("WhatsApp já está conectado!");
        } else if (connection.status === "qrcode") {
          // Se já existe QR Code pendente, mostra modal
          setShowQRModal(true);
          setQrCode(connection.qrCode);
        }
      } else {
        // Nenhuma conexão encontrada - isso é NORMAL, não é erro
        console.log(
          "ℹ️ Nenhuma conexão WhatsApp encontrada - primeira vez do usuário",
        );
        setInstance(null);
      }
    } catch (error: any) {
      // 🔥 Só mostra erro se não for relacionado à falta de configuração
      if (error.response?.status !== 404) {
        console.error("Erro ao buscar conexão:", error);
        toast.error("Erro ao carregar status do WhatsApp");
      }
      setInstance(null);
    }
  };

  const generateQRCode = async (instanceId: number, retryCount = 0) => {
    // 🔥 VALIDAÇÃO ANTES DE FAZER A REQUISIÇÃO
    if (!instanceId || isNaN(instanceId)) {
      console.error("❌ generateQRCode: instanceId inválido:", instanceId);
      toast.error("ID da instância inválido. Tente novamente.");
      setQrLoading(false);
      return false;
    }

    try {
      console.log(`🔄 Gerando QR Code para instância ${instanceId} (tentativa ${retryCount + 1})`);
      
      const response = await api.get(`/whatsapp/qrcode/${instanceId}`);
      const data = response.data;

      console.log(`Resposta:`, data);

      if (data.qrcode) {
        setQrCode(data.qrcode);
        setQrLoading(false);

        // Inicia polling para verificar conexão
        if (pollingRef.current) clearInterval(pollingRef.current);

        pollingRef.current = setInterval(async () => {
          try {
            // 🔥 Verifica novamente com ID válido
            const currentId = getValidInstanceId();
            if (!currentId) {
              clearInterval(pollingRef.current!);
              pollingRef.current = null;
              return;
            }

            const statusResponse = await api.get(`/whatsapp/qrcode/${currentId}`);
            if (statusResponse.data.status === "CONNECTED") {
              clearInterval(pollingRef.current!);
              pollingRef.current = null;
              setShowQRModal(false);
              setInstance((prev) =>
                prev ? { ...prev, status: "connected" } : null,
              );
              toast.success("🎉 WhatsApp conectado com sucesso!");
            }
          } catch (err) {
            console.error("Polling error:", err);
          }
        }, 3000);

        toast.success("QR Code gerado! Escaneie com WhatsApp");
        return true;
      }

      if (retryCount < 8) {
        setTimeout(() => generateQRCode(instanceId, retryCount + 1), 2000);
      } else {
        setQrLoading(false);
        toast.error(
          "QR Code não disponível. Tente 'Gerar QR Code' manualmente",
        );
      }

      return false;
    } catch (error: any) {
      console.error("Erro ao gerar QR Code:", error);

      if (retryCount < 8) {
        setTimeout(() => generateQRCode(instanceId, retryCount + 1), 2000);
      } else {
        setQrLoading(false);
        toast.error("Erro ao gerar QR Code. Tente novamente");
      }
      return false;
    }
  };

  const handleCreateInstance = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Informe o nome da instância");
      return;
    }

    setLoading(true);

    try {
      const token = generateRandomToken();

      const response = await api.post("/whatsapp/create-instance", {
        name: formData.name,
        provider: "beta",
        token: token,
      });

      console.log("Instância criada:", response.data);

      toast.success(`✅ Instância "${formData.name}" criada!`);
      setFormData({ name: "" });

      setTimeout(async () => {
        try {
          const conn = await api.get("/whatsapp/connection");
          if (conn.data?.data) {
            const connectionData = conn.data.data;
            setInstance(connectionData);

            // 🔥 OBTÉM O ID DE FORMA SEGURA
            const instanceId = connectionData.instanceId || connectionData.id;
            
            if (!instanceId) {
              console.error("❌ Instância criada mas sem ID:", connectionData);
              toast.error("Instância criada, mas não foi possível obter o ID");
              setLoading(false);
              return;
            }

            const idNum = typeof instanceId === "string" ? parseInt(instanceId, 10) : instanceId;
            
            if (isNaN(idNum)) {
              console.error("❌ ID inválido:", instanceId);
              toast.error("ID da instância inválido");
              setLoading(false);
              return;
            }

            setShowQRModal(true);
            setQrLoading(true);
            await generateQRCode(idNum);
          } else {
            toast.error("Instância criada, mas não foi possível obter os dados");
          }
        } catch (err) {
          console.error("Erro ao buscar dados da instância:", err);
          toast.error("Instância criada, mas erro ao buscar dados");
        } finally {
          setLoading(false);
        }
      }, 3000);
    } catch (error: any) {
      console.error("Erro ao criar instância:", error);
      toast.error(error.response?.data?.message || "Erro ao criar instância");
      setLoading(false);
    }
  };

  const handleGenerateQR = async () => {
    // 🔥 VALIDAÇÃO ANTES DE TUDO
    const idNum = getValidInstanceId();
    
    if (!idNum) {
      toast.error("Nenhuma instância válida encontrada. Crie uma instância primeiro.");
      return;
    }

    console.log(`🔍 Gerando QR Code manual para instância ${idNum}`);
    
    setShowQRModal(true);
    setQrLoading(true);
    setQrCode(null);

    await generateQRCode(idNum);
  };

  const handleRefreshQR = async () => {
    // 🔥 VALIDAÇÃO ANTES DE TUDO
    const idNum = getValidInstanceId();
    
    if (!idNum) {
      toast.error("ID da instância inválido");
      setShowQRModal(false);
      return;
    }

    console.log(`🔄 Atualizando QR Code para instância ${idNum}`);
    
    setQrCode(null);
    setQrLoading(true);

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    await generateQRCode(idNum);
  };

  const handleDeleteInstance = async () => {
    // 🔥 VALIDAÇÃO ANTES DE TUDO
    const idNum = getValidInstanceId();
    
    if (!idNum) {
      toast.error("Nenhuma instância válida encontrada");
      return;
    }

    setLoading(true);

    try {
      console.log(`🗑️ Deletando instância ${idNum}`);
      
      await api.delete(`/whatsapp/instance/${idNum}`);

      setInstance(null);
      setQrCode(null);
      setShowQRModal(false);

      if (statusPollingRef.current) {
        clearInterval(statusPollingRef.current);
        statusPollingRef.current = null;
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }

      toast.success(`✅ Instância deletada com sucesso!`);
      setFormData({ name: "" });
    } catch (error: any) {
      console.error("Erro ao deletar instância:", error);
      toast.error(error.response?.data?.message || "Erro ao deletar instância");
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F6FA] via-white to-[#F5F6FA] overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#2F80ED]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#2F80ED]/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-red-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-8 md:py-12 lg:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#2F80ED]/10 rounded-full mb-6">
            <Bell className="w-4 h-4 text-[#2F80ED]" />
            <span className="text-sm font-medium text-[#2F80ED]">
              Sistema de Notificações Inteligentes
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-[#353A40] to-[#2F80ED] bg-clip-text text-transparent mb-4">
            Alertas WhatsApp
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Receba notificações automáticas sobre{" "}
            <span className="font-semibold text-green-600">
              produtos criados
            </span>
            ,
            <span className="font-semibold text-yellow-600">
              {" "}
              itens próximos ao vencimento
            </span>{" "}
            e
            <span className="font-semibold text-red-600">
              {" "}
              alertas de atraso
            </span>{" "}
            diretamente no seu WhatsApp
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <GlassCard className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-[#2F80ED] to-[#1E5CB8] rounded-xl">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Conectar WhatsApp
                  </h2>
                  <p className="text-sm text-gray-500">
                    Ative as notificações do seu negócio
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateInstance} className="space-y-5">
                <InputField
                  label="Nome da Instância"
                  value={formData.name}
                  onChange={(e: any) => setFormData({ name: e.target.value })}
                  placeholder="Ex: Monitor de Produtos"
                  icon={Database}
                />

                <PremiumButton
                  type="submit"
                  loading={loading}
                  className="w-full"
                >
                  <Bell className="w-4 h-4" />
                  Criar Instância
                </PremiumButton>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  O que você vai receber:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      icon: Package,
                      text: "Novos produtos",
                      color: "text-green-600",
                      bg: "bg-green-50",
                    },
                    {
                      icon: Calendar,
                      text: "Vencimento próximo",
                      color: "text-yellow-600",
                      bg: "bg-yellow-50",
                    },
                    {
                      icon: AlertTriangle,
                      text: "Produtos atrasados",
                      color: "text-red-600",
                      bg: "bg-red-50",
                    },
                  ].map((feature, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 p-2 rounded-lg ${feature.bg}`}
                    >
                      <feature.icon className={`w-4 h-4 ${feature.color}`} />
                      <span className="text-xs text-gray-700">
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <NotificationInfoCard />
          </motion.div>
        </div>

        {/* Card da Instância */}
        {instance && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
            className="mt-8"
          >
            <GlassCard className="p-6 relative overflow-hidden">
              {/* Badge de status e botão deletar */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    instance.status === "connected"
                      ? "bg-green-100 text-green-700 border border-green-200"
                      : instance.status === "qrcode"
                        ? "bg-yellow-100 text-yellow-700 border border-yellow-200 animate-pulse"
                        : "bg-blue-100 text-blue-700 border border-blue-200"
                  }`}
                >
                  {instance.status === "connected" ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Conectado</span>
                    </>
                  ) : instance.status === "qrcode" ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Aguardando leitura</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3 h-3" />
                      <span>Configurando</span>
                    </>
                  )}
                </div>

                {/* Botão de deletar */}
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-all duration-200 group"
                  title="Deletar instância"
                >
                  <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </button>
              </div>

              <div className="flex items-start gap-5">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className={`p-3 rounded-2xl ${
                    instance.status === "connected"
                      ? "bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/25"
                      : instance.status === "qrcode"
                        ? "bg-gradient-to-br from-yellow-500 to-orange-600 shadow-lg shadow-yellow-500/25"
                        : "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25"
                  }`}
                >
                  {instance.status === "connected" ? (
                    <CheckCircle2 className="w-8 h-8 text-white" />
                  ) : instance.status === "qrcode" ? (
                    <QrCode className="w-8 h-8 text-white" />
                  ) : (
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  )}
                </motion.div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-gray-800">
                      {instance.name}
                    </h3>
                    <span className="text-xs text-gray-400 font-mono">
                      ID: {instance.instanceId || instance.id}
                    </span>
                  </div>

                  <p className="text-sm text-gray-500 mb-3">
                    {instance.status === "connected"
                      ? "WhatsApp conectado e pronto para receber notificações"
                      : instance.status === "qrcode"
                        ? "Escaneie o QR Code para conectar seu WhatsApp"
                        : "Configurando instância, aguarde..."}
                  </p>

                  {instance.status !== "connected" && (
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3 overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 30, repeat: Infinity }}
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {instance.status !== "connected" && (
                      <button
                        onClick={handleGenerateQR}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-all hover:bg-blue-100"
                      >
                        <QrCode className="w-3 h-3 inline mr-1" />
                        Gerar QR Code
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#2F80ED]" />
                  Notificações ativas:
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    {
                      icon: Package,
                      text: "Produtos criados",
                      color: "text-green-600",
                      bg: "bg-green-50",
                    },
                    {
                      icon: Calendar,
                      text: "Vencimento próximo",
                      color: "text-yellow-600",
                      bg: "bg-yellow-50",
                    },
                    {
                      icon: AlertTriangle,
                      text: "Produtos atrasados",
                      color: "text-red-600",
                      bg: "bg-red-50",
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${item.bg}`}
                    >
                      <item.icon className={`w-3 h-3 ${item.color}`} />
                      <span className="text-gray-700">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Modal de confirmação de delete */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowDeleteConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative max-w-md w-full bg-white rounded-2xl shadow-xl p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center mb-4">
                  <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    Confirmar exclusão
                  </h3>
                  <p className="text-gray-600">
                    Tem certeza que deseja deletar a instância{" "}
                    <strong className="text-gray-900">{instance?.name}</strong>?
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Esta ação desconectará o WhatsApp e não poderá ser desfeita.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteInstance}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Deletar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal do QR Code */}
        <AnimatePresence>
          {showQRModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                setShowQRModal(false);
                if (statusPollingRef.current) {
                  clearInterval(statusPollingRef.current);
                  statusPollingRef.current = null;
                }
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <GlassCard className="p-6 md:p-8">
                  <button
                    onClick={() => {
                      setShowQRModal(false);
                      if (statusPollingRef.current) {
                        clearInterval(statusPollingRef.current);
                        statusPollingRef.current = null;
                      }
                    }}
                    className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>

                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#2F80ED] to-[#1E5CB8] rounded-2xl mb-4">
                      <Smartphone className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                      Escaneie o QR Code
                    </h3>
                    <p className="text-sm text-gray-500">
                      1. Abra o WhatsApp no seu celular
                      <br />
                      2. Vá em Configurações → Dispositivos Conectados
                      <br />
                      3. Toque em Conectar um dispositivo
                      <br />
                      4. Escaneie o QR Code ao lado
                    </p>
                  </div>

                  {qrLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="w-12 h-12 text-[#2F80ED] animate-spin mb-4" />
                      <p className="text-sm text-gray-500">
                        Gerando QR Code...
                      </p>
                    </div>
                  ) : qrCode ? (
                    <div className="flex flex-col items-center">
                      <div className="p-4 bg-white rounded-2xl shadow-xl mb-6">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode)}`}
                          alt="QR Code WhatsApp"
                          className="w-64 h-64"
                        />
                      </div>

                      <div className="w-full space-y-3">
                        <PremiumButton
                          onClick={handleRefreshQR}
                          variant="secondary"
                          className="w-full"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Gerar Novo QR Code
                        </PremiumButton>

                        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                          <div className="flex items-start gap-3">
                            <div className="p-1.5 bg-blue-100 rounded-lg">
                              <AlertCircle className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="text-xs text-blue-800">
                              <p className="font-medium mb-1">
                                ⏱️ O QR Code expira em 60 segundos
                              </p>
                              <p>
                                Após escanear, o modal fechará automaticamente!
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <AlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
                      <p className="text-sm text-gray-600 text-center">
                        Não foi possível gerar o QR Code.
                        <br />
                        Tente novamente em alguns instantes.
                      </p>
                      <PremiumButton
                        onClick={handleRefreshQR}
                        variant="primary"
                        className="mt-4"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Tentar Novamente
                      </PremiumButton>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}