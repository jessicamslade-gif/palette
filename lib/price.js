// Adds up the free-text price fields (e.g. "$1,549", "$729.00", "USD 1399").
// Returns { total, counted, skipped, text } where `text` is the formatted
// total and `skipped` is the number of items with no readable price.
export function sumPrices(links) {
  let total = 0;
  let counted = 0;
  let symbol = '$';
  for (const link of links || []) {
    const raw = String(link.price ?? '');
    const match = raw.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
    if (!match) continue;
    total += parseFloat(match[0]);
    counted += 1;
    if (counted === 1) {
      const sym = raw.match(/[£€]/);
      if (sym) symbol = sym[0];
    }
  }
  const text = symbol + total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return { total, counted, skipped: (links || []).length - counted, text };
}
