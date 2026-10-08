import { Product } from '../types/store';

export interface EnrichedProductResult {
  mainCategory: string;
  category: string;
  description: string;
  features: string[];
  specs: Array<{ key: string; value: string }>;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
}

/**
 * Calls the backend Gemini AI Product Enrichment API
 */
export async function enrichProductWithAI(product: {
  name: string;
  sku?: string;
  category?: string;
  currentDescription?: string;
  price?: number;
}): Promise<EnrichedProductResult> {
  const resp = await fetch('/api/enrich-product', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: product.name,
      sku: product.sku || '',
      category: product.category || '',
      currentDescription: product.currentDescription || '',
      price: product.price || 0,
    }),
  });

  if (!resp.ok) {
    const errJson = await resp.json().catch(() => ({}));
    throw new Error(errJson.error || errJson.details || 'Помилка підключення до AI-сервісу');
  }

  const data = await resp.json();
  if (!data.success || !data.enriched) {
    throw new Error('AI-сервіс не повернув сформований результат');
  }

  return data.enriched as EnrichedProductResult;
}

/**
 * Batch enrichment helper for lists of products
 */
export async function batchEnrichProducts(
  products: Product[],
  onProgress?: (processed: number, total: number, lastEnriched: Product) => void
): Promise<Product[]> {
  const updatedProducts: Product[] = [];

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    try {
      const enriched = await enrichProductWithAI({
        name: p.name,
        sku: p.sku,
        category: p.category,
        currentDescription: p.desc,
        price: p.price,
      });

      // Convert specs array back to Record<string, string>
      const newSpecs: Record<string, string> = { ...(p.specs || {}) };
      if (enriched.specs && Array.isArray(enriched.specs)) {
        enriched.specs.forEach((s) => {
          if (s.key && s.value) {
            newSpecs[s.key] = s.value;
          }
        });
      }

      const updatedProduct: Product = {
        ...p,
        mainCategory: enriched.mainCategory || p.mainCategory,
        category: enriched.category || p.category,
        subCategory: enriched.category || p.subCategory,
        desc: enriched.description || p.desc,
        specs: newSpecs,
      };

      updatedProducts.push(updatedProduct);
      if (onProgress) {
        onProgress(i + 1, products.length, updatedProduct);
      }
    } catch (err) {
      console.warn(`[BatchEnrich] Skipping product ${p.name} due to error:`, err);
      updatedProducts.push(p);
      if (onProgress) {
        onProgress(i + 1, products.length, p);
      }
    }
  }

  return updatedProducts;
}
