import SalesForm from "@/components/SalesForm";
import { useProducts, useCreateSale } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Sales() {
  const { data: products = [], isLoading } = useProducts();
  const createSale = useCreateSale();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSubmit = async (data: { productId: string; quantity: number; date: string }) => {
    try {
      await createSale.mutateAsync(data);
      toast({ 
        title: "Venta registrada", 
        description: "La venta ha sido registrada exitosamente" 
      });
      // Redirect to reports after successful sale
      setTimeout(() => setLocation("/reportes"), 1000);
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Error al registrar venta", 
        variant: "destructive" 
      });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>;
  }

  const formattedProducts = products.map((p: any) => ({
    id: p.id,
    name: p.name,
    price: parseFloat(p.price),
    cost: parseFloat(p.cost),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Registrar Venta</h1>
        <p className="text-muted-foreground mt-1">Ingresa los detalles de la nueva venta</p>
      </div>

      {formattedProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Primero debes agregar productos</p>
        </div>
      ) : (
        <SalesForm products={formattedProducts} onSubmit={handleSubmit} />
      )}
    </div>
  );
}
