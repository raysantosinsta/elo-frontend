/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
// /* eslint-disable @typescript-eslint/no-explicit-any */
// /* eslint-disable react/no-unescaped-entities */

// // app/WhatsAppIntegration/page.tsx

// 'use client';

// import api from '@/services/api';
// import React, { useState } from 'react';

// export default function WhatsAppIntegration() {
//   const [loading, setLoading] = useState(false);
//   const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
//   const [instance, setInstance] = useState<any>(null);
//   const [qrCode, setQrCode] = useState<string | null>(null);
//   const [showQRCode, setShowQRCode] = useState(false);
//   const [qrLoading, setQrLoading] = useState(false);

//   const [formData, setFormData] = useState({
//     name: '',
//     token: '',
//   });

//   // Criar instância WhatsApp
//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);
//     setMessage(null);
//     setInstance(null);
//     setQrCode(null);
//     setShowQRCode(false);

//     try {
//       const payload = {
//         botFlowId: null,
//         complationMessage: "",
//         expiresInactiveMessage: "",
//         expiresTicket: 0,
//         greetingMessage: "",
//         isDefault: false,
//         maxUseBotQueues: 3,
//         metaBusinessId: "",
//         metaPhoneNumberId: "",
//         metaWabaId: "",
//         name: formData.name,
//         outOfHoursMessage: "",
//         promptId: null,
//         provider: "beta",
//         queueIds: [],
//         ratingMessage: "",
//         timeUseBotQueues: 0,
//         token: formData.token,
//         transferQueueId: null
//       };

//       const response = await api.post('/whatsapp/create-instance', payload);

//       setInstance(response.data);
//       setMessage({
//         type: 'success',
//         text: `✅ Instância "${response.data.name}" criada com sucesso! ID: ${response.data.id}`
//       });

//       setFormData({ name: '', token: '' });

//     } catch (error: any) {
//       setMessage({
//         type: 'error',
//         text: error.response?.data?.message || 'Erro ao criar instância'
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Buscar QR Code
//   const handleGetQRCode = async () => {
//     if (!instance?.id) {
//       setMessage({ type: 'error', text: 'Primeiro crie uma instância' });
//       return;
//     }

//     setQrLoading(true);
//     setMessage(null);

//     try {
//       // 🔥 Token de autenticação do AtendePro
//       const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2FybmFtZSI6IkVsbyBwcm9kdXRpdm8iLCJwcm9maWxlIjoiYWRtaW4iLCJpZCI6ODIsImNvbXBhbnlJZCI6MjgsImlhdCI6MTc3OTExMzIxMywiZXhwIjoxNzc5MTE0MTEzfQ.0mTEUax6wQcwGeGc4QJ0cKmqYg72LfnnIm5VDmAHd9w";

//       const response = await api.get(`https://api.atendepro.app/whatsapp/qrcode/${instance.id}`, {
//         headers: {
//           'Authorization': `Bearer ${authToken}`
//         }
//       });

//       setQrCode(response.data.qrCode);
//       setShowQRCode(true);

//     } catch (error: any) {
//       setMessage({
//         type: 'error',
//         text: error.response?.data?.error || 'Erro ao buscar QR Code'
//       });
//     } finally {
//       setQrLoading(false);
//     }
//   };

//   // Fechar QR Code
//   const handleCloseQRCode = () => {
//     setShowQRCode(false);
//     setQrCode(null);
//   };

//   return (
//     <div className="max-w-2xl mx-auto p-6">
//       <div className="bg-white rounded-lg shadow-md overflow-hidden">
//         {/* Header */}
//         <div className="bg-green-600 px-6 py-4">
//           <h2 className="text-2xl font-bold text-white flex items-center gap-2">
//             💬 WhatsApp Business
//           </h2>
//           <p className="text-green-100 text-sm mt-1">
//             Crie sua instância e conecte seu WhatsApp
//           </p>
//         </div>

