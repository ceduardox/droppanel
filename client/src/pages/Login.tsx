import { useState } from "react";
import { useLocation } from "wouter";
import AuthForm from "@/components/AuthForm";
import { useLogin, useRegister } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const handleSubmit = async (data: { name?: string; username: string; password: string }) => {
    try {
      if (mode === "register") {
        await registerMutation.mutateAsync(data as { name: string; username: string; password: string });
        toast({ title: "¡Registro exitoso!", description: "Bienvenido al sistema" });
      } else {
        await loginMutation.mutateAsync(data);
        toast({ title: "¡Sesión iniciada!", description: "Bienvenido de vuelta" });
      }
      setLocation("/dashboard");
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Ocurrió un error", 
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <AuthForm
        mode={mode}
        onToggleMode={() => setMode(mode === "login" ? "register" : "login")}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
