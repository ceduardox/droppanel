import { useState } from "react";
import { useLocation } from "wouter";
import AuthForm from "@/components/AuthForm";

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [, setLocation] = useLocation();

  const handleSubmit = (data: { name?: string; username: string; password: string }) => {
    console.log("Auth submitted:", data);
    // TODO: Replace with actual authentication logic
    setLocation("/dashboard");
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
