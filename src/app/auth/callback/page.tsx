// app/auth/callback/page.tsx
'use client';

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Erro na sessão:", error);
          router.replace("/login?error=auth_failed");
          return;
        }

        if (data?.session) {
          console.log("✅ Sessão confirmada, usuário:", data.session.user.email);
          router.replace("/dashboard");
        } else {
          console.log("❌ Nenhuma sessão encontrada");
          router.replace("/login");
        }
      } catch (err) {
        console.error("Erro no callback:", err);
        router.replace("/login?error=callback_failed");
      }
    };

    handleCallback();
  }, [router, supabase]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-gray-800 mb-2">
          Confirmando seu acesso...
        </h1>
        <p className="text-gray-600">
          Aguarde enquanto finalizamos a confirmação do seu email.
        </p>
      </div>
    </div>
  );
}