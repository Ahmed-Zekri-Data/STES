import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Waves, Sprout, Thermometer, Check, Star, ArrowRight, ShoppingBag, Moon } from 'lucide-react';
import { PROBLEMS, TILES, LEDS, GOVERNORATES, governorateOf, sectionId, tnd } from './story';

// The home page's selling sections, from Admin → Settings → Home page
// (/api/showcase). Each one only shows when it has real products or data.

const PROBLEM_ICONS = { green: Leaf, cloudy: Waves, dirty: Sprout, cold: Thermometer };

const ProductLine = ({ product, quantity = 1 }) => (
  <li>
    <Link to={`/product/${product._id}`}>{quantity > 1 ? `${quantity} × ` : ''}{product.name}</Link>
    <b>{product.inStock ? tnd(product.price * quantity) : 'Rupture'}</b>
  </li>
);

// "My water has a problem": the pool shows it, the shop solves it
export const Diagnostic = ({ problems, active, onPick, onFix, onAddAll }) => {
  const [fixed, setFixed] = useState(false);
  const [temperature, setTemperature] = useState(null);
  const offered = Object.keys(PROBLEMS).filter(key => problems[key]?.products.length);
  const problem = active && PROBLEMS[active];
  const solution = active && problems[active];

  useEffect(() => { setFixed(false); setTemperature(problem?.temperature?.[0] ?? null); }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  const fix = () => {
    setFixed(true);
    onFix();
    if (problem.temperature) {
      const [from, to] = problem.temperature;
      const start = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - start) / 2200);
        setTemperature(Math.round(from + (to - from) * k));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  };

  if (!offered.length) return null;
  return (
    <section id={sectionId('diagnostic')} className="pl-under pl-land" aria-labelledby="pl-diagnostic-title">
      <div className="pl-wrap">
        <div className="pl-panel pl-glass">
          <p className="pl-kicker pl-mono">Diagnostic gratuit</p>
          <h2 id="pl-diagnostic-title" className="pl-title">Mon eau a <em>un problème.</em></h2>
          <p className="pl-sub">Choisissez ce que vous voyez chez vous : la piscine vous le montre, et voici ce qu’il faut.</p>
          <div className="pl-choices pl-choices--grid" role="group" aria-label="Le problème">
            {offered.map(key => {
              const Icon = PROBLEM_ICONS[key];
              return (
                <button key={key} type="button" aria-pressed={active === key} onClick={() => onPick(active === key ? null : key)}>
                  <Icon aria-hidden="true" /> {PROBLEMS[key].label}
                </button>
              );
            })}
          </div>
          {problem && (
            <div className="pl-solution" aria-live="polite">
              <h3>{problem.title}</h3>
              <p>{problem.cause}</p>
              <ul className="pl-lines">{solution.products.map(product => <ProductLine key={product._id} product={product} />)}</ul>
              <div className="pl-total"><span>Le nécessaire</span><b>{tnd(solution.total)}</b></div>
              <div className="pl-row">
                <button type="button" className="pl-pill pl-pill--ghost" onClick={fix} disabled={fixed}>{fixed ? <><Check aria-hidden="true" /> Eau parfaite</> : 'Voir le résultat'}</button>
                <button type="button" className="pl-pill" onClick={(event) => onAddAll(solution.products.filter(p => p.inStock), event)}>Tout ajouter au panier</button>
              </div>
            </div>
          )}
        </div>
      </div>
      {temperature !== null && <div className="pl-temperature" aria-live="polite">{temperature} °C</div>}
    </section>
  );
};

