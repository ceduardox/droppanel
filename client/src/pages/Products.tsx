import { useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";
import ProductForm from "@/components/ProductForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useToggleProductStatus } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Products() {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const { data: products = [], isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const toggleProductStatus = useToggleProductStatus();
  const [togglingProductId, setTogglingProductId] = useState<string | null>(null);
  const { toast } = useToast();
  const availableImages = useMemo(() => {
    const usageMap = new Map<string, number>();
    (products as any[]).forEach((product: any) => {
      const key = String(product.imageUrl || "").trim();
      if (!key) return;
      usageMap.set(key, (usageMap.get(key) || 0) + 1);
    });

    return Array.from(usageMap.entries())
      .map(([imageUrl, usageCount]) => ({ imageUrl, usageCount }))
      .sort((a, b) => b.usageCount - a.usageCount || a.imageUrl.localeCompare(b.imageUrl));
  }, [products]);

  const handleSubmit = async (data: { name: string; isActive: boolean; price: number; baseCost: number; capitalIncrease: number; costBreakdown: any; image?: File; imageUrl?: string }) => {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("isActive", data.isActive ? "true" : "false");
    formData.append("price", data.price.toString());
    formData.append("baseCost", data.baseCost.toString());
    formData.append("capitalIncrease", data.capitalIncrease.toString());
    if (data.costBreakdown.costProduct) formData.append("costProduct", data.costBreakdown.costProduct.toString());
    if (data.costBreakdown.costTransport) formData.append("costTransport", data.costBreakdown.costTransport.toString());
    if (data.costBreakdown.costLabel) formData.append("costLabel", data.costBreakdown.costLabel.toString());
    if (data.costBreakdown.costShrink) formData.append("costShrink", data.costBreakdown.costShrink.toString());
    if (data.costBreakdown.costBag) formData.append("costBag", data.costBreakdown.costBag.toString());
    if (data.costBreakdown.costLabelRemover) formData.append("costLabelRemover", data.costBreakdown.costLabelRemover.toString());
    if (data.costBreakdown.costExtras && data.costBreakdown.costExtras.length > 0) {
      formData.append("costExtras", JSON.stringify(data.costBreakdown.costExtras));
    }
    if (data.image) {
      formData.append("image", data.image);
    }
    if (data.imageUrl) {
      formData.append("imageUrl", data.imageUrl);
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

  const handleToggleActive = async (id: string, nextActive: boolean) => {
    try {
      setTogglingProductId(id);
      await toggleProductStatus.mutateAsync({ id, isActive: nextActive });
      toast({
        title: "Estado actualizado",
        description: `Producto ${nextActive ? "activado" : "inactivado"} correctamente`,
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setTogglingProductId(null);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-none space-y-5 px-1 sm:px-4 lg:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-4xl font-bold tracking-tight text-[#102544]">Productos</h1>
          <p className="mt-1 max-w-[34ch] text-lg text-muted-foreground">Gestiona tu catalogo de productos</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="w-full sm:w-auto sm:self-start"
          data-testid="button-add-product"
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar Producto
        </Button>
      </div>

      {(products as any[]).length === 0 ? (
        <div className="rounded-2xl border border-[#b7c9e6] bg-white/90 py-12 text-center shadow-sm">
          <p className="text-muted-foreground">No hay productos registrados</p>
          <Button onClick={() => setShowForm(true)} className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Agregar tu primer producto
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(products as any[]).map((product: any) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              isActive={product.isActive !== false}
              price={parseFloat(product.price)}
              cost={parseFloat(product.cost)}
              baseCost={product.baseCost ? parseFloat(product.baseCost) : undefined}
              capitalIncrease={product.capitalIncrease ? parseFloat(product.capitalIncrease) : undefined}
              image={product.imageUrl}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              isToggling={togglingProductId === product.id}
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
        availableImages={availableImages}
        initialData={editingProduct ? {
          name: editingProduct.name,
          isActive: editingProduct.isActive !== false,
          price: parseFloat(editingProduct.price),
          cost: parseFloat(editingProduct.cost),
          baseCost: editingProduct.baseCost ? parseFloat(editingProduct.baseCost) : undefined,
          capitalIncrease: editingProduct.capitalIncrease ? parseFloat(editingProduct.capitalIncrease) : undefined,
          costProduct: editingProduct.costProduct ? parseFloat(editingProduct.costProduct) : undefined,
          costTransport: editingProduct.costTransport ? parseFloat(editingProduct.costTransport) : undefined,
          costLabel: editingProduct.costLabel ? parseFloat(editingProduct.costLabel) : undefined,
          costShrink: editingProduct.costShrink ? parseFloat(editingProduct.costShrink) : undefined,
          costBag: editingProduct.costBag ? parseFloat(editingProduct.costBag) : undefined,
          costLabelRemover: editingProduct.costLabelRemover ? parseFloat(editingProduct.costLabelRemover) : undefined,
          costExtras: editingProduct.costExtras || undefined,
          imageUrl: editingProduct.imageUrl || undefined,
        } : undefined}
      />
    </div>
  );
}
