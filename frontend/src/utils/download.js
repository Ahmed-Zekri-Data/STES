// Saves a file received from the server (axios with responseType: 'blob'),
// under the name the server gave it
export const saveResponse = (response, fallbackName = 'document.pdf') => {
  const disposition = response.headers?.['content-disposition'] || '';
  const name = disposition.match(/filename="?([^";]+)"?/)?.[1] || fallbackName;
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return name;
};

// A blob error body (JSON from the API) as its message
export const blobErrorMessage = async (error, fallback) => {
  try {
    const text = await error.response?.data?.text?.();
    return JSON.parse(text).message || fallback;
  } catch {
    return fallback;
  }
};