// Build a pool: size (pump and filter), mosaic and lights previewed in 3D
export const Configurator = ({ configurator, onChange, onAddKit, dark }) => {
  const { sizes, lights, options } = configurator;
  const [size, setSize] = useState(0);
  const [tile, setTile] = useState(0);
  const [led, setLed] = useState(lights ? 2 : 0);
  const [night, setNight] = useState(false);
  const [chosen, setChosen] = useState([]);

  // Without a light product to sell, the pool keeps its usual lights
  useEffect(() => { onChange({ tile: TILES[tile], led: lights ? LEDS[led].color : undefined, night }); }, [tile, led, night]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!sizes.length) return null;
  const current = sizes[Math.min(size, sizes.length - 1)];
  const lines = [
    current.pump && [current.pump, 1],
    current.filter && [current.filter, 1],
    lights && led > 0 && [lights, 2],
    ...options.filter(o => chosen.includes(o._id)).map(o => [o, 1])
  ].filter(Boolean);
  const total = lines.reduce((sum, [product, quantity]) => sum + product.price * quantity, 0);

  return (
    <section id={sectionId('config')} className="pl-under pl-land" aria-labelledby="pl-config-title">
      <div className="pl-wrap">
        <div className="pl-panel pl-glass">
          <p className="pl-kicker pl-mono">Configurateur</p>
          <h2 id="pl-config-title" className="pl-title">Composez <em>votre piscine.</em></h2>
          <fieldset className="pl-group">
            <legend className="pl-mono">Taille du bassin</legend>
            <div className="pl-choices">{sizes.map((s, i) => <button key={s.label} type="button" aria-pressed={i === size} onClick={() => setSize(i)}>{s.label}</button>)}</div>
          </fieldset>
          <fieldset className="pl-group">
            <legend className="pl-mono">Mosaïque</legend>
            <div className="pl-choices">
              {TILES.map((t, i) => (
                <button key={t.name} type="button" aria-pressed={i === tile} onClick={() => setTile(i)}>
                  <i className="pl-swatch" style={{ background: `linear-gradient(135deg, ${t.a}, ${t.b})` }} aria-hidden="true" />{t.name}
                </button>
              ))}
            </div>
          </fieldset>
          {lights && (
            <fieldset className="pl-group">
              <legend className="pl-mono">Éclairage LED</legend>
              <div className="pl-choices">
                {LEDS.map((l, i) => <button key={l.name} type="button" aria-pressed={i === led} onClick={() => setLed(i)}>{l.name}</button>)}
                {!dark && <button type="button" aria-pressed={night} onClick={() => setNight(!night)}><Moon aria-hidden="true" /> Voir de nuit</button>}
              </div>
            </fieldset>
          )}
          {options.length > 0 && (
            <fieldset className="pl-group">
              <legend className="pl-mono">Options</legend>
              {options.map(option => (
                <label key={option._id} className="pl-check">
                  <input type="checkbox" checked={chosen.includes(option._id)} onChange={(event) => setChosen(event.target.checked ? [...chosen, option._id] : chosen.filter(id => id !== option._id))} />
                  {option.name} <small>{tnd(option.price)}</small>
                </label>
              ))}
            </fieldset>
          )}
          <ul className="pl-lines">
            {lines.map(([product, quantity]) => <ProductLine key={product._id} product={product} quantity={quantity} />)}
            <li className="pl-lines__muted"><span>Mosaïque {TILES[tile].name} et pose</span><b>sur devis</b></li>
          </ul>
          <div className="pl-total"><span>Votre kit</span><b>{tnd(total)}</b></div>
          <div className="pl-row">
            <button type="button" className="pl-pill" onClick={(event) => onAddKit(lines.filter(([p]) => p.inStock), event)}>Ajouter le kit au panier</button>
            <Link to="/services" className="pl-pill pl-pill--ghost">Devis d’installation gratuit</Link>
          </div>
        </div>
      </div>
    </section>
  );
};

