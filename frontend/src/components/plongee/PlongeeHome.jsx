import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowDown, ArrowRight, Plus, Volume2, VolumeX, ShoppingBag, MessageCircle, Phone, Truck, Banknote, Wrench, ShieldCheck } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useCart } from '../../context/CartContext';
import { useShopSettings, whatsappLink, phoneLink } from '../../context/shopSettings';
import { pickProducts } from '../../utils/productPicks';
import { categoryLook } from '../../utils/categoryIcons';
import { flyToCart } from '../../utils/flyToCart';
import ProductVisual from '../product/ProductVisual';
import Intro from './Intro';
import { createSoundscape } from './audio';
import { SECTIONS, sectionId, HINTS, MAP_STEPS, qualityFor, PROBLEMS, tnd } from './story';
import { Diagnostic, Configurator, Packs, Proof } from './ShowcaseSections';
import Hotspots from './Hotspots';
import './plongee.css';

// The 3D film needs WebGL 2; without it the page shows the same content flat
const webglAvailable = () => {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
};

const reducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

const storage = {
  get: (store, key) => { try { return window[store].getItem(key); } catch { return null; } },
  set: (store, key, value) => { try { window[store].setItem(key, value); } catch { /* private mode */ } }
};

const TOUR = [
  { id: 'scroll', text: 'Faites défiler pour vivre la plongée. Passez la souris sur l’eau : elle bouge vraiment.' },
  { id: 'map', text: 'Ce plan montre où vous êtes. Cliquez sur une étape pour y aller directement.' },
  { id: 'shop', text: 'Pressé ? Ce bouton vous emmène tout de suite à la boutique.' }
];

const SPACERS = { goggles: 110, ready: 150, dive: 110, robot: 170, up: 130, surface: 120, garden: 220 };

const Beat = ({ beat }) => {
  if (!beat) return null;
  if (beat.kind === 'count') return <div className="pl-beat__count">{beat.text}</div>;
  if (beat.kind === 'go') return <div className="pl-beat__go">{beat.text}</div>;
  return (
    <div className={`pl-beat__${beat.kind}`}>
      <p className="pl-mono">{beat.kicker}</p>
      <h2>{beat.title} <em>{beat.accent}</em></h2>
    </div>
  );
};

