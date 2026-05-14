/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ForgotPasswordModal } from "@/components/auth/forgot-password-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { motion, Variants } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Network,
  Sparkles,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// ============================================
// BACKGROUND DE REDE INTELIGENTE - ELO PRODUTIVO
// VERSÃO COM MOVIMENTO PREMIUM ACELERADO
// ============================================

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  connections: number[];
  pulsePhase: number;
  type: "core" | "edge" | "industrial";
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
}

interface Connection {
  from: number;
  to: number;
  active: boolean;
  pulsePosition: number;
  strength: number;
  pulseSpeed: number;
}

const ElosBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const timeRef = useRef(0);
  const nodesRef = useRef<Node[]>([]);
  const connectionsRef = useRef<Connection[]>([]);
  const animationRef = useRef<number>(0);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Configuração otimizada
    const HEX_SIZE = 45;
    const HEX_WIDTH = HEX_SIZE * Math.sqrt(3);
    const HEX_HEIGHT = HEX_SIZE * 2;

    const initNetwork = () => {
      const nodes: Node[] = [];
      const width = canvas.width;
      const height = canvas.height;

      // Nós centrais estratégicos com órbitas
      const strategicPoints = [
        {
          x: width * 0.15,
          y: height * 0.3,
          type: "core" as const,
          orbitRadius: 40,
          orbitSpeed: 0.008,
        },
        {
          x: width * 0.85,
          y: height * 0.25,
          type: "core" as const,
          orbitRadius: 45,
          orbitSpeed: 0.01,
        },
        {
          x: width * 0.5,
          y: height * 0.5,
          type: "core" as const,
          orbitRadius: 60,
          orbitSpeed: 0.006,
        },
        {
          x: width * 0.2,
          y: height * 0.7,
          type: "industrial" as const,
          orbitRadius: 30,
          orbitSpeed: 0.012,
        },
        {
          x: width * 0.8,
          y: height * 0.75,
          type: "industrial" as const,
          orbitRadius: 35,
          orbitSpeed: 0.009,
        },
        {
          x: width * 0.35,
          y: height * 0.85,
          type: "edge" as const,
          orbitRadius: 25,
          orbitSpeed: 0.015,
        },
        {
          x: width * 0.65,
          y: height * 0.85,
          type: "edge" as const,
          orbitRadius: 28,
          orbitSpeed: 0.013,
        },
        {
          x: width * 0.5,
          y: height * 0.2,
          type: "core" as const,
          orbitRadius: 50,
          orbitSpeed: 0.007,
        },
        {
          x: width * 0.1,
          y: height * 0.5,
          type: "edge" as const,
          orbitRadius: 22,
          orbitSpeed: 0.014,
        },
        {
          x: width * 0.9,
          y: height * 0.55,
          type: "edge" as const,
          orbitRadius: 24,
          orbitSpeed: 0.011,
        },
      ];

      strategicPoints.forEach((point, i) => {
        nodes.push({
          x: point.x,
          y: point.y,
          vx: (Math.random() - 0.5) * 0.8, // Velocidade aumentada
          vy: (Math.random() - 0.5) * 0.8,
          radius:
            point.type === "core" ? 7 : point.type === "industrial" ? 5.5 : 3.5,
          connections: [],
          pulsePhase: Math.random() * Math.PI * 2,
          type: point.type,
          orbitRadius: point.orbitRadius,
          orbitAngle: Math.random() * Math.PI * 2,
          orbitSpeed: point.orbitSpeed,
        });
      });

      // Adicionar nós em grid hexagonal com movimento
      const startX = HEX_SIZE;
      const startY = HEX_SIZE;
      for (let row = -2; row < Math.ceil(height / HEX_HEIGHT) + 2; row++) {
        for (let col = -2; col < Math.ceil(width / HEX_WIDTH) + 2; col++) {
          const x = startX + col * HEX_WIDTH + (row % 2) * (HEX_WIDTH / 2);
          const y = startY + row * (HEX_SIZE * 1.5);

          if (
            x >= -HEX_SIZE &&
            x <= width + HEX_SIZE &&
            y >= -HEX_SIZE &&
            y <= height + HEX_SIZE
          ) {
            const isDuplicate = nodes.some(
              (n) => Math.hypot(n.x - x, n.y - y) < 40,
            );
            if (!isDuplicate && nodes.length < 180) {
              nodes.push({
                x,
                y,
                vx: (Math.random() - 0.5) * 0.6, // Movimento mais rápido
                vy: (Math.random() - 0.5) * 0.6,
                radius: Math.random() * 2.5 + 2,
                connections: [],
                pulsePhase: Math.random() * Math.PI * 2,
                type: "edge",
                orbitRadius: 0,
                orbitAngle: 0,
                orbitSpeed: 0,
              });
            }
          }
        }
      }

      // Criar conexões inteligentes mais dinâmicas
      const connections: Connection[] = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dist = Math.hypot(
            nodes[i].x - nodes[j].x,
            nodes[i].y - nodes[j].y,
          );
          const maxDist =
            nodes[i].type === "core"
              ? 280
              : nodes[i].type === "industrial"
                ? 220
                : 170;

          if (dist < maxDist && connections.length < 500) {
            let strength = 0;
            if (nodes[i].type === "core" && nodes[j].type === "core")
              strength = 0.95;
            else if (nodes[i].type === "core" || nodes[j].type === "core")
              strength = 0.75;
            else if (
              nodes[i].type === "industrial" ||
              nodes[j].type === "industrial"
            )
              strength = 0.55;
            else strength = 0.35;

            connections.push({
              from: i,
              to: j,
              active: Math.random() > 0.2,
              pulsePosition: Math.random(),
              strength,
              pulseSpeed: 0.003 + Math.random() * 0.004, // Velocidades diferentes por conexão
            });
          }
        }
      }

      nodesRef.current = nodes;
      connectionsRef.current = connections;
    };

    // Desenhar hexágonos com animação mais rápida
    const drawHexagon = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      size: number,
      glow: number,
      time: number,
    ) => {
      const angles = [0, 60, 120, 180, 240, 300];
      const pulse = Math.sin(time * 2 + x * 0.01 + y * 0.01) * 0.3 + 0.7;
      const points = angles.map((angle) => ({
        x: x + size * Math.cos((angle * Math.PI) / 180),
        y: y + size * Math.sin((angle * Math.PI) / 180),
      }));

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.closePath();

      ctx.strokeStyle = `rgba(47, 128, 237, ${0.15 + glow * 0.2 * pulse})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = `rgba(47, 128, 237, ${glow * 0.05 * pulse})`;
      ctx.fill();
    };

    // Efeito de onda pulsante com movimento mais perceptível
    const drawPulseWave = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      radius: number,
      phase: number,
      time: number,
    ) => {
      const pulseSpeed = 3;
      const pulseRadius = Math.max(
        1.5,
        radius + Math.sin(phase * pulseSpeed) * 4,
      );

      ctx.beginPath();
      ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 230, 255, ${0.25 + Math.sin(phase * 2) * 0.12})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, pulseRadius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 230, 255, ${0.35})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Segundo anel para mais movimento
      ctx.beginPath();
      ctx.arc(x, y, pulseRadius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 200, 255, 0.15)`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    };

    // Desenhar conexões com fluxo muito mais perceptível
    const drawConnection = (
      ctx: CanvasRenderingContext2D,
      from: Node,
      to: Node,
      connection: Connection,
      time: number,
    ) => {
      const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
      const opacity = connection.active ? 0.55 : 0.2;
      const flowIntensity = Math.sin(time * 3) * 0.3 + 0.7;

      let color1, color2;
      if (connection.strength > 0.7) {
        color1 = `rgba(0, 240, 255, ${opacity * flowIntensity})`;
        color2 = `rgba(47, 128, 237, ${opacity})`;
      } else if (connection.strength > 0.4) {
        color1 = `rgba(47, 128, 237, ${opacity * flowIntensity})`;
        color2 = `rgba(0, 200, 230, ${opacity})`;
      } else {
        color1 = `rgba(0, 180, 220, ${opacity * 0.8})`;
        color2 = `rgba(47, 128, 237, ${opacity * 0.6})`;
      }

      gradient.addColorStop(0, color1);
      gradient.addColorStop(1, color2);

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = Math.max(0.8, connection.strength * 1.8);
      ctx.stroke();

      // Pulso viajante mais visível e rápido
      if (connection.active) {
        const pulsePos =
          (connection.pulsePosition + time * connection.pulseSpeed) % 1;
        const midX = from.x + (to.x - from.x) * pulsePos;
        const midY = from.y + (to.y - from.y) * pulsePos;

        // Pulso principal
        ctx.beginPath();
        ctx.arc(midX, midY, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 230, 255, ${0.8 + Math.sin(time * 8) * 0.2})`;
        ctx.fill();

        // Glow do pulso
        ctx.beginPath();
        ctx.arc(midX, midY, 6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 200, 255, 0.25)`;
        ctx.fill();

        // Rastro do pulso
        const trailPos =
          (connection.pulsePosition + time * connection.pulseSpeed - 0.05 + 1) %
          1;
        const trailX = from.x + (to.x - from.x) * trailPos;
        const trailY = from.y + (to.y - from.y) * trailPos;
        ctx.beginPath();
        ctx.arc(trailX, trailY, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 200, 255, 0.4)`;
        ctx.fill();
      }
    };

    // Animação principal com movimento acelerado
    const animate = () => {
      if (!ctx || !canvas) return;

      const width = canvas.width;
      const height = canvas.height;
      const time = Date.now() * 0.0025; // Velocidade base aumentada
      timeRef.current = time;
      frameRef.current++;

      // Fundo com gradiente dinâmico mais rápido
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      const t = time * 0.15;
      gradient.addColorStop(0, `hsl(${210 + Math.sin(t) * 8}, 35%, 6%)`);
      gradient.addColorStop(
        0.5,
        `hsl(${218 + Math.cos(t * 0.9) * 8}, 35%, 8%)`,
      );
      gradient.addColorStop(1, `hsl(${225 + Math.sin(t * 0.7) * 8}, 35%, 5%)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Grid de hexágonos animados mais rápido
      const hexSize = 38;
      for (let i = -hexSize; i < width + hexSize; i += hexSize * 1.7) {
        for (let j = -hexSize; j < height + hexSize; j += hexSize * 1.5) {
          const glow = Math.sin(time * 1.5 + i * 0.03 + j * 0.03) * 0.6 + 0.4;
          drawHexagon(ctx, i, j, hexSize * 0.65, glow, time);
        }
      }

      // Atualizar nós com movimento muito mais perceptível
      nodesRef.current.forEach((node) => {
        // Movimento orbital para nós estratégicos
        if (node.orbitRadius > 0) {
          node.orbitAngle += node.orbitSpeed;
          const centerX = canvas.width * (node.type === "core" ? 0.5 : 0.3);
          const centerY = canvas.height * (node.type === "core" ? 0.5 : 0.4);
          node.x = centerX + Math.cos(node.orbitAngle) * node.orbitRadius;
          node.y = centerY + Math.sin(node.orbitAngle) * node.orbitRadius;
        } else {
          // Movimento browniano acelerado
          node.x += node.vx;
          node.y += node.vy;
        }

        // Bounce suave nas bordas
        if (node.x < -30) node.x = width + 30;
        if (node.x > width + 30) node.x = -30;
        if (node.y < -30) node.y = height + 30;
        if (node.y > height + 30) node.y = -30;

        // Interação com mouse mais responsiva
        const dx = mouseRef.current.x - node.x;
        const dy = mouseRef.current.y - node.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 200 && dist > 5) {
          const angle = Math.atan2(dy, dx);
          const force = (200 - dist) / 2000;
          node.x -= Math.cos(angle) * force;
          node.y -= Math.sin(angle) * force;
        }

        node.pulsePhase += 0.035; // Pulso mais rápido
        if (node.pulsePhase > Math.PI * 2) node.pulsePhase -= Math.PI * 2;
      });

      // Desenhar conexões
      connectionsRef.current.forEach((conn) => {
        const from = nodesRef.current[conn.from];
        const to = nodesRef.current[conn.to];
        if (from && to) {
          drawConnection(ctx, from, to, conn, time);
        }
      });

      // Desenhar nós com glow dinâmico
      nodesRef.current.forEach((node) => {
        const glowIntensity = Math.sin(node.pulsePhase * 1.5) * 0.6 + 0.5;

        ctx.shadowBlur = 15;
        ctx.shadowColor = `rgba(0, 200, 255, ${0.3 + glowIntensity * 0.25})`;

        ctx.beginPath();
        ctx.arc(node.x, node.y, Math.max(0.8, node.radius), 0, Math.PI * 2);

        if (node.type === "core") {
          ctx.fillStyle = `rgba(0, 210, 255, ${0.75 + glowIntensity * 0.35})`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(
            node.x,
            node.y,
            Math.max(0.8, node.radius + 2.5),
            0,
            Math.PI * 2,
          );
          ctx.fillStyle = `rgba(0, 200, 255, 0.2)`;
          ctx.fill();
        } else if (node.type === "industrial") {
          ctx.fillStyle = `rgba(47, 128, 237, ${0.65 + glowIntensity * 0.25})`;
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(0, 180, 230, ${0.45 + glowIntensity * 0.2})`;
          ctx.fill();
        }

        // Pulso com movimento mais perceptível
        drawPulseWave(ctx, node.x, node.y, node.radius, node.pulsePhase, time);

        // Anel extra para nós centrais
        if (node.type === "core") {
          ctx.beginPath();
          const ringRadius = Math.max(
            2,
            node.radius + 6 + Math.sin(node.pulsePhase * 2.5) * 1.5,
          );
          ctx.arc(node.x, node.y, ringRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0, 230, 255, 0.35)`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      });

      ctx.shadowBlur = 0;

      // Partículas flutuantes extras mais dinâmicas
      for (let i = 0; i < 45; i++) {
        const speed = time * 0.4;
        const x = (Math.sin(speed + i * 0.8) * 0.6 + 0.5) * width;
        const y = (Math.cos(speed * 0.7 + i * 0.6) * 0.6 + 0.5) * height;
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 200, 255, ${0.15 + Math.sin(time * 3 + i) * 0.08})`;
        ctx.fill();

        // Rastro das partículas
        ctx.beginPath();
        ctx.arc(x - 2, y - 2, 1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 180, 230, 0.08)`;
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initNetwork();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ pointerEvents: "none" }}
    />
  );
};

