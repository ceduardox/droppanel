import { useLocation } from "wouter";
import { ShieldCheck, TrendingUp, Wallet } from "lucide-react";
import AuthForm from "@/components/AuthForm";
import { useLogin } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const loginMutation = useLogin();

  const handleSubmit = async (data: { name?: string; username: string; password: string }) => {
    try {
      await loginMutation.mutateAsync(data);
      toast({ title: "Sesion iniciada", description: "Bienvenido de vuelta" });
      await new Promise((resolve) => setTimeout(resolve, 100));
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ocurrio un error",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_15%,hsl(var(--primary)/0.18),transparent_35%),radial-gradient(circle_at_90%_0%,hsl(192_88%_45%/0.14),transparent_35%)]" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl gap-8 px-4 py-8 md:grid-cols-[1.05fr_0.95fr] md:items-center md:px-8">
        <section className="hidden md:block">
          <div className="max-w-xl space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Dropanel Pro</p>
            <h1 className="text-4xl font-semibold leading-tight text-foreground">
              Gestion de ventas clara, rapida y profesional.
            </h1>
            <p className="text-base text-muted-foreground">
              Controla ingresos, costos y reportes desde un solo panel con una interfaz optimizada para trabajo diario.
            </p>

            <div className="grid gap-3 pt-2">
              <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/75 px-4 py-3 backdrop-blur">
                <Wallet className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Control financiero por fecha y categoria</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/75 px-4 py-3 backdrop-blur">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Reportes listos para decision comercial</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/75 px-4 py-3 backdrop-blur">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Acceso con sesion segura por usuario</span>
              </div>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-center">
          <AuthForm
            mode="login"
            onToggleMode={() => {}}
            showModeToggle={false}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}