//         {/* Formulário */}
//         <div className="p-6">
//           <form onSubmit={handleSubmit} className="space-y-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Nome da Instância *
//               </label>
//               <input
//                 type="text"
//                 value={formData.name}
//                 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
//                 placeholder="Ex: WhatsApp Comercial"
//                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
//                 required
//                 disabled={loading}
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Token da Instância *
//               </label>
//               <input
//                 type="password"
//                 value={formData.token}
//                 onChange={(e) => setFormData({ ...formData, token: e.target.value })}
//                 placeholder="Token da instância WhatsApp"
//                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
//                 required
//                 disabled={loading}
//               />
//             </div>

//             {/* Mensagem de feedback */}
//             {message && (
//               <div className={`p-3 rounded-md ${
//                 message.type === 'success'
//                   ? 'bg-green-50 text-green-700 border border-green-200'
//                   : 'bg-red-50 text-red-700 border border-red-200'
//               }`}>
//                 {message.text}
//               </div>
//             )}

//             {/* Botão Criar Instância */}
//             <button
//               type="submit"
//               disabled={loading}
//               className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
//             >
//               {loading ? 'Criando...' : '🚀 Criar Instância WhatsApp'}
//             </button>
//           </form>

//           {/* Dados da instância criada */}
//           {instance && (
//             <div className="mt-6 p-4 bg-blue-50 rounded-md border border-blue-200">
//               <h4 className="font-semibold text-blue-800 mb-2">✅ Instância Criada</h4>
//               <ul className="text-sm text-blue-700 space-y-1">
//                 <li>🆔 ID: {instance.id}</li>
//                 <li>📛 Nome: {instance.name}</li>
//                 <li>📊 Status: {instance.status}</li>
//                 <li>🔑 Token: {instance.token?.substring(0, 30)}...</li>
//               </ul>

//               {/* Botão para abrir QR Code */}
//               <button
//                 onClick={handleGetQRCode}
//                 disabled={qrLoading}
//                 className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
//               >
//                 {qrLoading ? 'Carregando...' : '📱 Abrir QR Code para Conectar'}
//               </button>
//             </div>
//           )}

//           {/* Modal/Painel do QR Code */}
//           {showQRCode && qrCode && (
//             <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//               <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
//                 <div className="text-center">
//                   <h3 className="text-xl font-bold text-gray-800 mb-4">
//                     📱 Escaneie o QR Code
//                   </h3>

//                   <div className="bg-white p-4 rounded-lg inline-block mx-auto">
//                     <img
//                       src={qrCode}
//                       alt="QR Code WhatsApp"
//                       className="w-64 h-64 mx-auto"
//                     />
//                   </div>

//                   <div className="mt-4 text-left bg-blue-50 p-4 rounded-md">
//                     <p className="text-sm font-semibold text-blue-800 mb-2">
//                       Como conectar seu WhatsApp:
//                     </p>
//                     <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
//                       <li>Abra o WhatsApp no seu celular</li>
//                       <li>Toque em <strong>Mais opções</strong> (Android) ou <strong>Configurações</strong> (iPhone)</li>
//                       <li>Toque em <strong>Dispositivos conectados</strong></li>
//                       <li>Toque em <strong>Conectar dispositivo</strong></li>
//                       <li>Aponte a câmera para esta tela</li>
//                     </ol>
//                   </div>

//                   <p className="text-xs text-gray-500 mt-3">
//                     O QR Code expira em 60 segundos
//                   </p>

//                   <div className="flex gap-2 mt-4">
//                     <button
//                       onClick={handleGetQRCode}
//                       className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
//                     >
//                       🔄 Atualizar QR Code
//                     </button>
//                     <button
//                       onClick={handleCloseQRCode}
//                       className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
//                     >
//                       Fechar
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* Instruções */}
//           <div className="mt-6 p-4 bg-gray-50 rounded-md">
//             <h4 className="font-semibold text-gray-700 mb-2">📖 Como usar:</h4>
//             <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
//               <li>Preencha o nome da instância (ex: "WhatsApp Comercial")</li>
//               <li>Informe o token da instância</li>
//               <li>Clique em "Criar Instância WhatsApp"</li>
//               <li>Após criar, clique em "Abrir QR Code para Conectar"</li>
//               <li>Escaneie o QR Code com seu WhatsApp</li>
//               <li>Pronto! Seu WhatsApp está conectado</li>
//             </ol>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// app/WhatsAppIntegration/page.tsx

