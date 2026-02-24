// lib/sizes.ts

export type AppSize = "S" | "M" | "L" | "XL" | "XXL";

export type SizeOption = {
  size: AppSize;
  soldOut: boolean;
};

/**
 * Master size list for crewneck products.
 * To mark a size as sold out, set soldOut: true.
 */
export const CREWNECK_SIZES: SizeOption[] = [
  { size: "S",   soldOut: false },
  { size: "M",   soldOut: false },
  { size: "L",   soldOut: false },
  { size: "XL",  soldOut: false },
  { size: "XXL", soldOut: false },
];

export function isSoldOut(size: AppSize): boolean {
  return CREWNECK_SIZES.find((s) => s.size === size)?.soldOut ?? false;
}