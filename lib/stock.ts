export const INFINITE_STOCK_SENTINEL = 2147483647;

export function isInfiniteStock(stock: number | null | undefined): boolean {
  return stock != null && stock >= INFINITE_STOCK_SENTINEL;
}

export function hasAvailableStock(stock: number | null | undefined): boolean {
  if (isInfiniteStock(stock)) {
    return true;
  }

  return typeof stock === "number" && stock > 0;
}