"use client";

import api from "@/services/api";
import React, { useState, useRef, useEffect } from "react";

export default function WhatsAppIntegration() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [instance, setInstance] = useState<any>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    token: "",
  });

  const AUTH_TOKEN =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ODIsInRva2VuVmVyc2lvbiI6MCwiY29tcGFueUlkIjoyOCwiaWF0IjoxNzc5MTE3ODAxLCJleHAiOjE3Nzk3MjI2MDF9.m_BpkjjmZQk56DlP_I6TnlLsK6CBRkV7jPZvxiVpzi0";

  // Limpar polling ao desmontar
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Criar instância WhatsApp
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setInstance(null);
    setQrCode(null);
    setShowQRCode(false);
    setStatus("");

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

      // Criar instância
      const response = await api.post("/whatsapp/create-instance", payload, {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`, // 🔥 Envia o token no header
        },
      });

      setInstance(response.data);
      setStatus(response.data.status);
      setMessage({
        type: "success",
        text: `✅ Instância "${response.data.name}" criada com sucesso! ID: ${response.data.id}`,
      });

      setFormData({ name: "", token: "" });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Erro ao criar instância",
      });
    } finally {
      setLoading(false);
    }
  };

  // Buscar QR Code com polling automático
  const handleGetQRCode = async () => {
    if (!instance?.id) {
      setMessage({ type: "error", text: "Primeiro crie uma instância" });
      return;
    }

    setQrLoading(true);
    setMessage(null);
    setShowQRCode(true);

    // Função para buscar o QR Code
    const fetchQRCode = async () => {
      try {
        const response = await api.get(`/whatsapp/qrcode/${instance.id}`, {
          headers: {
            Authorization: `Bearer ${AUTH_TOKEN}`, // 🔥 Envia o token no header
          },
        });

        // Atualiza o status da instância
        if (response.data.status) {
          setStatus(response.data.status);
        }

        // Se tem QR Code, exibe e para o polling
        if (response.data.qrCode) {
          setQrCode(response.data.qrCode);
          setQrLoading(false);

          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }

          setMessage({
            type: "success",
            text: "✅ QR Code gerado! Escaneie com seu WhatsApp.",
          });
        }
        // Se a instância está conectada
        else if (response.data.status === "connected") {
          setQrLoading(false);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setShowQRCode(false);
          setMessage({
            type: "success",
            text: "🎉 WhatsApp já está conectado!",
          });
          // Atualiza a instância
          if (response.data.instance) {
            setInstance(response.data.instance);
          }
        }
        // Ainda está abrindo, continua tentando
        else {
          setMessage({
            type: "info",
            text: "⏳ Aguardando QR Code... A instância está sendo preparada.",
          });
        }
      } catch (error: any) {
        console.error("Erro:", error);
        setMessage({
          type: "error",
          text: error.response?.data?.message || "Erro ao buscar QR Code",
        });
        setQrLoading(false);
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    };

    // Primeira tentativa imediata
    await fetchQRCode();

    // Se ainda não tem QR Code e não está conectado, inicia polling
    if (!qrCode && status !== "connected") {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }

      pollingRef.current = setInterval(async () => {
        try {
          const response = await api.get(`/whatsapp/qrcode/${instance.id}`);

          if (response.data.qrCode) {
            setQrCode(response.data.qrCode);
            setQrLoading(false);
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            setMessage({
              type: "success",
              text: "✅ QR Code gerado! Escaneie com seu WhatsApp.",
            });
          } else if (response.data.status === "connected") {
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            setShowQRCode(false);
            setQrLoading(false);
            setMessage({
              type: "success",
              text: "🎉 WhatsApp conectado com sucesso!",
            });
            if (response.data.instance) {
              setInstance(response.data.instance);
            }
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 3000); // Tenta a cada 3 segundos

      // Para o polling após 60 segundos
      setTimeout(() => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setQrLoading(false);
          if (!qrCode) {
            setMessage({
              type: "error",
              text: 'Tempo limite excedido. Clique em "Gerar QR Code" novamente.',
            });
          }
        }
      }, 60000);
    }
  };

  const handleCloseQRCode = () => {
    setShowQRCode(false);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleRefreshQRCode = () => {
    setQrCode(null);
    setQrLoading(true);
    handleGetQRCode();
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-green-600 px-6 py-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            💬 WhatsApp Business
          </h2>
          <p className="text-green-100 text-sm mt-1">
            Crie sua instância e conecte seu WhatsApp
          </p>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Instância *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: WhatsApp Comercial"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Token da Instância *
              </label>
              <input
                type="password"
                value={formData.token}
                onChange={(e) =>
                  setFormData({ ...formData, token: e.target.value })
                }
                placeholder="Token da instância WhatsApp"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Token da instância (ex: senha123)
              </p>
            </div>

            {message && (
              <div
                className={`p-3 rounded-md ${
                  message.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : message.type === "info"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Criando..." : "🚀 Criar Instância WhatsApp"}
            </button>
          </form>

          {instance && (
            <div className="mt-6 p-4 bg-blue-50 rounded-md border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">
                ✅ Instância Criada
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>🆔 ID: {instance.id}</li>
                <li>📛 Nome: {instance.name}</li>
                <li>📊 Status: {status || instance.status}</li>
                <li>🔑 Token: {instance.token}</li>
              </ul>

              <button
                onClick={handleGetQRCode}
                disabled={qrLoading}
                className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {qrLoading ? "Carregando..." : "📱 Gerar QR Code para Conectar"}
              </button>
            </div>
          )}

          {/* Modal do QR Code */}
          {showQRCode && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">
                    📱 Escaneie o QR Code
                  </h3>

                  {qrCode ? (
                    <>
                      <div className="bg-white p-4 rounded-lg inline-block mx-auto">
                        {/* 🔥 O QR Code é um texto que precisa ser convertido para URL de imagem */}
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode)}`}
                          alt="QR Code WhatsApp"
                          className="w-64 h-64 mx-auto"
                        />
                      </div>

                      <div className="mt-4 text-left bg-blue-50 p-4 rounded-md">
                        <p className="text-sm font-semibold text-blue-800 mb-2">
                          Como conectar seu WhatsApp:
                        </p>
                        <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
                          <li>Abra o WhatsApp no seu celular</li>
                          <li>
                            Toque em <strong>Mais opções</strong> (Android) ou{" "}
                            <strong>Configurações</strong> (iPhone)
                          </li>
                          <li>
                            Toque em <strong>Dispositivos conectados</strong>
                          </li>
                          <li>
                            Toque em <strong>Conectar dispositivo</strong>
                          </li>
                          <li>Aponte a câmera para esta tela</li>
                        </ol>
                      </div>
                    </>
                  ) : (
                    <div className="py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-4 text-gray-600">
                        Aguardando QR Code...
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        A instância está sendo preparada. Aguarde até 60
                        segundos.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleRefreshQRCode}
                      disabled={qrLoading}
                      className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
                    >
                      🔄 Atualizar
                    </button>
                    <button
                      onClick={handleCloseQRCode}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h4 className="font-semibold text-gray-700 mb-2">
              📖 Fluxo completo:
            </h4>
            <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
              <li>Preencha o nome da instância</li>
              <li>Informe o token da instância</li>
              <li>Clique em "Criar Instância WhatsApp"</li>
              <li>Após criar, clique em "Gerar QR Code"</li>
              <li>Aguarde alguns segundos até o QR Code aparecer</li>
              <li>Escaneie o QR Code com seu WhatsApp</li>
              <li>Pronto! Seu WhatsApp está conectado</li>
            </ol>
            <p className="text-xs text-gray-500 mt-2">
              ⚠️ O QR Code pode levar alguns segundos para aparecer após criar a
              instância.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
