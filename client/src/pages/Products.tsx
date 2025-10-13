import { useState } from "react";
import ProductCard from "@/components/ProductCard";
import ProductForm from "@/components/ProductForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

// TODO: Remove mock data - replace with real data from backend
const mockProducts = [
  { id: "1", name: "Citrato de Magnesio", price: 150, cost: 81.43 },
  { id: "2", name: "Berberina", price: 130, cost: 46.48 },
];

export default function Products() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Productos</h1>
          <p className="text-muted-foreground mt-1">Gestiona tu catálogo de productos</p>
        </div>
        <Button onClick={() => setShowForm(true)} data-testid="button-add-product">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Producto
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockProducts.map((product) => (
          <ProductCard
            key={product.id}
            {...product}
            onEdit={(id) => console.log("Edit", id)}
            onDelete={(id) => console.log("Delete", id)}
          />
        ))}
      </div>

      <ProductForm
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={(data) => {
          console.log("Product submitted:", data);
          setShowForm(false);
        }}
      />
    </div>
  );
}