// ============================================
// DASHBOARD MOCKUP FLUTUANTE (mantido igual)
// ============================================

const FloatingDashboard = () => {
  const features = [
    {
      title: "Kanban de Produção",
      description: "Visão em tempo real do processo produtivo",
      icon: Network,
      color: "#2F80ED",
    },
    {
      title: "Otimização de Rotas",
      description: "Menos quilometragem e tempo de entrega",
      icon: Zap,
      color: "#00E5FF",
    },
    {
      title: "Notificações Automáticas",
      description: "Menos tempo gasto respondendo no WhatsApp",
      icon: Cpu,
      color: "#00C9FF",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="relative z-20 w-full max-w-md mx-auto"
    >
      <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Network className="w-5 h-5 text-[#00C9FF]" />
                Solução Integrada para Produção
              </h3>
            </div>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-[#00E5FF]/80 animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-[#2F80ED]/60" />
              <div className="w-2 h-2 rounded-full bg-[#00C9FF]/40" />
            </div>
          </div>

          <div className="space-y-4 mb-6">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + idx * 0.1, duration: 0.5 }}
                className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="p-2 rounded-lg shrink-0"
                    style={{ backgroundColor: `${feature.color}20` }}
                  >
                    <feature.icon
                      className="w-5 h-5"
                      style={{ color: feature.color }}
                    />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-base">
                      {feature.title}
                    </p>
                    <p className="text-white/50 text-sm mt-0.5 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-white/50 text-xs">
              <span>Produtividade</span>
              <span className="text-[#00E5FF]">Sistema em operação</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.8, duration: 0.8 }}
                className="h-full rounded-full bg-gradient-to-r from-[#2F80ED] to-[#00E5FF]"
              />
            </div>
          </div>

          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="mt-4 text-center"
          >
            <span className="text-white/30 text-xs flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 animate-pulse" />
              Sistema Integrado | Monitoramento Contínuo
            </span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// TELA DE LOGIN PRINCIPAL