const PlongeeHome = () => {
  const { isDark } = useTheme();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const { contact } = useShopSettings();
  const whatsapp = whatsappLink(contact.whatsapp);

  const three = useMemo(() => webglAvailable(), []);
  const reduce = useMemo(() => reducedMotion(), []);
  const [introShown] = useState(() => three && !storage.get('sessionStorage', 'stes-intro'));
  const [ready, setReady] = useState(false);
  const [introOver, setIntroOver] = useState(!three);
  const [impact, setImpact] = useState(false);
  const [beat, setBeat] = useState(null);
  const [section, setSection] = useState('hero');
  const [soundOn, setSoundOn] = useState(false);
  const [tourStep, setTourStep] = useState(-1);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState(null);
  const [showcase, setShowcase] = useState(null);
  const [problem, setProblem] = useState(null);
  const [openSpot, setOpenSpot] = useState(null);
  const spots = useRef({});
  const openSpotRef = useRef(null);
  openSpotRef.current = openSpot;

  const stage = useRef(null);
  const page = useRef(null);
  const dom = { flash: useRef(null), gog: useRef(null), hudL: useRef(null), hudR: useRef(null), beat: useRef(null), depth: useRef(null), apnea: useRef(null), air: useRef(null) };
  const sceneRef = useRef(null);
  const audio = useRef(null);
  const dark = useRef(isDark);
  dark.current = isDark;
  const layoutMap = useRef({});
  const [present, setPresent] = useState('');

  // Shop content
  useEffect(() => {
    let cancelled = false;
    axios.get('/api/products/categories')
      .then(response => { if (!cancelled) setCategories(Object.entries(response.data.categories || {})); })
      .catch(() => { if (!cancelled) setCategories([]); });
    axios.get('/api/showcase')
      .then(response => { if (!cancelled && response.data?.hotspots) setShowcase(response.data); })
      .catch(() => { if (!cancelled) setShowcase(null); });
    pickProducts({ limit: 4 })
      .then(list => { if (!cancelled) setProducts(list); })
      .catch(() => { if (!cancelled) setProducts([]); });
    return () => { cancelled = true; };
  }, []);

  // Where each section is on the page (the camera follows them)
  const measure = useCallback(() => {
    const map = {};
    for (const name of SECTIONS) {
      const el = document.getElementById(sectionId(name));
      if (el) {
        const box = el.getBoundingClientRect();
        map[name] = { top: box.top + window.scrollY, height: box.height };
      }
    }
    layoutMap.current = map;
    const names = Object.keys(map).join(' ');
    setPresent(current => (current === names ? current : names));
    sceneRef.current?.measure();
  }, []);
  const layout = useCallback((name) => layoutMap.current[name] || null, []);

  useEffect(() => {
    measure();
    // Sections grow as products load: measure again
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => measure());
    if (page.current) observer.observe(page.current);
    return () => observer.disconnect();
  }, [measure]);

  // The current section: hints and the dive map
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY + window.innerHeight * 0.5;
        let current = 'hero';
        for (const name of SECTIONS) if ((layoutMap.current[name]?.top ?? Infinity) <= y) current = name;
        setSection(current);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
  }, []);

  // "+" markers on the equipment: in the garden when above water, and
  // around the swimmer (robot, lights, ring) in the pool
  const within = (name, y) => { const box = layoutMap.current[name]; return box ? (y - box.top) / box.height : -1; };
  const placeSpots = useCallback(({ project, under, goggles, y }) => {
    const garden = within('garden', y);
    const inGarden = !under && garden > -0.05 && garden < 0.95;
    const inPool = under && goggles > 0.9 && ['robot', 'up'].some(name => { const q = within(name, y); return q > 0.05 && q < 0.72; });
    for (const [key, el] of Object.entries(spots.current)) {
      if (!el) continue;
      const at = project(key);
      const underwater = key === 'robot' || key === 'lights';
      const show = Boolean(at?.inView) && ((inGarden && !underwater && at.distance < 14) || (inPool && key !== 'pump' && key !== 'filter' && at.distance < 6.5));
      el.classList.toggle('is-shown', show);
      el.classList.toggle('is-left', Boolean(at && at.side > 0.35));
      el.classList.toggle('is-under', under);
      if (at) el.style.transform = `translate(${at.x}px, ${at.y}px)`;
      if (!show && openSpotRef.current === key) setOpenSpot(null);
    }
  }, []);

  // The 3D film
  useEffect(() => {
    if (!three) return undefined;
    let alive = true;
    audio.current = createSoundscape();
    const elements = Object.fromEntries(Object.entries(dom).map(([key, ref]) => [key, ref.current]));
    // A canvas of its own for each start (React may start the page twice in development)
    const canvas = document.createElement('canvas');
    canvas.className = 'pl-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    stage.current.appendChild(canvas);
    import('./PlongeeScene')
      .then(({ createPlongeeScene }) => createPlongeeScene({
        canvas,
        dom: elements,
        layout,
        isDark: () => dark.current,
        quality: qualityFor({ width: window.innerWidth, pixelRatio: window.devicePixelRatio, memory: navigator.deviceMemory }),
        audio: audio.current,
        reduceMotion: reduce,
        onFirstFrame: () => { if (alive) { canvas.classList.add('pl-canvas--ready'); setReady(true); } },
        onBeat: (next) => { if (alive) setBeat(next); },
        afterFrame: placeSpots
      }))
      .then((scene) => {
        if (!alive) { scene.dispose(); return; }
        sceneRef.current = scene;
        measure();
        if (!introShown) scene.skipIntro();
      })
      .catch((error) => {
        console.error('3D home page unavailable:', error);
        if (alive) { setReady(true); setIntroOver(true); }
      });
    return () => {
      alive = false;
      sceneRef.current?.dispose();
      sceneRef.current = null;
      audio.current?.close();
      canvas.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // No scrolling while the opening plays
  useEffect(() => {
    if (introOver) return undefined;
    window.scrollTo(0, 0);
    document.documentElement.classList.add('pl-locked');
    return () => document.documentElement.classList.remove('pl-locked');
  }, [introOver]);

  const endIntro = useCallback((withImpact) => {
    storage.set('sessionStorage', 'stes-intro', '1');
    if (withImpact) {
      sceneRef.current?.impact();
      setImpact(true);
      // The camera pull-out lasts about 4 s
      setTimeout(() => setIntroOver(true), 3800);
    } else {
      sceneRef.current?.skipIntro();
      setIntroOver(true);
    }
  }, []);

  // First visit: a three-step guided tour once the page is free
  useEffect(() => {
    if (introOver && !storage.get('localStorage', 'stes-tour')) {
      const timer = setTimeout(() => setTourStep(0), 900);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [introOver]);
  const closeTour = () => { setTourStep(-1); storage.set('localStorage', 'stes-tour', '1'); };
  // The dive map is hidden on small screens, and so is its tour step
  const tour = useMemo(() => TOUR.filter(step => step.id !== 'map' || window.innerWidth >= 1000), []);

  // Scrolling away from the diagnostic brings back clear water
  const problemRef = useRef(null);
  problemRef.current = problem;
  useEffect(() => {
    if (section !== 'diagnostic' && problemRef.current) { setProblem(null); sceneRef.current?.setWater(null, 1.5); }
  }, [section]);
  const [preview, setPreview] = useState(null);
  useEffect(() => { sceneRef.current?.setPreview(section === 'config' ? preview : null); }, [section, preview]);
  const pickProblem = (key) => { setProblem(key); sceneRef.current?.setWater(key ? PROBLEMS[key].water : null); };
  // Products with versions or a price on request are chosen on their page:
  // the others go in the cart, then that page opens
  const addMany = (lines, event) => {
    const ready = lines.filter(([product]) => !product.choose);
    for (const [product, quantity] of ready) addToCart(product, quantity);
    if (ready.length) flyToCart(event.currentTarget);
    const toChoose = lines.find(([product]) => product.choose);
    if (toChoose) navigate(`/product/${toChoose[0]._id}`);
  };

  const go = (name) => document.getElementById(sectionId(name))?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  const toggleSound = () => setSoundOn(audio.current?.toggle() ?? false);
  const add = (product, event) => {
    if (product.choose) { navigate(`/product/${product._id}`); return; }
    addToCart(product, 1);
    flyToCart(event.currentTarget);
  };

  const hint = three && introOver ? HINTS[section] ?? '' : '';
  // The dive map lights the last step reached
  const reached = SECTIONS.indexOf(section);
  const activeStep = MAP_STEPS.reduce((current, [name]) => (SECTIONS.indexOf(name) <= reached ? name : current), 'hero');
  const flat = !three;

  return (
    <div ref={page} className={`pl${flat ? ' pl--flat' : ''}`}>
      {three && (
        <>
          <div ref={stage} className="pl-stage" />
          <div ref={dom.flash} className="pl-flash" aria-hidden="true" />
          <div ref={dom.gog} className="pl-gog" aria-hidden="true">
            <div className="pl-gog__float">
              <svg viewBox="0 0 440 180">
                <defs>
                  <linearGradient id="pl-gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d5fcff" /><stop offset=".3" stopColor="#3fd6ec" /><stop offset=".68" stopColor="#0a6f96" /><stop offset="1" stopColor="#05304a" /></linearGradient>
                  <linearGradient id="pl-gf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1a6b82" /><stop offset="1" stopColor="#062835" /></linearGradient>
                  <linearGradient id="pl-gs" x1="0" x2="1"><stop offset="0" stopColor="#0b3a48" stopOpacity="0" /><stop offset=".12" stopColor="#0d4656" /><stop offset=".88" stopColor="#0d4656" /><stop offset="1" stopColor="#0b3a48" stopOpacity="0" /></linearGradient>
                  <g id="pl-lens">
                    <path d="M58 60C60 34 150 30 190 50C206 58 206 104 186 120C160 142 70 144 56 112C50 98 52 76 58 60Z" fill="url(#pl-gf)" />
                    <path d="M72 64C76 46 148 44 180 58C191 64 191 100 176 111C154 129 84 131 70 108C64 96 66 78 72 64Z" fill="url(#pl-gl)" />
                    <path d="M86 70C102 58 132 55 156 61" stroke="#fff" strokeOpacity=".8" strokeWidth="7" strokeLinecap="round" fill="none" />
                    <circle cx="168" cy="66" r="4" fill="#fff" fillOpacity=".8" />
                  </g>
                </defs>
                <rect x="0" y="80" width="440" height="24" rx="12" fill="url(#pl-gs)" />
                <use href="#pl-lens" />
                <use href="#pl-lens" transform="translate(440 0) scale(-1 1)" />
                <path d="M196 82Q220 66 244 82" stroke="#0d4656" strokeWidth="12" fill="none" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <aside ref={dom.hudL} className="pl-hud" aria-hidden="true">
            <small>Profondeur</small><b ref={dom.depth}>0,00 m</b>
            <small className="pl-hud__gap">Apnée</small><b ref={dom.apnea}>00:00</b>
            <div className="pl-hud__bar"><i ref={dom.air} /></div>
          </aside>
          <aside ref={dom.hudR} className="pl-hud pl-hud--right" aria-hidden="true">
            <div className="pl-hud__row"><small>Eau</small><b>27,4 °C</b></div>
            <div className="pl-hud__row"><small>pH</small><b>7,2</b><small>Cl</small><b>1,5</b></div>
            <span className="pl-hud__ok">Eau parfaite</span>
          </aside>
          <div ref={dom.beat} className="pl-beat" aria-live="polite"><Beat beat={beat} /></div>
          {showcase && (
            <Hotspots
              hotspots={showcase.hotspots}
              register={(key, el) => { spots.current[key] = el; }}
              open={openSpot}
              onOpen={setOpenSpot}
              onAdd={add}
            />
          )}

          {introOver && (
            <>
              <nav className="pl-map" aria-label="Étapes de la visite">
                <ol>
                  {MAP_STEPS.filter(([name]) => present.split(' ').includes(name)).map(([name, label]) => (
                    <li key={name}>
                      <button type="button" onClick={() => go(name)} className={name === activeStep ? 'is-on' : ''} aria-current={name === activeStep ? 'step' : undefined}>
                        <span className="pl-map__dot" /><span className="pl-map__label">{label}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </nav>
              <div className="pl-controls">
                <button type="button" className="pl-pill pl-pill--ghost pl-pill--icon" onClick={toggleSound} aria-pressed={soundOn} aria-label={soundOn ? 'Couper le son' : 'Activer le son'}>
                  {soundOn ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
                </button>
                {SECTIONS.indexOf(section) < SECTIONS.indexOf('boutique') && (
                  <Link to="/shop" className="pl-pill pl-pill--ghost">Aller directement à la boutique <ArrowRight aria-hidden="true" /></Link>
                )}
              </div>
              <p className={`pl-hint${hint ? ' pl-hint--show' : ''}`} aria-live="polite">{hint}</p>
            </>
          )}

          {tourStep >= 0 && (
            <div className={`pl-tour pl-tour--${tour[tourStep].id}`} role="dialog" aria-label="Visite guidée">
              <p className="pl-mono">Visite guidée · {tourStep + 1}/{tour.length}</p>
              <p>{tour[tourStep].text}</p>
              <div className="pl-tour__actions">
                <button type="button" className="pl-link" onClick={closeTour}>Passer</button>
                <button type="button" className="pl-pill" onClick={() => (tourStep + 1 < tour.length ? setTourStep(tourStep + 1) : closeTour())}>
                  {tourStep + 1 < tour.length ? 'Suivant' : 'Compris'}
                </button>
              </div>
            </div>
          )}

          {introOver && whatsapp && (
            <a className="pl-whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label="Écrire à un technicien sur WhatsApp">
              <MessageCircle aria-hidden="true" /><span>Un technicien vous répond<small>WhatsApp</small></span>
            </a>
          )}
          {impact && <><div className="pl-impact" aria-hidden="true" /><div className="pl-impact pl-impact--two" aria-hidden="true" /></>}
          {!introOver && (
            <Intro ready={ready} short={!introShown || reduce} onImpact={() => endIntro(true)} onSkip={() => endIntro(false)} />
          )}
        </>
      )}

      <div className={`pl-content${introOver ? ' pl-content--on' : ''}`}>
        <section id={sectionId('hero')} className="pl-hero">
          <div className="pl-hero__inner">
            <p className="pl-mono">STES.tn · Piscines &amp; équipements</p>
            <h1><span>Plongez</span> <span>dans l’eau</span> <span>parfaite.</span></h1>
            <p className="pl-hero__lede">
              {flat
                ? 'Tout pour construire, équiper et entretenir votre piscine en Tunisie.'
                : 'Mettez vos lunettes, prenez votre élan : la boutique est au fond de la piscine.'}
            </p>
          </div>
          {flat
            ? <Link to="/shop" className="pl-pill pl-hero__cta">Voir la boutique <ArrowRight aria-hidden="true" /></Link>
            : <button type="button" className="pl-pill pl-hero__cta" onClick={() => go('goggles')}>Mettre mes lunettes <ArrowDown aria-hidden="true" /></button>}
        </section>

        {three && ['goggles', 'ready', 'dive'].map(name => <section key={name} id={sectionId(name)} className="pl-spacer" style={{ height: `${SPACERS[name]}vh` }} aria-hidden="true" />)}

        <section id={sectionId('boutique')} className="pl-under" aria-labelledby="pl-boutique-title">
          <div className="pl-wrap">
            <p className="pl-kicker pl-mono">{flat ? 'La boutique' : '−1,2 m · La boutique'}</p>
            <h2 id="pl-boutique-title" className="pl-title">Tout ce qui fait <em>une eau cristalline.</em></h2>
            <div className="pl-grid">
              {categories.map(([slug, category]) => {
                const { icon: Icon } = categoryLook(slug);
                return (
                  <Link key={slug} to={`/shop?category=${encodeURIComponent(slug)}`} className="pl-card pl-glass">
                    <span className="pl-card__icon"><Icon aria-hidden="true" strokeWidth={1.6} /></span>
                    <h3>{category.name}</h3>
                    {category.description && <p>{category.description}</p>}
                    <span className="pl-card__go">Voir les produits <ArrowRight aria-hidden="true" /></span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {three && <section id={sectionId('robot')} className="pl-spacer" style={{ height: `${SPACERS.robot}vh` }} aria-hidden="true" />}

        <section id={sectionId('produits')} className="pl-under" aria-labelledby="pl-produits-title">
          <div className="pl-wrap">
            <p className="pl-kicker pl-mono">{flat ? 'Les favoris' : '−1,4 m · Les favoris'}</p>
            <h2 id="pl-produits-title" className="pl-title">Choisis par nos <em>techniciens.</em></h2>
            <div className="pl-grid">
              {(products || []).map(product => (
                <article key={product._id} className="pl-card pl-glass pl-product">
                  <Link to={`/product/${product._id}`} className="pl-product__pic"><ProductVisual product={product} iconClassName="h-1/3 w-1/3" /></Link>
                  <span className="pl-card__tag">{product.categoryName || product.category}</span>
                  <h3><Link to={`/product/${product._id}`}>{product.name}</Link></h3>
                  <div className="pl-product__row">
                    <span className="pl-price">{tnd(product.price)}</span>
                    <button type="button" className="pl-plus" onClick={(event) => add(product, event)} aria-label={`Ajouter ${product.name} au panier`}><Plus aria-hidden="true" /></button>
                  </div>
                </article>
              ))}
            </div>
            <Link to="/shop" className="pl-pill pl-pill--ghost pl-more"><ShoppingBag aria-hidden="true" /> Tous les produits</Link>
          </div>
        </section>

        {three && ['up', 'surface', 'garden'].map(name => <section key={name} id={sectionId(name)} className="pl-spacer" style={{ height: `${SPACERS[name]}vh` }} aria-hidden="true" />)}

        {showcase && (
          <>
            <Diagnostic problems={showcase.problems} active={problem} onPick={pickProblem} onFix={() => sceneRef.current?.setWater(null, 2.4)} onAddAll={(list, event) => addMany(list.map(p => [p, 1]), event)} />
            <Configurator configurator={showcase.configurator} onChange={setPreview} onAddKit={addMany} dark={isDark} />
            <Packs packs={showcase.packs} onAdd={add} />
            <Proof map={showcase.map} reviews={showcase.reviews} partnerBadge={showcase.partnerBadge} />
          </>
        )}

        <section id={sectionId('installation')} className="pl-under pl-land" aria-labelledby="pl-installation-title">
          <div className="pl-wrap">
            <div className="pl-panel pl-glass">
              <p className="pl-kicker pl-mono">Installation clé en main</p>
              <h2 id="pl-installation-title" className="pl-title">Votre piscine, <em>de l’étude à la baignade.</em></h2>
              <ol className="pl-steps">
                <li><b>01</b><div><h3>Étude &amp; devis</h3><p>Visite sur place et devis détaillé.</p></div></li>
                <li><b>02</b><div><h3>Conception</h3><p>Forme, mosaïque, éclairage et équipements.</p></div></li>
                <li><b>03</b><div><h3>Construction</h3><p>Pose, raccordement, mise en eau.</p></div></li>
                <li><b>04</b><div><h3>Entretien</h3><p>Suivi, hivernage et dépannage. <Link to="/entretien">Recevoir nos rappels</Link></p></div></li>
              </ol>
              <ul className="pl-trust">
                <li><Truck aria-hidden="true" /> Livraison dans les 24 gouvernorats</li>
                <li><Banknote aria-hidden="true" /> Paiement à la livraison</li>
                <li><Wrench aria-hidden="true" /> Pose par nos techniciens</li>
                <li><ShieldCheck aria-hidden="true" /> Garantie sur nos produits</li>
                {showcase?.partnerBadge && <li className="pl-trust__partner">{showcase.partnerBadge}</li>}
              </ul>
              <div className="pl-row">
                <Link to="/construire" className="pl-pill">Dessiner ma piscine <ArrowRight aria-hidden="true" /></Link>
                <Link to="/services" className="pl-pill pl-pill--ghost">Demander un devis</Link>
              </div>
            </div>
          </div>
        </section>

        <section id={sectionId('contact')} className="pl-contact" aria-labelledby="pl-contact-title">
          <div className="pl-wrap pl-contact__inner">
            <p className="pl-kicker pl-mono">Un projet, une question ?</p>
            <h2 id="pl-contact-title" className="pl-title">Parlons de <em>votre piscine.</em></h2>
            <div className="pl-contact__cta">
              {whatsapp && <a className="pl-pill" href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true" /> Écrire sur WhatsApp</a>}
              {contact.phone && <a className="pl-pill pl-pill--ghost" href={phoneLink(contact.phone)}><Phone aria-hidden="true" /> {contact.phone}</a>}
              <Link className="pl-pill pl-pill--ghost" to="/shop"><ShoppingBag aria-hidden="true" /> La boutique</Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PlongeeHome;
