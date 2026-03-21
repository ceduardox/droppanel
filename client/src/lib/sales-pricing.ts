export function parseAmount(value: unknown): number {
  const parsed = Number.parseFloat(String(value ?? 0));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeNonNegative(value: unknown): number {
  const parsed = parseAmount(value);
  return parsed >= 0 ? parsed : 0;
}

export function getSaleUnitPrice(item: any): number {
  const parsed = parseAmount(item?.unitPrice ?? item?.product?.price ?? 0);
  return parsed > 0 ? parsed : 0;
}

export function getSaleUnitTransport(item: any): number {
  return normalizeNonNegative(item?.unitTransport ?? item?.product?.costTransport ?? 0);
}

export function getEffectiveUnitBaseCost(item: any): number {
  const product = item?.product;
  const baseCost = parseAmount(product?.baseCost);
  if (baseCost <= 0) return 0;
  const defaultTransport = normalizeNonNegative(product?.costTransport ?? 0);
  const saleTransport = getSaleUnitTransport(item);
  const effectiveBaseCost = baseCost - defaultTransport + saleTransport;
  return effectiveBaseCost > 0 ? effectiveBaseCost : 0;
}

export function getEffectiveUnitCost(item: any): number {
  const product = item?.product;
  const totalCost = parseAmount(product?.cost);
  const defaultTransport = normalizeNonNegative(product?.costTransport ?? 0);
  const saleTransport = getSaleUnitTransport(item);
  const effectiveTotalCost = totalCost - defaultTransport + saleTransport;
  return effectiveTotalCost > 0 ? effectiveTotalCost : 0;
}

export function getMinUnitPriceForProduct(product: any, saleTransport: number): number {
  const baseCost = parseAmount(product?.baseCost);
  const fallbackBaseCost = baseCost > 0 ? baseCost : parseAmount(product?.cost);
  const defaultTransport = normalizeNonNegative(product?.costTransport ?? 0);
  const transport = normalizeNonNegative(saleTransport);
  const minimumUnitPrice = fallbackBaseCost - defaultTransport + transport;
  return minimumUnitPrice > 0 ? minimumUnitPrice : 0;
}

export function getEffectiveUnitCostForProduct(product: any, saleTransport: number): number {
  const totalCost = parseAmount(product?.cost);
  const defaultTransport = normalizeNonNegative(product?.costTransport ?? 0);
  const transport = normalizeNonNegative(saleTransport);
  const effectiveTotalCost = totalCost - defaultTransport + transport;
  return effectiveTotalCost > 0 ? effectiveTotalCost : 0;
}