// ============================================

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setIsPageLoaded(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.3 },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  const floatingCardVariants: any = {
    initial: { y: 0, rotateX: 0 },
    animate: {
      y: [0, -10, 0],
      transition: { duration: 6, repeat: Infinity, ease: "easeInOut" },
    },
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0A0E1A]">
      <ElosBackground />
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/20" />

      <div className="relative z-10 min-h-screen w-full lg:grid lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={isPageLoaded ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
          className="hidden lg:flex flex-col justify-center items-center relative p-12 min-h-screen"
        >
          <div className="absolute top-20 left-20 w-72 h-72 bg-[#2F80ED]/20 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#00C9FF]/20 rounded-full blur-[120px]" />

          <div className="relative z-20 w-full max-w-lg mx-auto space-y-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20"
            >
              <Network className="w-4 h-4 text-[#00E5FF]" />
              <span className="text-white/80 text-sm font-medium">
                Rede Inteligente | Industrial 4.0
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="space-y-4"
            >
              <h1 className="text-5xl font-bold text-white leading-tight">
                <span className="bg-gradient-to-r from-[#2F80ED] via-[#00C9FF] to-[#00E5FF] bg-clip-text text-transparent">
                  ELOSPRO
                </span>
              </h1>
              <p className="text-white/60 text-lg leading-relaxed">
                Ecossistema inteligente que conecta pessoas, processos e
                tecnologia para potencializar sua produção industrial.
              </p>
            </motion.div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {[
                "Conexão em tempo real",
                "Automação industrial",
                "Fluxo produtivo inteligente",
                "Rede integrada",
              ].map((feature, idx) => (
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  className="flex items-center gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-[#00E5FF]" />
                  <span className="text-white/70">{feature}</span>
                </motion.div>
              ))}
            </motion.div>

            <FloatingDashboard />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={isPageLoaded ? { opacity: 1, x: 0 } : {}}
          transition={{
            duration: 0.8,
            type: "spring",
            stiffness: 100,
            delay: 0.2,
          }}
          className="flex items-center justify-center p-6 lg:p-8 min-h-screen"
        >
          <motion.div
            variants={floatingCardVariants}
            initial="initial"
            animate="animate"
            className="w-full max-w-[460px]"
          >
            <div className="relative backdrop-blur-2xl bg-white/5 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20" />
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#2F80ED]/20 via-[#00C9FF]/20 to-[#2F80ED]/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative p-8 lg:p-10">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="text-center space-y-4 mb-8"
                >
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#2F80ED] to-[#00C9FF] rounded-2xl flex items-center justify-center shadow-lg shadow-[#2F80ED]/20">
                    <Network className="w-8 h-8 text-white" />
                  </div>

                  <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">
                      Acesse sua conta
                    </h2>
                    <p className="text-white/50 mt-2">
                      Conecte-se ao ecossistema inteligente
                    </p>
                  </div>
                </motion.div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="space-y-2 group"
                  >
                    <Label className="text-white/70 text-sm font-medium">
                      E-mail Corporativo
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-[#00E5FF] transition-colors" />
                      <Input
                        type="email"
                        required
                        placeholder="seu@empresa.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:border-[#00E5FF]/50 focus:ring-2 focus:ring-[#00E5FF]/20 transition-all duration-300"
                      />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <Label className="text-white/70 text-sm font-medium">
                        Senha
                      </Label>
                      <ForgotPasswordModal>
                        <button
                          type="button"
                          className="text-xs text-[#00E5FF] hover:text-[#00C9FF] transition-colors"
                        >
                          Esqueceu?
                        </button>
                      </ForgotPasswordModal>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-[#00E5FF] transition-colors" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-12 pr-12 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:border-[#00E5FF]/50 focus:ring-2 focus:ring-[#00E5FF]/20 transition-all duration-300"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-[#00E5FF] transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                  >
                    <Button
                      type="submit"
                      disabled={loading || !email || !password}
                      className="relative w-full h-12 bg-gradient-to-r from-[#2F80ED] to-[#00C9FF] hover:from-[#3498DB] hover:to-[#00E5FF] text-white font-semibold rounded-xl shadow-lg shadow-[#2F80ED]/25 hover:shadow-[#00C9FF]/40 transition-all duration-300 overflow-hidden group"
                    >
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Conectando...
                        </>
                      ) : (
                        <>
                          Conectar ao Sistema
                          <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  </motion.div>
                </form>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="mt-8 pt-6 text-center border-t border-white/10"
                >
                  <p className="text-white/30 text-xs">
                    Rede inteligente com criptografia de ponta a ponta
                  </p>
                  <p className="text-white/20 text-xs mt-2">
                    ELOSPRO © 2024 | Ecossistema Industrial 4.0
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
