export const getErrorMessage = (err: any, fallback = 'Ha ocurrido un error en la operación'): string => {
  if (!err) return fallback;

  const data = err.response?.data;
  if (!data) {
    return err.message || fallback;
  }

  const detail = data.detail;
  if (!detail) {
    return typeof data === 'string' ? data : fallback;
  }

  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail)) {
    // Array de errores de validación de Pydantic
    return detail
      .map((item: any) => {
        const field = item.loc ? item.loc[item.loc.length - 1] : '';
        const msg = item.msg || JSON.stringify(item);
        return field ? `${field}: ${msg}` : msg;
      })
      .join(' | ');
  }

  if (typeof detail === 'object') {
    return JSON.stringify(detail);
  }

  return String(detail);
};
