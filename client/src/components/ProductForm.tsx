import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload } from "lucide-react";

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; price: number; cost: number; image?: File }) => void;
  initialData?: {
    name: string;
    price: number;
    cost: number;
  };
}

export default function ProductForm({ open, onOpenChange, onSubmit, initialData }: ProductFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [price, setPrice] = useState(initialData?.price?.toString() || "");
  const [cost, setCost] = useState(initialData?.cost?.toString() || "");
  const [imageFile, setImageFile] = useState<File | undefined>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      price: parseFloat(price),
      cost: parseFloat(cost),
      image: imageFile,
    });
    setName("");
    setPrice("");
    setCost("");
    setImageFile(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Producto" : "Agregar Producto"}</DialogTitle>
          <DialogDescription>
            {initialData ? "Modifica la información del producto" : "Ingresa los datos del nuevo producto"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="product-name">Nombre del Producto</Label>
              <Input
                id="product-name"
                data-testid="input-product-name"
                placeholder="Citrato de Magnesio"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-price">Precio de Venta (Bs)</Label>
              <Input
                id="product-price"
                data-testid="input-product-price"
                type="number"
                step="0.01"
                placeholder="150.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-cost">Costo del Producto (Bs)</Label>
              <Input
                id="product-cost"
                data-testid="input-product-cost"
                type="number"
                step="0.01"
                placeholder="81.43"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-image">Imagen del Producto (opcional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="product-image"
                  data-testid="input-product-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0])}
                  className="flex-1"
                />
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
              Cancelar
            </Button>
            <Button type="submit" data-testid="button-submit-product">
              {initialData ? "Guardar Cambios" : "Agregar Producto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
