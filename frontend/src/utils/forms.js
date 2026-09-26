// What to tell a visitor when a contact or quote form can't be sent
export const submitErrorMessage = (error, fallback) => {
  if (error.response?.status === 429) {
    return error.response.data?.message || 'Trop de messages envoyés. Veuillez réessayer plus tard.';
  }
  if (error.response?.status === 400) {
    return 'Veuillez vérifier les champs du formulaire (email valide, message de 1000 caractères maximum).';
  }
  return fallback;
};
