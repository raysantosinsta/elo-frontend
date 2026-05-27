// app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#2F80ED] via-[#1E5CB8] to-[#0E3A6B] flex items-center justify-center p-6">
      {children}
    </div>
  );
}