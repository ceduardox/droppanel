import { useState } from "react";
import AuthForm from "../AuthForm";

export default function AuthFormExample() {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <AuthForm
        mode={mode}
        onToggleMode={() => setMode(mode === "login" ? "register" : "login")}
        onSubmit={(data) => console.log("Auth submitted:", data)}
      />
    </div>
  );
}
