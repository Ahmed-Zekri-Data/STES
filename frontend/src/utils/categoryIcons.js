import { Waves, Cog, Filter, FlaskConical, Sparkles, Flame, Lightbulb, LifeBuoy, Wrench, Droplets } from 'lucide-react';

// Icon and hue (OKLCH degrees) for each category, by slug. Categories added
// later in Admin → Categories get the water drop and the brand hue.
const CATEGORY_LOOK = {
  pools: { icon: Waves, hue: 215 },
  'pumps-motors': { icon: Cog, hue: 255 },
  filters: { icon: Filter, hue: 195 },
  chemicals: { icon: FlaskConical, hue: 160 },
  cleaning: { icon: Sparkles, hue: 290 },
  heating: { icon: Flame, hue: 35 },
  lighting: { icon: Lightbulb, hue: 85 },
  accessories: { icon: LifeBuoy, hue: 340 },
  maintenance: { icon: Wrench, hue: 235 }
};

export const categoryLook = (slug) => CATEGORY_LOOK[slug] || { icon: Droplets, hue: 212 };
