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
  Shield,
  Smartphone,
  Sparkles,
  Zap,
  Copy,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import api from "@/services/api";

// Tipagem profissional e robusta
interface WhatsAppInstance {
  id: string | number;
  name: string;
  token: string;
  status: 'creating' | 'pending' | 'connected' | 'error' | string;
  qrCode?: string;
}

interface FormData {
  name: string;
  token: string;
}

interface ApiResponse {
  data: WhatsAppInstance;
  status?: string;
  qrCode?: string;
  instance?: WhatsAppInstance;
}

// Componentes premium reutilizáveis
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/80 backdrop-blur-xl shadow-2xl ${className}`}>
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
  className = "" 
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  loading?: boolean;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) => {
  const variants = {
    primary: "bg-gradient-to-r from-[#2F80ED] to-[#1E5CB8] text-white shadow-lg shadow-[#2F80ED]/25 hover:shadow-xl hover:shadow-[#2F80ED]/30",
    secondary: "bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20",
    ghost: "text-white/70 hover:text-white hover:bg-white/10"
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
  required = true 
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

export default function WhatsAppIntegration() {
  const [loading, setLoading] = useState(false);
  const [instance, setInstance] = useState<WhatsAppInstance | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({ name: "", token: "" });
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // const AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ODIsInRva2VuVmVyc2lvbiI6MCwiY29tcGFueUlkIjoyOCwiaWF0IjoxNzc5MTE3ODAxLCJleHAiOjE3Nzk3MjI2MDF9.m_BpkjjmZQk56DlP_I6TnlLsK6CBRkV7jPZvxiVpzi0";

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Função segura para formatar ID
  const formatInstanceId = (id: string | number | undefined): string => {
    if (!id) return "N/A";
    const idStr = String(id);
    return idStr.length > 12 ? `${idStr.slice(0, 12)}...` : idStr;
  };

  const handleCreateInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payload = {
        botFlowId: null,
        complationMessage: "",
        expiresInactiveMessage: "",
        expiresTicket: 0,
        greetingMessage: "",
        isDefault: false,
        maxUseBotQueues: 3,
        metaBusinessId: "",
        metaPhoneNumberId: "",
        metaWabaId: "",
        name: formData.name,
        outOfHoursMessage: "",
        promptId: null,
        provider: "beta",
        queueIds: [],
        ratingMessage: "",
        timeUseBotQueues: 0,
        token: formData.token,
        transferQueueId: null,
      };

      const response = await api.post<{ data: WhatsAppInstance }>("/whatsapp/create-instance", payload);

      const instanceData = response.data?.data || response.data;
      setInstance(instanceData);
      toast.success(`Instância "${instanceData.name}" criada com sucesso!`);
      setFormData({ name: "", token: "" });
    } catch (error: any) {
      console.error("Erro ao criar instância:", error);
      toast.error(error.response?.data?.message || "Erro ao criar instância");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQR = async () => {
    if (!instance?.id) {
      toast.error("Primeiro crie uma instância");
      return;
    }

    setShowQRModal(true);
    setQrLoading(true);
    setQrCode(null);

    const fetchQR = async () => {
      try {
        const response = await api.get<ApiResponse>(`/whatsapp/qrcode/${instance.id}`);

        const data = response.data;

        if (data.qrCode) {
          setQrCode(data.qrCode);
          setQrLoading(false);
          if (pollingRef.current) clearInterval(pollingRef.current);
          toast.success("QR Code gerado! Escaneie com seu WhatsApp");
        } else if (data.status === "connected" || data.instance?.status === "connected") {
          setShowQRModal(false);
          setQrLoading(false);
          if (pollingRef.current) clearInterval(pollingRef.current);
          toast.success("WhatsApp conectado com sucesso!");
          if (data.instance) setInstance(data.instance);
        }
      } catch (error) {
        console.error("Erro ao buscar QR Code:", error);
        toast.error("Erro ao gerar QR Code. Tente novamente.");
      }
    };

    await fetchQR();

    if (!qrCode && pollingRef.current === null) {
      pollingRef.current = setInterval(fetchQR, 3000);
      setTimeout(() => {
        if (pollingRef.current && !qrCode) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setQrLoading(false);
          toast.error("Tempo limite excedido. Tente novamente.");
        }
      }, 60000);
    }
  };

  const handleRefreshQR = () => {
    setQrCode(null);
    setQrLoading(true);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    handleGenerateQR();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F6FA] via-white to-[#F5F6FA] overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#2F80ED]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#2F80ED]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-8 md:py-12 lg:py-16">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#2F80ED]/10 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-[#2F80ED]" />
            <span className="text-sm font-medium text-[#2F80ED]">Integração Premium</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-[#353A40] to-[#2F80ED] bg-clip-text text-transparent mb-4">
            WhatsApp Business
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Conecte seu WhatsApp de forma rápida e segura. Gerencie conversas, 
            automatize respostas e aumente sua produtividade.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Formulário */}
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
                  <h2 className="text-xl font-bold text-gray-800">Nova Instância</h2>
                  <p className="text-sm text-gray-500">Configure sua conexão WhatsApp</p>
                </div>
              </div>

              <form onSubmit={handleCreateInstance} className="space-y-5">
                <InputField
                  label="Nome da Instância"
                  value={formData.name}
                  onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: WhatsApp Comercial"
                  icon={Database}
                />

                <InputField
                  label="Token da Instância"
                  type="password"
                  value={formData.token}
                  onChange={(e: any) => setFormData({ ...formData, token: e.target.value })}
                  placeholder="Digite seu token de acesso"
                  icon={Shield}
                />

                <PremiumButton
                  type="submit"
                  loading={loading}
                  className="w-full"
                >
                  <MessageCircle className="w-4 h-4" />
                  Criar Instância
                </PremiumButton>
              </form>

              {/* Features */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: Zap, text: "Conexão Instantânea" },
                    { icon: Shield, text: "Segurança Total" },
                    { icon: Smartphone, text: "Multi-dispositivos" },
                    { icon: Copy, text: "API Completa" }
                  ].map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                      <feature.icon className="w-4 h-4 text-[#2F80ED]" />
                      <span>{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Instância Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {instance ? (
              <GlassCard className="p-6 md:p-8 h-full">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <h3 className="font-semibold text-gray-800">Instância Ativa</h3>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{instance.name}</p>
                  </div>
                  <div className="px-3 py-1 bg-green-100 rounded-full">
                    <span className="text-xs font-medium text-green-700">
                      {instance.status === "connected" ? "Conectada" : "Configurando"}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">ID da Instância</span>
                    <code className="text-gray-700 font-mono text-xs">
                      {formatInstanceId(instance.id)}
                    </code>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Token</span>
                    <code className="text-gray-700 font-mono text-xs">
                      {instance.token ? "••••••••" : "Não definido"}
                    </code>
                  </div>
                </div>

                <PremiumButton
                  onClick={handleGenerateQR}
                  loading={qrLoading}
                  variant="secondary"
                  className="w-full bg-gradient-to-r from-[#2F80ED] to-[#1E5CB8] text-white"
                >
                  <QrCode className="w-4 h-4" />
                  Gerar QR Code
                </PremiumButton>

                <div className="mt-6 p-4 bg-blue-50/50 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                      <ExternalLink className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 mb-1">Pronto para conectar?</p>
                      <p className="text-xs text-blue-700">
                        Clique em gerar QR Code e escaneie com seu WhatsApp para começar a usar.
                      </p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ) : (
              <GlassCard className="p-6 md:p-8 h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                    <MessageCircle className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-2">Nenhuma instância criada</p>
                  <p className="text-sm text-gray-400">
                    Preencha o formulário ao lado para começar
                  </p>
                </div>
              </GlassCard>
            )}
          </motion.div>
        </div>

        {/* Modal do QR Code Premium */}
        <AnimatePresence>
          {showQRModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowQRModal(false)}
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
                      if (pollingRef.current) {
                        clearInterval(pollingRef.current);
                        pollingRef.current = null;
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
                      Abra o WhatsApp no seu celular e aponte a câmera para esta tela
                    </p>
                  </div>

                  {qrLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="w-12 h-12 text-[#2F80ED] animate-spin mb-4" />
                      <p className="text-sm text-gray-500">Gerando QR Code...</p>
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
                        <PremiumButton onClick={handleRefreshQR} variant="secondary" className="w-full">
                          <RefreshCw className="w-4 h-4" />
                          Gerar Novo QR Code
                        </PremiumButton>
                        
                        <div className="p-4 bg-blue-50 rounded-xl">
                          <div className="flex items-start gap-3">
                            <div className="p-1.5 bg-blue-100 rounded-lg">
                              <AlertCircle className="w-4 h-4 text-blue-600" />
                            </div>
                            <p className="text-xs text-blue-800">
                              O QR Code expira em 60 segundos. Se expirar, clique em &quot;Gerar Novo QR Code&quot;.
                            </p>
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
                      <PremiumButton onClick={handleRefreshQR} variant="primary" className="mt-4">
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