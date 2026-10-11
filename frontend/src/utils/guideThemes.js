import { Wrench, FlaskConical, Cog, Hammer, CalendarDays } from 'lucide-react';

// The themes of the "Conseils" guides (same keys as the server's Guide model)
export const GUIDE_THEMES = {
  entretien: { label: 'Entretien', icon: Wrench },
  problemes: { label: 'Problèmes d’eau', icon: FlaskConical },
  equipement: { label: 'Équipement', icon: Cog },
  construction: { label: 'Construction', icon: Hammer },
  saison: { label: 'Saisons', icon: CalendarDays }
};

export const themeOf = (key) => GUIDE_THEMES[key] || GUIDE_THEMES.entretien;

export const longDate = (date) => (date ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
