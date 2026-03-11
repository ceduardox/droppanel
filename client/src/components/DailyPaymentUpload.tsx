import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useDailyPayment, useSaveDailyPayment } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle, Image as ImageIcon, Eye } from "lucide-react";

interface DailyPaymentUploadProps {
  selectedDate: string;
}

interface DailyPayment {
  id: string;
  paymentDate: string;
  imageComisionUrl?: string;
  imageCostoUrl?: string;
  isPaid: number;
  userId: string;
}

export default function DailyPaymentUpload({ selectedDate }: DailyPaymentUploadProps) {
  const { data: payment, refetch } = useDailyPayment(selectedDate);
  const saveMutation = useSaveDailyPayment();
  const { toast } = useToast();

  const [imageComision, setImageComision] = useState<File | null>(null);
  const [imageCosto, setImageCosto] = useState<File | null>(null);
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    if (payment) {
      setIsPaid(!!(payment as DailyPayment).isPaid);
    } else {
      setIsPaid(false);
    }
  }, [payment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate) {
      toast({
        title: "Error",
        description: "Selecciona una fecha primero",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("paymentDate", selectedDate);
    formData.append("isPaid", isPaid ? "1" : "0");

    if (imageComision) {
      formData.append("imageComision", imageComision);
    }
    if (imageCosto) {
      formData.append("imageCosto", imageCosto);
    }

    try {
      await saveMutation.mutateAsync(formData);
      toast({
        title: "Guardado",
        description: "Comprobantes guardados exitosamente",
      });
      setImageComision(null);
      setImageCosto(null);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al guardar comprobantes",
        variant: "destructive",
      });
    }
  };

  if (!selectedDate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comprobantes de Pago</CardTitle>
          <CardDescription>Selecciona una fecha para gestionar comprobantes</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Comprobantes de Pago
          {(payment as DailyPayment)?.isPaid && <CheckCircle className="h-5 w-5 text-green-600" />}
        </CardTitle>
        <CardDescription>Sube comprobantes del dia seleccionado</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 min-w-0">
              <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                <Label htmlFor="imageComision" className="break-words">
                  Comprobante Comision Jose Eduardo
                  {(payment as DailyPayment)?.imageComisionUrl && " - OK"}
                </Label>

                {(payment as DailyPayment)?.imageComisionUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`/api/storage/${(payment as DailyPayment).imageComisionUrl}`, "_blank")}
                    data-testid="button-view-comision"
                  >
                    <Eye className="mr-1 h-4 w-4" />
                    Ver
                  </Button>
                )}
              </div>

              <Input
                id="imageComision"
                type="file"
                accept="image/*"
                onChange={(e) => setImageComision(e.target.files?.[0] || null)}
                data-testid="input-comision"
              />

              {(payment as DailyPayment)?.imageComisionUrl && !imageComision && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ImageIcon className="h-3 w-3" />
                  Ya existe comprobante guardado
                </p>
              )}
            </div>

            <div className="space-y-2 min-w-0">
              <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                <Label htmlFor="imageCosto" className="break-words">
                  Comprobante Pago Producto
                  {(payment as DailyPayment)?.imageCostoUrl && " - OK"}
                </Label>

                {(payment as DailyPayment)?.imageCostoUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`/api/storage/${(payment as DailyPayment).imageCostoUrl}`, "_blank")}
                    data-testid="button-view-costo"
                  >
                    <Eye className="mr-1 h-4 w-4" />
                    Ver
                  </Button>
                )}
              </div>

              <Input
                id="imageCosto"
                type="file"
                accept="image/*"
                onChange={(e) => setImageCosto(e.target.files?.[0] || null)}
                data-testid="input-costo"
              />

              {(payment as DailyPayment)?.imageCostoUrl && !imageCosto && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ImageIcon className="h-3 w-3" />
                  Ya existe comprobante guardado
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPaid"
              checked={isPaid}
              onCheckedChange={(checked) => setIsPaid(checked === true)}
              data-testid="checkbox-paid"
            />
            <Label htmlFor="isPaid" className="cursor-pointer">
              Marcar como pagado
            </Label>
          </div>

          <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-payment">
            <Upload className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? "Guardando..." : "Guardar Comprobantes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
