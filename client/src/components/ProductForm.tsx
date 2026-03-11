import { useState, useEffect, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Upload, ChevronDown, ChevronUp, Plus, Trash2, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDeleteProductImage } from "@/lib/api";

interface CostExtra {
  id: string;
  name: string;
  amount: string;
}

interface CostBreakdown {
  costProduct?: number;
  costTransport?: number;
  costLabel?: number;
  costShrink?: number;
  costBag?: number;
  costLabelRemover?: number;
  costExtras?: { name: string; amount: number }[];
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
    image?: File;
    imageUrl?: string;
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
    costExtras?: { name: string; amount: number }[];
    imageUrl?: string;
  };
  availableImages?: ProductImageItem[];
}

interface ProductImageItem {
  imageUrl: string;
  usageCount: number;
}

function resolveProductImageUrl(imageUrl?: string): string | undefined {
  if (!imageUrl) return undefined;

  if (imageUrl.startsWith("/uploads/")) return imageUrl;
  if (imageUrl.startsWith("/api/storage/")) return imageUrl;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
  if (!imageUrl.startsWith("/")) return `/api/storage/${imageUrl}`;

  return imageUrl;
}

interface CostInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  testId: string;
}

const CostInput = memo(function CostInput({ label, value, onChange, placeholder, testId }: CostInputProps) {
  return (
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
});

export default function ProductForm({ open, onOpenChange, onSubmit, initialData, availableImages }: ProductFormProps) {
  const { toast } = useToast();
  const deleteProductImage = useDeleteProductImage();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [capitalIncrease, setCapitalIncrease] = useState("");
  const [imageFile, setImageFile] = useState<File | undefined>();
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const [showBreakdown, setShowBreakdown] = useState(false);
  const productImages = (availableImages || []) as ProductImageItem[];

  const [costProduct, setCostProduct] = useState("");
  const [costTransport, setCostTransport] = useState("");
  const [costLabel, setCostLabel] = useState("");
  const [costShrink, setCostShrink] = useState("");
  const [costBag, setCostBag] = useState("");
  const [costLabelRemover, setCostLabelRemover] = useState("");
  const [costExtras, setCostExtras] = useState<CostExtra[]>([]);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const extrasTotal = costExtras.reduce((sum, extra) => sum + (parseFloat(extra.amount) || 0), 0);

  const baseCostTotal = 
    (parseFloat(costProduct) || 0) +
    (parseFloat(costTransport) || 0) +
    (parseFloat(costLabel) || 0) +
    (parseFloat(costShrink) || 0) +
    (parseFloat(costBag) || 0) +
    (parseFloat(costLabelRemover) || 0) +
    extrasTotal;

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
        
        if (initialData.costExtras && initialData.costExtras.length > 0) {
          setCostExtras(initialData.costExtras.map(e => ({
            id: generateId(),
            name: e.name,
            amount: e.amount.toString()
          })));
        } else {
          setCostExtras([]);
        }
        
        const hasBreakdown = initialData.costProduct || initialData.costTransport || 
          initialData.costLabel || initialData.costShrink || initialData.costBag || 
          initialData.costLabelRemover || (initialData.costExtras && initialData.costExtras.length > 0);
        setShowBreakdown(!!hasBreakdown);
        setSelectedImageUrl(initialData.imageUrl || "");
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
        setCostExtras([]);
        setShowBreakdown(false);
        setSelectedImageUrl("");
      }
      setImageFile(undefined);
    }
  }, [open, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validExtras = costExtras
      .filter(e => e.name.trim() && parseFloat(e.amount))
      .map(e => ({ name: e.name.trim(), amount: parseFloat(e.amount) }));
    
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
        costExtras: validExtras.length > 0 ? validExtras : undefined,
      },
      image: imageFile,
      imageUrl: selectedImageUrl || undefined,
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
    setCostExtras([]);
    setImageFile(undefined);
    setSelectedImageUrl("");
  };

  const handleDeleteImageFromLibrary = async (imageUrl: string, usageCount: number) => {
    const confirmed = confirm(`Esta imagen se quitara de ${usageCount} producto(s). Continuar?`);
    if (!confirmed) return;

    try {
      const result = await deleteProductImage.mutateAsync(imageUrl);
      if (selectedImageUrl === imageUrl) {
        setSelectedImageUrl("");
      }
      toast({
        title: "Imagen eliminada",
        description: `Se removio de ${result.affectedProducts} producto(s).`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo eliminar la imagen.",
        variant: "destructive",
      });
    }
  };

  const handleCostProductChange = useCallback((v: string) => setCostProduct(v), []);
  const handleCostTransportChange = useCallback((v: string) => setCostTransport(v), []);
  const handleCostLabelChange = useCallback((v: string) => setCostLabel(v), []);
  const handleCostShrinkChange = useCallback((v: string) => setCostShrink(v), []);
  const handleCostBagChange = useCallback((v: string) => setCostBag(v), []);
  const handleCostLabelRemoverChange = useCallback((v: string) => setCostLabelRemover(v), []);

  const addExtra = useCallback(() => {
    setCostExtras(prev => [...prev, { id: generateId(), name: "", amount: "" }]);
  }, []);

  const removeExtra = useCallback((id: string) => {
    setCostExtras(prev => prev.filter(e => e.id !== id));
  }, []);

  const updateExtraName = useCallback((id: string, name: string) => {
    setCostExtras(prev => prev.map(e => e.id === id ? { ...e, name } : e));
  }, []);

  const updateExtraAmount = useCallback((id: string, amount: string) => {
    setCostExtras(prev => prev.map(e => e.id === id ? { ...e, amount } : e));
  }, []);

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
                <CostInput label="Costo Producto" value={costProduct} onChange={handleCostProductChange} testId="input-cost-product" />
                <CostInput label="Transporte" value={costTransport} onChange={handleCostTransportChange} testId="input-cost-transport" />
                <CostInput label="Etiqueta" value={costLabel} onChange={handleCostLabelChange} testId="input-cost-label" />
                <CostInput label="Termocontraíble" value={costShrink} onChange={handleCostShrinkChange} testId="input-cost-shrink" />
                <CostInput label="Bolsa" value={costBag} onChange={handleCostBagChange} testId="input-cost-bag" />
                <CostInput label="Removedor Etiq." value={costLabelRemover} onChange={handleCostLabelRemoverChange} testId="input-cost-label-remover" />
                
                <div className="border-t pt-2 mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-muted-foreground">Campos Extra</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addExtra}
                      className="h-7 text-xs"
                      data-testid="button-add-extra"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Agregar
                    </Button>
                  </div>
                  
                  {costExtras.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Sin campos extra. Haz clic en "Agregar" para añadir uno.
                    </p>
                  )}
                  
                  {costExtras.map((extra) => (
                    <div key={extra.id} className="flex gap-2 items-center mb-2">
                      <Input
                        data-testid={`input-extra-name-${extra.id}`}
                        placeholder="Nombre"
                        value={extra.name}
                        onChange={(e) => updateExtraName(extra.id, e.target.value)}
                        className="h-8 text-sm flex-1"
                      />
                      <Input
                        data-testid={`input-extra-amount-${extra.id}`}
                        type="number"
                        step="0.01"
                        placeholder="Monto"
                        value={extra.amount}
                        onChange={(e) => updateExtraAmount(extra.id, e.target.value)}
                        className="h-8 text-sm w-24"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeExtra(extra.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        data-testid={`button-remove-extra-${extra.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
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
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setImageFile(file);
                    if (file) setSelectedImageUrl("");
                  }}
                  className="flex-1"
                />
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="space-y-2 rounded-md border border-border/70 bg-muted/20 p-3">
                <p className="text-xs font-medium text-muted-foreground">Usar imagen ya subida</p>
                {productImages.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Aun no hay imagenes guardadas para reutilizar.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {productImages.map((item) => {
                      const previewUrl = resolveProductImageUrl(item.imageUrl);
                      const isSelected = selectedImageUrl === item.imageUrl;
                      return (
                        <div key={item.imageUrl} className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedImageUrl(item.imageUrl);
                              setImageFile(undefined);
                            }}
                            className={`group relative w-full overflow-hidden rounded-md border transition-all ${
                              isSelected
                                ? "border-primary ring-2 ring-primary/35"
                                : "border-border hover:border-primary/50"
                            }`}
                            title={`Usada en ${item.usageCount} producto(s)`}
                            data-testid={`button-select-image-${item.imageUrl.replace(/[^a-zA-Z0-9_-]/g, "_")}`}
                          >
                            {previewUrl ? (
                              <img
                                src={previewUrl}
                                alt="Imagen de producto"
                                className="h-14 w-full object-cover sm:h-16"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-14 w-full items-center justify-center bg-muted sm:h-16">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <span className="absolute bottom-0 right-0 rounded-tl bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                              x{item.usageCount}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteImageFromLibrary(item.imageUrl, item.usageCount);
                            }}
                            className="absolute right-1 top-1 rounded bg-black/65 p-1 text-white transition-colors hover:bg-red-600"
                            title="Eliminar imagen de la biblioteca"
                            data-testid={`button-delete-image-${item.imageUrl.replace(/[^a-zA-Z0-9_-]/g, "_")}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {selectedImageUrl && !imageFile && (
                  <p className="text-xs text-muted-foreground">Imagen existente seleccionada.</p>
                )}
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
