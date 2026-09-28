import { useLocation } from 'react-router-dom';
import { useShopSettings } from '../../context/shopSettings';
import { metaForPath, setsOwnMeta, storeJsonLd, usePageMeta } from '../../utils/pageMeta';

// The title and search-engine tags of pages with fixed ones. The shop and
// product pages set theirs once they know what they show.
const RouteMeta = () => {
  const { pathname } = useLocation();
  const { contact } = useShopSettings();
  const own = setsOwnMeta(pathname);
  const meta = own ? null : metaForPath(pathname);
  if (meta && pathname === '/') meta.jsonLd = storeJsonLd(contact, window.location.origin);
  usePageMeta(meta);
  return null;
};

export default RouteMeta;
