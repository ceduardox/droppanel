import { useState } from "react";
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
  if (imageUrl.startsWith("/uploads/")) return imageUrl;

  // New images from object storage
  if (!imageUrl.startsWith("/")) return `/api/storage/${imageUrl}`;

  return imageUrl;
}

export default function ProductCard({
  id,
  name,
  price,
  cost,
  baseCost,
  capitalIncrease,
  image,
  onEdit,
  onDelete,
}: ProductCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const profit = price - cost;
  const profitMargin = ((profit / price) * 100).toFixed(1);
  const imageUrl = getImageUrl(image);
  const hasBreakdown = baseCost !== undefined && baseCost !== null;

  return (
    <Card
      className="overflow-hidden rounded-2xl border-[#b7c9e6] bg-white/90 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      data-testid={`card-product-${id}`}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 min-[390px]:flex-row">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted sm:h-20 sm:w-20">
            {imageUrl && !imageFailed ? (
              <img
                src={imageUrl}
                alt={name}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold leading-tight text-[#1a2a43]" data-testid={`text-product-name-${id}`}>
              {name}
            </h3>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Precio:</span>
                <span className="text-base font-semibold" data-testid={`text-price-${id}`}>
                  {price.toFixed(2)} Bs
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Costo:</span>
                <span className="text-sm font-medium" data-testid={`text-cost-${id}`}>
                  {cost.toFixed(2)} Bs
                </span>
              </div>

              {hasBreakdown && (
                <>
                  <div className="flex items-center justify-between gap-2 pl-3">
                    <span className="text-xs text-muted-foreground">- Bruto:</span>
                    <span className="text-xs" data-testid={`text-base-cost-${id}`}>
                      {baseCost.toFixed(2)} Bs
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pl-3">
                    <span className="text-xs text-muted-foreground">- Capital:</span>
                    <span className="text-xs" data-testid={`text-capital-increase-${id}`}>
                      {(capitalIncrease || 0).toFixed(2)} Bs
                    </span>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Utilidad:</span>
                <Badge
                  variant="secondary"
                  className="whitespace-nowrap border border-[#c4d2e8] bg-[#e7edf7] text-xs font-semibold text-[#1a2a43]"
                  data-testid={`text-profit-${id}`}
                >
                  {profit.toFixed(2)} Bs ({profitMargin}%)
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <Button
            size="sm"
            variant="outline"
            className="min-w-0"
            onClick={() => onEdit?.(id)}
            data-testid={`button-edit-${id}`}
          >
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="px-3"
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
