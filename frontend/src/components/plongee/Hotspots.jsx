import React from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import ProductVisual from '../product/ProductVisual';
import { tnd } from './story';

// What each 3D object is, above its product
const SPOT_LABELS = {
  pump: 'Local technique · la pompe',
  filter: 'Local technique · le filtre',
  robot: 'Robot · nettoie le fond',
  lights: 'Éclairage de la piscine',
  ring: 'Sur l’eau'
};

// "+" markers on the equipment in the 3D scene; the page moves them every
// frame (through `register`) and opens one product card at a time
const Hotspots = ({ hotspots, register, open, onOpen, onAdd }) => (
  <div className="pl-spots">
    {Object.entries(hotspots).filter(([, product]) => product).map(([key, product]) => (
      <div key={key} ref={(el) => register(key, el)} className={`pl-spot${open === key ? ' is-open' : ''}`}>
        <button type="button" className="pl-spot__dot" aria-expanded={open === key} aria-label={`${product.name} : voir le produit`} onClick={() => onOpen(open === key ? null : key)}>
          <Plus aria-hidden="true" />
        </button>
        <div className="pl-spot__card">
          <Link to={`/product/${product._id}`} className="pl-spot__pic"><ProductVisual product={product} iconClassName="h-1/3 w-1/3" /></Link>
          <p className="pl-mono">{SPOT_LABELS[key]}</p>
          <h3><Link to={`/product/${product._id}`}>{product.name}</Link></h3>
          <div className="pl-spot__buy">
            <b>{product.priceOnRequest ? 'Prix sur demande' : tnd(product.price)}</b>
            <button type="button" disabled={!product.inStock} onClick={(event) => onAdd(product, event)}>{product.choose ? 'Choisir →' : product.inStock ? 'Ajouter +' : 'Rupture'}</button>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default Hotspots;
