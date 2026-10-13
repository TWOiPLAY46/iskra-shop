import heroStoreImg from '../assets/images/hero_iskra_store_1790671594961.jpg';
import circuitBreakerImg from '../assets/images/product_circuit_breaker_1790671628425.jpg';
import copperCableImg from '../assets/images/product_copper_cable_1790671618296.jpg';
import faucetMixerImg from '../assets/images/product_faucet_mixer_1790671605777.jpg';

export const ASSET_IMAGES = {
  hero: heroStoreImg,
  circuitBreaker: circuitBreakerImg,
  copperCable: copperCableImg,
  faucetMixer: faucetMixerImg,
};

// Curated high-resolution studio photography catalog URLs (isolated product photo)
export const CURATED_PRODUCT_PHOTOS = {
  powerTool: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&auto=format&fit=crop&q=80',
  handTools: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=600&auto=format&fit=crop&q=80',
  ledLamp: 'https://images.unsplash.com/photo-1550537687-c91072c4792d?w=600&auto=format&fit=crop&q=80',
  radiator: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&auto=format&fit=crop&q=80',
  bathroomSanitary: 'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?w=600&auto=format&fit=crop&q=80',
};

/**
 * Returns a bundled Vite asset URL for internal images or smart context-based fallback.
 * Works seamlessly in development, production build, and GitHub Pages.
 */
export function getSafeImageUrl(imgUrl?: string, categoryOrName?: string): string {
  if (imgUrl && typeof imgUrl === 'string' && imgUrl.trim() !== '') {
    const trimmed = imgUrl.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/')) {
      return trimmed;
    }
    if (trimmed.includes('faucet_mixer')) return ASSET_IMAGES.faucetMixer;
    if (trimmed.includes('circuit_breaker')) return ASSET_IMAGES.circuitBreaker;
    if (trimmed.includes('copper_cable')) return ASSET_IMAGES.copperCable;
    if (trimmed.includes('hero_iskra_store')) return ASSET_IMAGES.hero;
    return trimmed;
  }

  // Smart context-aware fallback based on product name or category
  const context = (categoryOrName || '').toLowerCase();

  // Cables and wiring
  if (context.includes('кабель') || context.includes('провід') || context.includes('ввг') || context.includes('пвс') || context.includes('шввп')) {
    return ASSET_IMAGES.copperCable;
  }

  // Faucets, showers, mixers, hoses
  if (context.includes('змішувач') || context.includes('душ') || context.includes('підводка') || context.includes('шланг')) {
    return ASSET_IMAGES.faucetMixer;
  }

  // Circuit breakers, switches, electrical boxes, relays
  if (context.includes('автомат') || context.includes('диференц') || context.includes('пзв') || context.includes('реле') || context.includes('wago') || context.includes('щит')) {
    return ASSET_IMAGES.circuitBreaker;
  }

  // Power tools
  if (context.includes('дрель') || context.includes('дриль') || context.includes('шуруповерт') || context.includes('перфоратор') || context.includes('болгарк') || context.includes('лобзик')) {
    return CURATED_PRODUCT_PHOTOS.powerTool;
  }

  // Lighting & LED
  if (context.includes('лампа') || context.includes('світильник') || context.includes('освітлення') || context.includes('прожектор') || context.includes('led')) {
    return CURATED_PRODUCT_PHOTOS.ledLamp;
  }

  // Heating & radiators
  if (context.includes('радіатор') || context.includes('котел') || context.includes('опалення') || context.includes('конвектор')) {
    return CURATED_PRODUCT_PHOTOS.radiator;
  }

  // Sanitary ceramic
  if (context.includes('унітаз') || context.includes('умивальник') || context.includes('ванн') || context.includes('бойлер')) {
    return CURATED_PRODUCT_PHOTOS.bathroomSanitary;
  }

  // Hand tools & general equipment
  if (context.includes('інструмент') || context.includes('ключ') || context.includes('викрутк') || context.includes('молоток') || context.includes('рулетк')) {
    return CURATED_PRODUCT_PHOTOS.handTools;
  }

  // Default fallback based on high-level section
  if (context.includes('сантех')) {
    return ASSET_IMAGES.faucetMixer;
  }
  if (context.includes('електр')) {
    return ASSET_IMAGES.circuitBreaker;
  }

  return ASSET_IMAGES.circuitBreaker;
}
