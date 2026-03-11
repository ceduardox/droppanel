import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, User } from "lucide-react";

interface AuthFormProps {
  mode: "login" | "register";
  onToggleMode: () => void;
  onSubmit: (data: { name?: string; username: string; password: string }) => void;
  showModeToggle?: boolean;
}

export default function AuthForm({ mode, onToggleMode, onSubmit, showModeToggle = true }: AuthFormProps) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(mode === "register" ? { name, username, password } : { username, password });
  };

  return (
    <Card className="w-full max-w-md rounded-2xl border-card-border/80 bg-card/90 shadow-xl backdrop-blur">
      <CardHeader className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {mode === "login" ? "Acceso" : "Nuevo Usuario"}
        </p>
        <CardTitle className="text-3xl font-semibold">
          {mode === "login" ? "Iniciar Sesion" : "Crear Cuenta"}
        </CardTitle>
        <CardDescription>
          {mode === "login"
            ? "Ingresa tus credenciales para continuar"
            : "Registra tu cuenta para empezar a gestionar ventas"}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="name">Nombre Completo</Label>
              <Input
                id="name"
                data-testid="input-name"
                type="text"
                placeholder="Juan Perez"
                className="h-11 rounded-xl border-input/80 bg-background/90"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">Nombre de Usuario</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="username"
                data-testid="input-username"
                type="text"
                placeholder="usuario123"
                className="h-11 rounded-xl border-input/80 bg-background/90 pl-10"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contrasena</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                data-testid="input-password"
                type="password"
                placeholder="********"
                className="h-11 rounded-xl border-input/80 bg-background/90 pl-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="h-11 w-full rounded-xl text-sm font-semibold" data-testid="button-submit">
            {mode === "login" ? "Entrar al Panel" : "Crear Cuenta"}
          </Button>
          {showModeToggle && (
            <p className="text-center text-sm text-muted-foreground">
              {mode === "login" ? "No tienes cuenta? " : "Ya tienes cuenta? "}
              <button
                type="button"
                onClick={onToggleMode}
                className="font-semibold text-primary hover:underline"
                data-testid="button-toggle-mode"
              >
                {mode === "login" ? "Registrate aqui" : "Inicia sesion aqui"}
              </button>
            </p>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
