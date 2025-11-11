import { useState } from "react";
import ProductCard from "@/components/ProductCard";
import ProductForm from "@/components/ProductForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Products() {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const { data: products = [], isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const { toast } = useToast();

  const handleSubmit = async (data: { name: string; price: number; cost: number; image?: File }) => {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("price", data.price.toString());
    formData.append("cost", data.cost.toString());
    if (data.image) {
      formData.append("image", data.image);
    }

    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, data: formData });
        toast({ title: "Producto actualizado", description: "Los cambios han sido guardados" });
      } else {
        await createProduct.mutateAsync(formData);
        toast({ title: "Producto creado", description: "El producto ha sido agregado exitosamente" });
      }
      setShowForm(false);
      setEditingProduct(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (id: string) => {
    const product = (products as any[]).find((p: any) => p.id === id);
    if (product) {
      setEditingProduct(product);
      setShowForm(true);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este producto?")) return;
    
    try {
      await deleteProduct.mutateAsync(id);
      toast({ title: "Producto eliminado", description: "El producto ha sido eliminado" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>;
  }

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

      {(products as any[]).length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No hay productos registrados</p>
          <Button onClick={() => setShowForm(true)} className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Agregar tu primer producto
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(products as any[]).map((product: any) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={parseFloat(product.price)}
              cost={parseFloat(product.cost)}
              image={product.imageUrl}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <ProductForm
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditingProduct(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingProduct ? {
          name: editingProduct.name,
          price: parseFloat(editingProduct.price),
          cost: parseFloat(editingProduct.cost),
        } : undefined}
      />
    </div>
  );
}
