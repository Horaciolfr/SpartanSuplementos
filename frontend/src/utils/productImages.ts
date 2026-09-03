import productWhey from '../assets/product_whey.jpg';
import productCreatina from '../assets/product_creatina.jpg';
import productPreentreno from '../assets/product_preentreno.jpg';
import productApparel from '../assets/product_apparel.jpg';

/**
 * Retorna la imagen fotográfica de alta resolución correspondiente al producto o SKU.
 */
export const getProductImage = (sku?: string, categoria?: string): string => {
  const code = (sku || '').toUpperCase();
  const cat = (categoria || '').toUpperCase();

  if (code.includes('CREA') || code.includes('LIVE') || cat.includes('CREATINA')) {
    return productCreatina;
  }
  if (code.includes('PREENTRENO') || code.includes('IGNITE') || code.includes('ENERGY') || cat.includes('ENERG')) {
    return productPreentreno;
  }
  if (code.includes('SHIRT') || code.includes('INDUMENTARIA') || code.includes('ROPA') || cat.includes('INDUMENTARIA')) {
    return productApparel;
  }
  // Por defecto suplementos proteicos / general
  return productWhey;
};

export const IMAGES = {
  whey: productWhey,
  creatina: productCreatina,
  preentreno: productPreentreno,
  apparel: productApparel,
};
