import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ImageIcon } from "lucide-react";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  cost: number;
  baseCost?: number;
  capitalIncrease?: number;
  image?: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

function getImageUrl(imageUrl?: string): string | undefined {
  if (!imageUrl) return undefined;
  
  // Legacy images from /uploads folder
  if (imageUrl.startsWith('/uploads/')) return imageUrl;
  
  // New images from object storage
  if (!imageUrl.startsWith('/')) return `/api/storage/${imageUrl}`;
  
  return imageUrl;
}

export default function ProductCard({ id, name, price, cost, baseCost, capitalIncrease, image, onEdit, onDelete }: ProductCardProps) {
  const profit = price - cost;
  const profitMargin = ((profit / price) * 100).toFixed(1);
  const imageUrl = getImageUrl(image);
  const hasBreakdown = baseCost !== undefined && baseCost !== null;

  return (
    <Card className="overflow-hidden hover-elevate" data-testid={`card-product-${id}`}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="h-20 w-20 rounded-md bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
            {imageUrl ? (
              <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate" data-testid={`text-product-name-${id}`}>{name}</h3>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Precio:</span>
                <span className="font-medium" data-testid={`text-price-${id}`}>{price.toFixed(2)} Bs</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Costo:</span>
                <span className="text-sm font-medium" data-testid={`text-cost-${id}`}>{cost.toFixed(2)} Bs</span>
              </div>
              {hasBreakdown && (
                <>
                  <div className="flex items-center justify-between gap-2 pl-4">
                    <span className="text-xs text-muted-foreground">↳ Bruto:</span>
                    <span className="text-xs" data-testid={`text-base-cost-${id}`}>{baseCost.toFixed(2)} Bs</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pl-4">
                    <span className="text-xs text-muted-foreground">↳ Capital:</span>
                    <span className="text-xs" data-testid={`text-capital-increase-${id}`}>{(capitalIncrease || 0).toFixed(2)} Bs</span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Utilidad:</span>
                <Badge variant="secondary" className="text-xs" data-testid={`text-profit-${id}`}>
                  {profit.toFixed(2)} Bs ({profitMargin}%)
                </Badge>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => onEdit?.(id)}
            data-testid={`button-edit-${id}`}
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete?.(id)}
            data-testid={`button-delete-${id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
