import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';

const formatTND = (amount) => `${Number(amount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND`;

// Account → Liste de souhaits: the products the customer saved with the
// heart button, to add to the cart or remove
const WishlistTab = () => {
  const { wishlist, loading, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const [notice, setNotice] = useState('');

  const items = (wishlist?.items || []).filter(item => item.product);

  const moveToCart = (product) => {
    addToCart({ _id: product._id, name: product.name, price: product.price, image: product.image }, 1);
    setNotice(`« ${product.name} » a été ajouté au panier.`);
  };

  const remove = async (product) => {
    try {
      await removeFromWishlist(product._id);
      setNotice(`« ${product.name} » a été retiré de votre liste.`);
    } catch {
      setNotice(`« ${product.name} » n'a pas pu être retiré. Veuillez réessayer.`);
    }
  };

  if (loading && !wishlist) return <p className="text-gray-500">Chargement…</p>;

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-xl p-6 shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Ma liste de souhaits</h3>
          <p className="text-sm text-gray-600">
            {items.length
              ? `${items.length} produit${items.length > 1 ? 's' : ''} gardé${items.length > 1 ? 's' : ''} pour plus tard.`
              : 'Touchez le cœur d’un produit dans la boutique pour le garder ici.'}
          </p>
        </div>
        <Link to={items.length ? '/wishlist' : '/shop'} className="text-sm font-medium text-blue-600 hover:text-blue-800">
          {items.length ? 'Voir la liste complète' : 'Parcourir la boutique'}
        </Link>
      </div>

      {notice && <p role="status" className="text-sm text-blue-700">{notice}</p>}

      {!items.length && (
        <div className="bg-surface rounded-xl p-8 shadow-lg text-center">
          <Heart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">Votre liste de souhaits est vide.</p>
        </div>
      )}

      <div className="space-y-3">
        {items.map(({ product, addedAt }) => {
          const available = product.inStock !== false && (product.stockQuantity ?? 1) > 0;
          return (
            <div key={product._id} className="bg-surface rounded-xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center gap-4">
              <Link to={`/product/${product._id}`} className="flex items-center gap-4 flex-1 min-w-0">
                <img src={product.image || '/api/placeholder/80/80'} alt="" className="w-16 h-16 rounded-lg object-cover bg-gray-100 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{product.name}</p>
                  <p className="text-sm text-gray-900">{formatTND(product.price)}</p>
                  <p className={`text-xs ${available ? 'text-green-600' : 'text-red-600'}`}>
                    {available ? 'En stock' : 'Rupture de stock'}
                    {addedAt && <span className="text-gray-400"> · ajouté le {new Date(addedAt).toLocaleDateString('fr-FR')}</span>}
                  </p>
                </div>
              </Link>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => moveToCart(product)}
                  disabled={!available}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="w-4 h-4" /> Ajouter au panier
                </button>
                <button
                  type="button"
                  onClick={() => remove(product)}
                  aria-label={`Retirer ${product.name} de la liste`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" /> Retirer
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WishlistTab;
