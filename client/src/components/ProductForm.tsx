import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Upload, ChevronDown, ChevronUp } from "lucide-react";

interface CostBreakdown {
  costProduct?: number;
  costTransport?: number;
  costLabel?: number;
  costShrink?: number;
  costBag?: number;
  costLabelRemover?: number;
  costExtraName?: string;
  costExtraAmount?: number;
}

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { 
    name: string; 
    price: number; 
    baseCost: number; 
    capitalIncrease: number; 
    costBreakdown: CostBreakdown;
    image?: File 
  }) => void;
  initialData?: {
    name: string;
    price: number;
    baseCost?: number;
    capitalIncrease?: number;
    cost: number;
    costProduct?: number;
    costTransport?: number;
    costLabel?: number;
    costShrink?: number;
    costBag?: number;
    costLabelRemover?: number;
    costExtraName?: string;
    costExtraAmount?: number;
  };
}

export default function ProductForm({ open, onOpenChange, onSubmit, initialData }: ProductFormProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [capitalIncrease, setCapitalIncrease] = useState("");
  const [imageFile, setImageFile] = useState<File | undefined>();
  const [showBreakdown, setShowBreakdown] = useState(false);

  const [costProduct, setCostProduct] = useState("");
  const [costTransport, setCostTransport] = useState("");
  const [costLabel, setCostLabel] = useState("");
  const [costShrink, setCostShrink] = useState("");
  const [costBag, setCostBag] = useState("");
  const [costLabelRemover, setCostLabelRemover] = useState("");
  const [costExtraName, setCostExtraName] = useState("");
  const [costExtraAmount, setCostExtraAmount] = useState("");

  const baseCostTotal = 
    (parseFloat(costProduct) || 0) +
    (parseFloat(costTransport) || 0) +
    (parseFloat(costLabel) || 0) +
    (parseFloat(costShrink) || 0) +
    (parseFloat(costBag) || 0) +
    (parseFloat(costLabelRemover) || 0) +
    (parseFloat(costExtraAmount) || 0);

  const totalCost = baseCostTotal + (parseFloat(capitalIncrease) || 0);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name);
        setPrice(initialData.price.toString());
        setCapitalIncrease((initialData.capitalIncrease || 0).toString());
        
        setCostProduct((initialData.costProduct || 0).toString());
        setCostTransport((initialData.costTransport || 0).toString());
        setCostLabel((initialData.costLabel || 0).toString());
        setCostShrink((initialData.costShrink || 0).toString());
        setCostBag((initialData.costBag || 0).toString());
        setCostLabelRemover((initialData.costLabelRemover || 0).toString());
        setCostExtraName(initialData.costExtraName || "");
        setCostExtraAmount((initialData.costExtraAmount || 0).toString());
        
        const hasBreakdown = initialData.costProduct || initialData.costTransport || 
          initialData.costLabel || initialData.costShrink || initialData.costBag || 
          initialData.costLabelRemover || initialData.costExtraAmount;
        setShowBreakdown(!!hasBreakdown);
      } else {
        setName("");
        setPrice("");
        setCapitalIncrease("");
        setCostProduct("");
        setCostTransport("");
        setCostLabel("");
        setCostShrink("");
        setCostBag("");
        setCostLabelRemover("");
        setCostExtraName("");
        setCostExtraAmount("");
        setShowBreakdown(false);
      }
      setImageFile(undefined);
    }
  }, [open, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      price: parseFloat(price),
      baseCost: baseCostTotal,
      capitalIncrease: parseFloat(capitalIncrease) || 0,
      costBreakdown: {
        costProduct: parseFloat(costProduct) || undefined,
        costTransport: parseFloat(costTransport) || undefined,
        costLabel: parseFloat(costLabel) || undefined,
        costShrink: parseFloat(costShrink) || undefined,
        costBag: parseFloat(costBag) || undefined,
        costLabelRemover: parseFloat(costLabelRemover) || undefined,
        costExtraName: costExtraName || undefined,
        costExtraAmount: parseFloat(costExtraAmount) || undefined,
      },
      image: imageFile,
    });
    setName("");
    setPrice("");
    setCapitalIncrease("");
    setCostProduct("");
    setCostTransport("");
    setCostLabel("");
    setCostShrink("");
    setCostBag("");
    setCostLabelRemover("");
    setCostExtraName("");
    setCostExtraAmount("");
    setImageFile(undefined);
  };

  const CostInput = ({ label, value, onChange, placeholder, testId }: { 
    label: string; 
    value: string; 
    onChange: (v: string) => void; 
    placeholder?: string;
    testId: string;
  }) => (
    <div className="flex items-center gap-2">
      <Label className="w-32 text-xs text-muted-foreground shrink-0">{label}</Label>
      <Input
        data-testid={testId}
        type="number"
        step="0.01"
        placeholder={placeholder || "0.00"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-sm"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
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

            <Collapsible open={showBreakdown} onOpenChange={setShowBreakdown}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-between" data-testid="button-toggle-breakdown">
                  <span>Desglose de Costo Bruto</span>
                  {showBreakdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-2 rounded-md border p-3 bg-muted/30">
                <CostInput label="Costo Producto" value={costProduct} onChange={setCostProduct} testId="input-cost-product" />
                <CostInput label="Transporte" value={costTransport} onChange={setCostTransport} testId="input-cost-transport" />
                <CostInput label="Etiqueta" value={costLabel} onChange={setCostLabel} testId="input-cost-label" />
                <CostInput label="Termocontraíble" value={costShrink} onChange={setCostShrink} testId="input-cost-shrink" />
                <CostInput label="Bolsa" value={costBag} onChange={setCostBag} testId="input-cost-bag" />
                <CostInput label="Removedor Etiq." value={costLabelRemover} onChange={setCostLabelRemover} testId="input-cost-label-remover" />
                
                <div className="border-t pt-2 mt-2">
                  <Label className="text-xs text-muted-foreground mb-1 block">Campo Extra (opcional)</Label>
                  <div className="flex gap-2">
                    <Input
                      data-testid="input-cost-extra-name"
                      placeholder="Nombre"
                      value={costExtraName}
                      onChange={(e) => setCostExtraName(e.target.value)}
                      className="h-8 text-sm flex-1"
                    />
                    <Input
                      data-testid="input-cost-extra-amount"
                      type="number"
                      step="0.01"
                      placeholder="Monto"
                      value={costExtraAmount}
                      onChange={(e) => setCostExtraAmount(e.target.value)}
                      className="h-8 text-sm w-24"
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium">Costo Bruto Total:</span>
                  <span className="font-bold text-primary">{baseCostTotal.toFixed(2)} Bs</span>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {!showBreakdown && (
              <div className="rounded-md bg-muted/50 p-2 text-center text-sm text-muted-foreground">
                Costo Bruto: {baseCostTotal.toFixed(2)} Bs
              </div>
            )}

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
