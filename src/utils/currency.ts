/** Tanzanian shilling (TZS) formatting for documents and APIs. */

export const CURRENCY_LOCALE = "en-TZ";
export const CURRENCY_CODE = "TZS";

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: "currency",
    currency: CURRENCY_CODE,
    maximumFractionDigits: 0,
  }).format(amount);
}
