/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { ForgotPasswordModal } from "@/components/auth/forgot-password-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Network,
  WifiOff,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ============================================
// BACKGROUND DE PARTÍCULAS CONECTADAS - REDE NEURAL
// ============================================

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  connections: number[];
  pulsePhase: number;
}

interface Connection {
  from: number;
  to: number;
  distance: number;
  strength: number;
}

type ApiHealthState = "checking" | "online" | "offline";

const NeuralNetworkBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const nodesRef = useRef<Node[]>([]);
  const connectionsRef = useRef<Connection[]>([]);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const NODE_COUNT = 100;
    const CONNECTION_DISTANCE = 200;
    const MOUSE_RADIUS = 250;
    const SPEED = 0.25;

    const initNetwork = () => {
      const width = canvas.width;
      const height = canvas.height;
      const nodes: Node[] = [];
      const connections: Connection[] = [];

      for (let i = 0; i < NODE_COUNT; i++) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * SPEED,
          vy: (Math.random() - 0.5) * SPEED,
          radius: Math.random() * 3 + 2,
          connections: [],
          pulsePhase: Math.random() * Math.PI * 2,
        });
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dist = Math.hypot(
            nodes[i].x - nodes[j].x,
            nodes[i].y - nodes[j].y
          );
          if (dist < CONNECTION_DISTANCE) {
            const strength = 1 - dist / CONNECTION_DISTANCE;
            connections.push({
              from: i,
              to: j,
              distance: dist,
              strength: strength,
            });
            nodes[i].connections.push(j);
            nodes[j].connections.push(i);
          }
        }
      }

      nodesRef.current = nodes;
      connectionsRef.current = connections;
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initNetwork();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    const draw = () => {
      if (!ctx || !canvas) return;

      const width = canvas.width;
      const height = canvas.height;
      const time = Date.now() * 0.002;
      timeRef.current = time;

      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#0A0E1A");
      gradient.addColorStop(1, "#0D1222");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      nodesRef.current.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0) {
          node.x = 0;
          node.vx *= -1;
        }
        if (node.x > width) {
          node.x = width;
          node.vx *= -1;
        }
        if (node.y < 0) {
          node.y = 0;
          node.vy *= -1;
        }
        if (node.y > height) {
          node.y = height;
          node.vy *= -1;
        }

        const dx = mouseRef.current.x - node.x;
        const dy = mouseRef.current.y - node.y;
        const dist = Math.hypot(dx, dy);

        if (dist < MOUSE_RADIUS && dist > 5) {
          const angle = Math.atan2(dy, dx);
          const force = ((MOUSE_RADIUS - dist) / MOUSE_RADIUS) * 1.5;
          node.x -= Math.cos(angle) * force;
          node.y -= Math.sin(angle) * force;
        }

        node.pulsePhase += 0.02;
      });

      connectionsRef.current.forEach((conn) => {
        const from = nodesRef.current[conn.from];
        const to = nodesRef.current[conn.to];
        if (from && to) {
          const currentDist = Math.hypot(from.x - to.x, from.y - to.y);
          conn.distance = currentDist;
          conn.strength = Math.max(0, 1 - currentDist / CONNECTION_DISTANCE);
        }
      });

      connectionsRef.current.forEach((conn) => {
        const from = nodesRef.current[conn.from];
        const to = nodesRef.current[conn.to];
        if (!from || !to) return;
        
        if (conn.strength <= 0.05) return;

        const opacity = Math.min(0.7, conn.strength * 0.8);
        const lineWidth = Math.max(0.8, conn.strength * 2.5);
        
        const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
        
        if (conn.strength > 0.5) {
          gradient.addColorStop(0, `rgba(0, 210, 255, ${opacity})`);
          gradient.addColorStop(1, `rgba(47, 128, 237, ${opacity})`);
        } else {
          gradient.addColorStop(0, `rgba(47, 128, 237, ${opacity * 0.7})`);
          gradient.addColorStop(1, `rgba(0, 180, 230, ${opacity * 0.7})`);
        }
        
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = lineWidth;
        ctx.stroke();

        if (conn.strength > 0.6) {
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.strokeStyle = `rgba(0, 230, 255, ${opacity * 0.3})`;
          ctx.lineWidth = lineWidth + 1.5;
          ctx.stroke();
        }

        if (conn.strength > 0.3) {
          const pulsePos = (time * 0.8 + conn.from * 0.01) % 1;
          const midX = from.x + (to.x - from.x) * pulsePos;
          const midY = from.y + (to.y - from.y) * pulsePos;
          
          ctx.beginPath();
          ctx.arc(midX, midY, 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 230, 255, ${opacity * 0.9})`;
          ctx.fill();
          
          ctx.beginPath();
          ctx.arc(midX, midY, 5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 200, 255, ${opacity * 0.3})`;
          ctx.fill();
        }
      });

      nodesRef.current.forEach((node) => {
        const dx = mouseRef.current.x - node.x;
        const dy = mouseRef.current.y - node.y;
        const distToMouse = Math.hypot(dx, dy);
        const isNearMouse = distToMouse < MOUSE_RADIUS;
        
        ctx.shadowBlur = isNearMouse ? 12 : 6;
        ctx.shadowColor = `rgba(0, 200, 255, ${isNearMouse ? 0.6 : 0.3})`;
        
        const pulse = Math.sin(node.pulsePhase) * 0.3 + 0.7;
        const currentRadius = node.radius * (0.8 + pulse * 0.3);
        
        ctx.beginPath();
        ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
        
        if (isNearMouse) {
          ctx.fillStyle = `rgba(0, 230, 255, 0.95)`;
        } else if (node.connections.length > 5) {
          ctx.fillStyle = `rgba(0, 200, 255, 0.85)`;
        } else {
          ctx.fillStyle = `rgba(47, 128, 237, 0.75)`;
        }
        
        ctx.fill();
        
        if (node.connections.length > 6) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, currentRadius + 3, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0, 230, 255, 0.4)`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
      
      ctx.shadowBlur = 0;

      animationRef.current = requestAnimationFrame(draw);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
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
// COMPONENTE DO FORMULÁRIO COM BRILHO NA BORDA
// ============================================

const LoginCard = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiHealth, setApiHealth] = useState<ApiHealthState>("checking");
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const { login } = useAuth();

  useEffect(() => {
    let isMounted = true;

    fetch("/api/backend-health", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (!isMounted) return;
        setApiHealth(data?.status === "ok" ? "online" : "offline");
      })
      .catch(() => {
        if (isMounted) setApiHealth("offline");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
    } catch {
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="relative w-full max-w-[460px]"
    >
      {/* Efeito de brilho na borda seguindo o mouse */}
      {isHovering && (
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none transition-opacity duration-150"
          style={{
            background: `radial-gradient(circle 120px at ${mousePosition.x}px ${mousePosition.y}px, 
              rgba(0, 230, 255, 0.4) 0%, 
              rgba(0, 200, 255, 0.2) 40%, 
              transparent 70%)`,
          }}
        />
      )}
      
      {/* Brilho externo na borda (glow) */}
      <div 
        className="absolute -inset-[1px] rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: isHovering 
            ? `radial-gradient(circle 150px at ${mousePosition.x}px ${mousePosition.y}px, 
                rgba(0, 230, 255, 0.5) 0%, 
                rgba(0, 200, 255, 0.2) 50%, 
                transparent 80%)`
            : "none",
          filter: "blur(8px)",
        }}
      />

      <div className="relative backdrop-blur-2xl bg-white/5 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20" />
        
        {/* Borda com gradiente animado que segue o mouse */}
        <div 
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            border: "1px solid transparent",
            background: isHovering
              ? `radial-gradient(circle 120px at ${mousePosition.x}px ${mousePosition.y}px, 
                  rgba(0, 230, 255, 0.8) 0%, 
                  rgba(0, 200, 255, 0.3) 30%, 
                  transparent 70%) border-box`
              : "none",
            WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        />

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
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50">
              {apiHealth === "online" ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
              ) : apiHealth === "offline" ? (
                <WifiOff className="h-3.5 w-3.5 text-rose-300" />
              ) : (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-300" />
              )}
              <span>
                API{" "}
                {apiHealth === "checking"
                  ? "verificando"
                  : apiHealth === "online"
                    ? "online"
                    : "offline"}
              </span>
            </div>
            <p className="text-white/20 text-xs mt-2">
              © 2024 | Ecossistema Industrial 4.0
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// TELA DE LOGIN PRINCIPAL
// ============================================

export default function LoginPage() {
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  useEffect(() => {
    setIsPageLoaded(true);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0A0E1A]">
      <NeuralNetworkBackground />
      <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-transparent to-black/10" />

      <div className="relative z-10 min-h-screen w-full flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isPageLoaded ? { opacity: 1, y: 0 } : {}}
          transition={{
            duration: 0.6,
            type: "spring",
            stiffness: 120,
            damping: 20,
          }}
          className="flex items-center justify-center p-6 lg:p-8 w-full"
        >
          <LoginCard />
        </motion.div>
      </div>
    </div>
  );
}
