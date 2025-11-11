import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload } from "lucide-react";

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; price: number; baseCost: number; capitalIncrease: number; image?: File }) => void;
  initialData?: {
    name: string;
    price: number;
    baseCost?: number;
    capitalIncrease?: number;
    cost: number;
  };
}

export default function ProductForm({ open, onOpenChange, onSubmit, initialData }: ProductFormProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [baseCost, setBaseCost] = useState("");
  const [capitalIncrease, setCapitalIncrease] = useState("");
  const [imageFile, setImageFile] = useState<File | undefined>();

  // Calcular costo total automáticamente
  const totalCost = (parseFloat(baseCost) || 0) + (parseFloat(capitalIncrease) || 0);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name);
        setPrice(initialData.price.toString());
        // Si tiene desglose, usarlo. Si no, asumir todo es base cost
        setBaseCost((initialData.baseCost || initialData.cost).toString());
        setCapitalIncrease((initialData.capitalIncrease || 0).toString());
      } else {
        setName("");
        setPrice("");
        setBaseCost("");
        setCapitalIncrease("");
      }
      setImageFile(undefined);
    }
  }, [open, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      price: parseFloat(price),
      baseCost: parseFloat(baseCost) || 0,
      capitalIncrease: parseFloat(capitalIncrease) || 0,
      image: imageFile,
    });
    setName("");
    setPrice("");
    setBaseCost("");
    setCapitalIncrease("");
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
              <Label htmlFor="base-cost">Costo Bruto (Bs)</Label>
              <Input
                id="base-cost"
                data-testid="input-base-cost"
                type="number"
                step="0.01"
                placeholder="40.00"
                value={baseCost}
                onChange={(e) => setBaseCost(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capital-increase">Aumento de Capital (Bs)</Label>
              <Input
                id="capital-increase"
                data-testid="input-capital-increase"
                type="number"
                step="0.01"
                placeholder="6.48"
                value={capitalIncrease}
                onChange={(e) => setCapitalIncrease(e.target.value)}
              />
            </div>
            <div className="rounded-md bg-muted p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Costo Total:</span>
                <span className="text-lg font-bold" data-testid="text-total-cost">{totalCost.toFixed(2)} Bs</span>
              </div>
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