// Seasonal packs: products sold as packs, with what they contain and save
export const Packs = ({ packs, onAdd }) => {
  if (!packs.length) return null;
  return (
    <section id={sectionId('packs')} className="pl-under pl-land" aria-labelledby="pl-packs-title">
      <div className="pl-wrap">
        <p className="pl-kicker pl-mono">Packs saisonniers</p>
        <h2 id="pl-packs-title" className="pl-title">Tout ce qu’il faut, <em>au bon moment.</em></h2>
        <div className="pl-packs">
          {packs.map(({ product, season, includes, worth, saving }) => (
            <article key={product._id} className="pl-card pl-glass pl-pack">
              {season && <span className="pl-card__tag">{season}</span>}
              <h3><Link to={`/product/${product._id}`}>{product.name}</Link></h3>
              {includes.length > 0 && <ul>{includes.map(item => <li key={item._id}>{item.name}</li>)}</ul>}
              {saving > 0 && <span className="pl-pack__save">Économisez {tnd(saving)}</span>}
              <div className="pl-product__row">
                <span className="pl-price">{tnd(product.price)}{saving > 0 && <s>{tnd(worth)}</s>}</span>
                <button type="button" className="pl-pill" disabled={!product.inStock} onClick={(event) => onAdd(product, event)}>{product.inStock ? 'Ajouter' : 'Rupture'}</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

// The outline of Tunisia (longitude, latitude), simplified
const OUTLINE = [[8.6, 36.95], [9.1, 37.15], [9.87, 37.33], [10.2, 37.2], [10.3, 36.9], [10.6, 36.85], [11.05, 37.08], [10.95, 36.7], [10.6, 36.45], [10.62, 35.95], [10.83, 35.78], [11.06, 35.5], [11.1, 35.2], [10.8, 34.95], [10.75, 34.7], [10.45, 34.4], [10.1, 34.1], [10.1, 33.85], [10.45, 33.65], [10.75, 33.6], [11.1, 33.35], [11.55, 33.15], [11.45, 32.4], [10.3, 31.7], [10.0, 30.8], [9.5, 30.25], [9.1, 31.3], [8.3, 32.5], [7.5, 33.2], [7.6, 33.9], [8.25, 34.65], [8.3, 35.3], [8.45, 35.8], [8.35, 36.45]];
const X = (lon) => (lon - 7.2) * 62;
const Y = (lat) => (37.6 - lat) * 74;

const TunisiaMap = ({ governorates }) => {
  const shown = governorates.map(row => ({ ...row, place: governorateOf(row.governorate) })).filter(row => row.place);
  return (
    <svg viewBox="0 0 300 570" className="pl-map-tn" role="img" aria-label={`Commandes par gouvernorat : ${shown.map(r => `${r.place[0]} ${r.count}`).join(', ')}`}>
      <path d={`M${OUTLINE.map(([lon, lat]) => `${X(lon).toFixed(1)} ${Y(lat).toFixed(1)}`).join(' L')} Z`} className="pl-map-tn__land" />
      {GOVERNORATES.map(([name, lon, lat]) => <circle key={name} cx={X(lon)} cy={Y(lat)} r="2" className="pl-map-tn__town" />)}
      {shown.map(({ place: [name, lon, lat], count }, i) => (
        <circle key={name} cx={X(lon)} cy={Y(lat)} r={(4 + Math.sqrt(count) * 1.6).toFixed(1)} className="pl-map-tn__orders" style={{ '--i': i }}>
          <title>{`${name} · ${count} commande${count > 1 ? 's' : ''}`}</title>
        </circle>
      ))}
    </svg>
  );
};

const Stars = ({ rating }) => (
  <span className="pl-stars" role="img" aria-label={`${rating} sur 5`}>
    {[1, 2, 3, 4, 5].map(n => <Star key={n} aria-hidden="true" className={n <= rating ? 'is-on' : ''} />)}
  </span>
);

// Proof: where STES delivers, what customers say, who STES partners with
export const Proof = ({ map, reviews, partnerBadge }) => {
  const hasMap = map && map.orders > 0;
  if (!hasMap && !reviews.length && !partnerBadge) return null;
  const places = hasMap ? map.governorates.filter(row => governorateOf(row.governorate)).length : 0;
  return (
    <section id={sectionId('avis')} className="pl-under pl-land" aria-labelledby="pl-avis-title">
      <div className="pl-wrap">
        <p className="pl-kicker pl-mono">Ils nous font confiance</p>
        <h2 id="pl-avis-title" className="pl-title">Partout en Tunisie, <em>des piscines parfaites.</em></h2>
        <div className={`pl-proof pl-glass${hasMap ? '' : ' pl-proof--single'}`}>
          {hasMap && (
            <div className="pl-proof__map">
              <TunisiaMap governorates={map.governorates} />
            </div>
          )}
          <div>
            {hasMap && <p className="pl-sub pl-proof__count"><b className="pl-big">{map.orders.toLocaleString('fr-FR')}</b> commande{map.orders > 1 ? 's' : ''} livrée{map.orders > 1 ? 's' : ''} ou en route, dans {places} gouvernorat{places > 1 ? 's' : ''}</p>}
            {reviews.length > 0 && (
              <div className="pl-reviews">
                {reviews.map(review => (
                  <figure key={review._id} className="pl-review pl-glass">
                    <Stars rating={review.rating} />
                    <blockquote>« {review.comment} »</blockquote>
                    <figcaption>{review.author} · <Link to={`/product/${review.productId}`}>{review.productName}</Link></figcaption>
                  </figure>
                ))}
              </div>
            )}
            {partnerBadge && <p className="pl-partner">{partnerBadge}</p>}
            <Link to="/shop" className="pl-pill pl-pill--ghost pl-more"><ShoppingBag aria-hidden="true" /> Voir la boutique <ArrowRight aria-hidden="true" /></Link>
          </div>
        </div>
      </div>
    </section>
  );
};
