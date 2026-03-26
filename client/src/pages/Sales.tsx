import SalesForm from "@/components/SalesForm";
import { useCreateSale, useDirectors, useProducts, useSellers } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Sales() {
  const { data: products = [], isLoading } = useProducts();
  const { data: directors = [], isLoading: loadingDirectors } = useDirectors();
  const { data: sellers = [], isLoading: loadingSellers } = useSellers();
  const createSale = useCreateSale();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSubmit = async (data: {
    productId: string;
    quantity: number;
    date: string;
    unitPrice: number;
    unitTransport: number;
    sellerId?: string | null;
    directorId?: string | null;
  }) => {
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

  if (loadingDirectors || loadingSellers) {
    return <div className="flex items-center justify-center h-64">Cargando equipo comercial...</div>;
  }

  const activeProducts = (products as any[]).filter((p: any) => p.isActive !== false);
  const activeDirectors = (directors as any[]).filter((d: any) => d.isActive !== false);
  const activeSellers = (sellers as any[]).filter((s: any) => s.isActive !== false);

  const formattedProducts = activeProducts.map((p: any) => ({
    id: p.id,
    name: p.name,
    price: parseFloat(p.price),
    cost: parseFloat(p.cost),
    baseCost: p.baseCost !== null && p.baseCost !== undefined ? parseFloat(p.baseCost) : null,
    costTransport: p.costTransport !== null && p.costTransport !== undefined ? parseFloat(p.costTransport) : 0,
  }));

  const formattedDirectors = activeDirectors.map((d: any) => ({
    id: d.id,
    name: d.name,
  }));

  const formattedSellers = activeSellers.map((s: any) => ({
    id: s.id,
    name: s.name,
    directorId: s.directorId || null,
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
        <SalesForm
          products={formattedProducts}
          directors={formattedDirectors}
          sellers={formattedSellers}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
