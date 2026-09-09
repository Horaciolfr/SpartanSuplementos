import productWhey from '../assets/product_whey.jpg';
import productCreatina from '../assets/product_creatina.jpg';
import productPreentreno from '../assets/product_preentreno.jpg';
import productApparel from '../assets/product_apparel.jpg';
import storeLogo from '../assets/logo.png';

export { storeLogo };

/**
 * Retorna la imagen fotográfica real del catálogo o su render de alta resolución.
 */
export const getProductImage = (
  sku?: string,
  categoria?: string,
  imagen_url?: string | null
): string => {
  if (imagen_url && imagen_url.trim() !== '') {
    return imagen_url;
  }

  const code = (sku || '').toUpperCase();
  const cat = (categoria || '').toUpperCase();

  if (code.includes('CREA') || code.includes('LIVE') || cat.includes('CREATINA')) {
    return productCreatina;
  }
  if (
    code.includes('PREENTRENO') ||
    code.includes('IGNITE') ||
    code.includes('ENERGY') ||
    code.includes('VENOM') ||
    code.includes('PSYCHOTIC') ||
    cat.includes('ENERG') ||
    cat.includes('PRE-ENTRENO')
  ) {
    return productPreentreno;
  }
  if (
    code.includes('SHIRT') ||
    code.includes('INDUMENTARIA') ||
    code.includes('ROPA') ||
    cat.includes('INDUMENTARIA')
  ) {
    return productApparel;
  }
  // Por defecto suplementos proteicos / general
  return productWhey;
};

export const IMAGES = {
  logo: storeLogo,
  whey: productWhey,
  creatina: productCreatina,
  preentreno: productPreentreno,
  apparel: productApparel,
};
