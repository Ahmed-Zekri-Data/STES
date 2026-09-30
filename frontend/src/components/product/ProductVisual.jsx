import React, { useState } from 'react';
import { categoryLook } from '../../utils/categoryIcons';

// Products without a photo use the shop's placeholder URL
const hasPhoto = (image) => Boolean(image) && !String(image).startsWith('/api/placeholder');

// The product's photo, or, when it has none (or it fails to load), a
// rendered glass orb in the colour of its category with its icon inside.
const ProductVisual = ({ product, className = '', iconClassName = 'h-1/3 w-1/3', eager = false }) => {
  const [broken, setBroken] = useState(false);
  const { icon: Icon, hue } = categoryLook(product.category);

  if (hasPhoto(product.image) && !broken) {
    return (
      <img
        src={product.image}
        alt={product.name}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setBroken(true)}
        // Equipment photos are shown whole, on white, as in the makers' catalogues
        className={`h-full w-full bg-white object-contain p-[8%] ${className}`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={product.name}
      className={`product-visual relative grid h-full w-full place-items-center overflow-hidden ${className}`}
      style={{ '--h': hue }}
    >
      <div className="product-visual__grid" aria-hidden="true" />
      <div className="product-visual__stage" aria-hidden="true">
        <span className="product-visual__orbit" />
        <span className="product-visual__orb">
          <Icon className={`${iconClassName} text-white drop-shadow-[0_2px_6px_rgb(0_0_0/0.25)]`} strokeWidth={1.6} />
        </span>
        <span className="product-visual__shadow" />
      </div>
    </div>
  );
};

export default ProductVisual;
