// The first "Conseils" guides, created as drafts by `npm run init:guides`
// (scripts/initGuides.js). A STES technician reads and corrects them in
// Admin → Guides before publishing: doses and settings must match the
// products the shop sells. Existing guides are never overwritten.

module.exports = [
  {
    slug: 'eau-verte-piscine',
    theme: 'problemes',
    title: 'Eau verte dans la piscine : la rattraper en 48 heures',
    summary: 'Une eau verte vient presque toujours d’un manque de chlore et d’un pH trop haut. Voici dans quel ordre agir pour retrouver une eau claire en deux jours.',
    body: `
<p>Une piscine qui verdit en quelques jours, surtout pendant les fortes chaleurs, c’est le signe que des algues se développent. La bonne nouvelle : avec la bonne méthode, l’eau redevient claire en 48 heures environ, sans vider le bassin.</p>

<h2>Pourquoi l’eau devient verte</h2>
<p>Les algues profitent de trois choses : une eau chaude, un chlore trop bas et une filtration insuffisante. En été en Tunisie, l’eau dépasse souvent 28 °C : le chlore se consomme beaucoup plus vite, et quelques jours d’absence suffisent pour que tout bascule. Un pH trop élevé aggrave le problème, car il rend le chlore beaucoup moins efficace.</p>

<h2>Ce qu’il faut avant de commencer</h2>
<ul>
  <li>Une trousse ou des bandelettes d’analyse (pH et chlore).</li>
  <li>Un produit pour baisser le pH (pH moins).</li>
  <li>Un chlore choc.</li>
  <li>Une brosse de paroi et une épuisette.</li>
  <li>Éventuellement un floculant si l’eau reste trouble après le traitement.</li>
</ul>

<h2>La méthode, étape par étape</h2>
<ol>
  <li><strong>Retirez les débris</strong> (feuilles, insectes) à l’épuisette et videz les paniers des skimmers et du préfiltre de la pompe.</li>
  <li><strong>Brossez les parois et le fond</strong> : les algues s’accrochent, le brossage les met en suspension pour que le traitement les atteigne.</li>
  <li><strong>Ajustez le pH en premier</strong> : visez entre 7,0 et 7,2 pour le traitement de choc. Au-dessus de 7,6, le chlore perd une grande partie de son efficacité.</li>
  <li><strong>Faites un traitement choc le soir</strong>, quand le soleil ne détruit plus le chlore. Respectez la dose indiquée sur l’emballage pour le volume de votre bassin, et diluez le produit dans un seau d’eau avant de le verser devant les refoulements si la notice le demande.</li>
  <li><strong>Filtrez en continu pendant 48 heures</strong>, pompe en marche jour et nuit.</li>
  <li><strong>Nettoyez le filtre</strong> le lendemain : contre-lavage pour un filtre à sable, rinçage pour un filtre à cartouche. Il retient les algues mortes et se colmate vite.</li>
  <li><strong>Si l’eau reste trouble</strong> une fois verdâtre disparue, utilisez un floculant, puis aspirez le dépôt au fond du bassin, vanne sur « égout » si votre installation le permet.</li>
  <li><strong>Contrôlez à nouveau</strong> le pH et le chlore avant de vous baigner : pH entre 7,2 et 7,4, chlore libre revenu dans la zone indiquée par votre produit.</li>
</ol>

<h2>Éviter que ça recommence</h2>
<ul>
  <li><strong>Filtrez assez longtemps</strong> : une règle simple consiste à filtrer, en heures par jour, la moitié de la température de l’eau (eau à 28 °C : environ 14 heures).</li>
  <li><strong>Analysez l’eau deux fois par semaine</strong> en été, et après chaque orage ou forte fréquentation.</li>
  <li><strong>Gardez le pH entre 7,2 et 7,4</strong> : c’est le réglage qui fait le plus pour l’efficacité du chlore.</li>
  <li><strong>Avant de partir en vacances</strong>, faites un traitement complet et programmez la filtration.</li>
</ul>

<h2>Quand appeler un technicien</h2>
<p>Si l’eau ne s’éclaircit pas après 48 heures, le problème vient souvent du filtre (sable usé, cartouche à changer) ou d’une pompe qui ne fait plus circuler assez d’eau. Un technicien STES peut vérifier votre installation et vous dire quoi changer.</p>
`
  },
  {
    slug: 'hivernage-piscine-tunisie',
    theme: 'saison',
    title: 'Hivernage de la piscine en Tunisie : actif ou passif ?',
    summary: 'Hiver doux ou piscine fermée plusieurs mois : comment choisir entre hivernage actif et passif, et les étapes pour retrouver une eau saine au printemps.',
    body: `
<p>Hiverner sa piscine, c’est la préparer pour les mois où l’on ne se baigne plus, de façon à retrouver une eau propre et une installation intacte au printemps. En Tunisie, les hivers sont doux sur la côte : on n’hiverne pas tout à fait comme dans un pays où il gèle chaque nuit.</p>

<h2>Quand commencer</h2>
<p>On hiverne quand la température de l’eau descend durablement sous 12 à 15 °C, en général entre fin octobre et fin novembre selon les régions. Plus froide, l’eau ne permet plus aux algues de se développer : c’est le bon moment.</p>

<h2>Hivernage actif ou passif ?</h2>
<p><strong>L’hivernage actif</strong> consiste à laisser la filtration tourner quelques heures par jour tout l’hiver. C’est la solution la plus courante en Tunisie, surtout sur la côte où les gelées sont rares. Avantages : l’eau reste brassée et propre, et la remise en route au printemps est rapide.</p>
<p><strong>L’hivernage passif</strong> consiste à arrêter complètement la filtration. Il convient aux régions plus froides de l’intérieur ou aux maisons inoccupées l’hiver. Il demande plus de préparation, et la remise en route est plus longue.</p>

<h2>Les étapes de l’hivernage actif</h2>
<ol>
  <li><strong>Nettoyez le bassin</strong> : fond, parois, ligne d’eau, paniers des skimmers.</li>
  <li><strong>Équilibrez l’eau</strong> : pH entre 7,2 et 7,4, puis faites un traitement choc.</li>
  <li><strong>Nettoyez le filtre</strong> (contre-lavage ou rinçage de la cartouche).</li>
  <li><strong>Ajoutez un produit d’hivernage</strong> adapté à l’hivernage actif, à la dose indiquée.</li>
  <li><strong>Réduisez la filtration</strong> : environ le tiers de la température de l’eau, en heures par jour (eau à 12 °C : 4 heures). Faites-la tourner de préférence aux heures les plus froides si une gelée est annoncée.</li>
  <li><strong>Couvrez le bassin</strong> avec une bâche d’hivernage : elle arrête feuilles et lumière, et l’eau reste plus propre.</li>
  <li><strong>Contrôlez l’eau une fois par mois</strong> et rajoutez un peu de produit d’hivernage si besoin.</li>
</ol>

<h2>Les étapes de l’hivernage passif</h2>
<ol>
  <li>Nettoyez, équilibrez le pH, faites un traitement choc et laissez filtrer 24 heures.</li>
  <li>Versez le produit d’hivernage et laissez encore filtrer quelques heures pour bien le répartir.</li>
  <li>Baissez le niveau d’eau sous les buses de refoulement ou sous les skimmers, selon votre installation.</li>
  <li>Videz les canalisations, la pompe et le filtre, et rangez les équipements fragiles (électrolyseur, régulateur) à l’abri.</li>
  <li>Placez des flotteurs d’hivernage et un gizzmo dans chaque skimmer s’il y a un risque de gel.</li>
  <li>Installez la bâche d’hivernage.</li>
</ol>

<h2>À ne pas oublier</h2>
<ul>
  <li>Ne videz jamais complètement une piscine pour l’hiver : l’eau maintient la structure et protège le revêtement.</li>
  <li>Coupez l’éclairage et protégez les coffrets électriques de l’humidité.</li>
  <li>Notez la date dans votre agenda pour la remise en route : il vaut mieux la faire tôt, avant que l’eau ne se réchauffe.</li>
</ul>
<p>Vous pouvez recevoir ces rappels au bon moment : inscrivez-vous à notre <a href="/entretien">calendrier d’entretien</a>, par email ou WhatsApp.</p>
`
  },
  {
    slug: 'prix-piscine-tunisie',
    theme: 'construction',
    title: 'Combien coûte une piscine en Tunisie ? Les postes qui font le prix',
    summary: 'Taille, structure, terrain, équipements, finitions : ce qui fait vraiment le prix d’une piscine en Tunisie, et comment obtenir une estimation pour votre projet.',
    body: `
<p>« Combien coûte une piscine ? » est la première question de tout projet. La réponse dépend de choix précis : deux piscines de même taille peuvent avoir des prix très différents. Voici les postes qui comptent, pour comprendre un devis et le comparer.</p>

<h2>1. La taille et la profondeur</h2>
<p>C’est le premier facteur : le prix suit d’abord la surface d’eau et le volume à creuser. Une profondeur constante de 1,40 à 1,50 m convient à la plupart des familles et coûte moins cher qu’une fosse à plonger. Une piscine plus petite se chauffe et s’entretient aussi plus facilement.</p>

<h2>2. La structure</h2>
<p>Le béton (banché ou projeté) permet toutes les formes et dure des décennies. Les blocs à bancher sont une solution solide et souvent plus économique. Les coques ou kits préfabriqués réduisent le délai, mais limitent les formes et les tailles. Le choix dépend aussi de l’accès au terrain pour les engins et les camions.</p>

<h2>3. Le terrain</h2>
<p>Un terrain en pente, rocheux ou avec une nappe d’eau proche demande plus de terrassement et parfois un renforcement : c’est souvent là que naissent les écarts entre deux devis. Pensez aussi à l’évacuation de la terre et à l’accès du chantier.</p>

<h2>4. Les équipements</h2>
<p>Pompe, filtre, skimmers, buses, éclairage, local technique : l’ensemble de filtration doit être dimensionné pour filtrer tout le volume d’eau en environ 4 heures. Viennent ensuite les options qui changent le confort au quotidien :</p>
<ul>
  <li>une <strong>pompe à vitesse variable</strong>, plus chère à l’achat mais beaucoup plus économe en électricité ;</li>
  <li>un <strong>électrolyseur au sel</strong>, qui produit le chlore automatiquement ;</li>
  <li>une <strong>pompe à chaleur</strong>, pour se baigner d’avril à novembre ;</li>
  <li>un <strong>robot nettoyeur</strong> et une <strong>couverture</strong> de sécurité.</li>
</ul>

<h2>5. Les finitions</h2>
<p>Revêtement (enduit, liner, mosaïque), margelles, plage autour du bassin, escalier intégré, éclairage LED : ce sont les choix les plus visibles, et ceux qui font le plus varier le budget final.</p>

<h2>6. L’entretien, à prévoir dès le départ</h2>
<p>Au prix de construction s’ajoutent chaque année l’électricité de la filtration, les produits de traitement et l’eau d’appoint. Une piscine bien conçue, avec un matériel bien dimensionné, coûte moins cher à faire vivre.</p>

<h2>Obtenir une estimation pour votre projet</h2>
<p>Le plus simple est de partir de votre terrain : dans notre <a href="/construire">configurateur</a>, dessinez la piscine aux dimensions voulues, choisissez les équipements et recevez une estimation, puis un devis gratuit d’un technicien STES qui peut se déplacer pour voir le terrain.</p>
`
  },
  {
    slug: 'choisir-pompe-piscine',
    theme: 'equipement',
    title: 'Bien choisir la pompe de sa piscine',
    summary: 'Débit, puissance, vitesse variable, monophasé ou triphasé : les repères pour choisir une pompe adaptée à votre bassin, sans payer trop d’électricité.',
    body: `
<p>La pompe est le cœur de la piscine : elle fait circuler l’eau dans le filtre, et c’est souvent l’appareil qui consomme le plus d’électricité de la maison en été. Bien la choisir, c’est avoir une eau claire sans payer trop.</p>

<h2>Le bon débit</h2>
<p>La règle de base : la pompe doit pouvoir faire passer tout le volume de la piscine dans le filtre en <strong>environ 4 heures</strong>. Pour une piscine de 8 × 4 m avec 1,40 m de profondeur moyenne, soit environ 45 m³, il faut donc un débit d’environ 11 à 12 m³/h.</p>
<p>Calcul du volume : longueur × largeur × profondeur moyenne. Notre <a href="/construire">configurateur</a> fait ce calcul pour vous et indique le débit conseillé.</p>

<h2>Accorder la pompe et le filtre</h2>
<p>Le filtre est prévu pour un débit maximal. Une pompe trop puissante pour le filtre filtre moins bien et l’use plus vite. Choisissez donc pompe et filtre ensemble, avec des débits compatibles.</p>

<h2>Puissance : ni trop, ni trop peu</h2>
<p>Une pompe surdimensionnée consomme plus et fait du bruit sans filtrer mieux. La distance entre le local technique et le bassin, et le nombre d’équipements sur le circuit (chauffage, électrolyseur, nage à contre-courant), entrent aussi en compte : c’est le rôle du technicien de faire ce calcul précis.</p>

<h2>Vitesse fixe ou vitesse variable ?</h2>
<p>Une pompe à <strong>vitesse fixe</strong> tourne toujours à fond. Une pompe à <strong>vitesse variable</strong> peut tourner lentement la plupart du temps et accélérer seulement pour le nettoyage ou le contre-lavage. Comme la consommation baisse très fortement quand la vitesse diminue, elle est plus chère à l’achat mais se rembourse souvent en quelques saisons grâce aux économies d’électricité, surtout avec les longues durées de filtration de l’été tunisien.</p>

<h2>Autres critères</h2>
<ul>
  <li><strong>Auto-amorçante</strong> : indispensable si la pompe est au-dessus du niveau de l’eau.</li>
  <li><strong>Monophasé ou triphasé</strong> : la plupart des maisons ont un compteur monophasé (230 V) ; le triphasé concerne surtout les grands bassins et les piscines collectives.</li>
  <li><strong>Niveau sonore</strong> : à regarder si le local technique est proche de la maison ou des voisins.</li>
  <li><strong>Pièces et service</strong> : une marque dont les pièces sont disponibles en Tunisie évite des semaines d’attente en cas de panne.</li>
</ul>

<h2>Remplacer une pompe existante</h2>
<p>Notez la référence et la puissance de l’ancienne pompe, et prenez une photo de la plaque et du local technique : un technicien STES vous indiquera le modèle équivalent ou plus économe, compatible avec vos raccords.</p>
`
  },
  {
    slug: 'remise-en-route-piscine',
    theme: 'saison',
    title: 'Remise en route de la piscine au printemps',
    summary: 'Bâche, nettoyage, niveau d’eau, filtration, analyses et traitement choc : les étapes dans l’ordre pour une piscine prête à la baignade dès les beaux jours.',
    body: `
<p>Au printemps, quand l’eau dépasse 15 °C, c’est le moment de remettre la piscine en route. Le faire tôt évite que les algues ne s’installent avec la chaleur, et la piscine est prête dès les premiers beaux jours.</p>

<h2>Le matériel à prévoir</h2>
<ul>
  <li>Une trousse d’analyse (pH, chlore, et si possible TAC et stabilisant).</li>
  <li>Du pH moins ou pH plus selon l’analyse, et un chlore choc.</li>
  <li>Une brosse, une épuisette et un aspirateur ou un robot.</li>
</ul>

<h2>Les étapes, dans l’ordre</h2>
<ol>
  <li><strong>Retirez la bâche</strong> après avoir enlevé l’eau et les feuilles qui sont dessus, nettoyez-la et faites-la sécher avant de la ranger.</li>
  <li><strong>Retirez les accessoires d’hivernage</strong> (flotteurs, gizzmos, bouchons) et remettez en place les paniers et les équipements démontés.</li>
  <li><strong>Remettez l’eau à niveau</strong>, à mi-hauteur des skimmers.</li>
  <li><strong>Vérifiez le local technique</strong> : pas de fuite, joints en bon état, vannes dans la bonne position. Si la pompe est au-dessus du niveau de l’eau, remplissez le préfiltre avant de la démarrer.</li>
  <li><strong>Nettoyez le bassin</strong> : brossez les parois et la ligne d’eau, aspirez le fond.</li>
  <li><strong>Lancez la filtration en continu</strong> pendant 24 à 48 heures, et faites un contre-lavage du filtre à sable (ou rincez la cartouche) après la première journée.</li>
  <li><strong>Analysez l’eau et corrigez dans cet ordre</strong> : le TAC d’abord (entre 80 et 120 mg/l), puis le pH (entre 7,2 et 7,4), et enfin le chlore.</li>
  <li><strong>Faites un traitement choc</strong> le soir, à la dose indiquée sur l’emballage, pour repartir sur une eau saine.</li>
  <li><strong>Remettez en place le traitement d’entretien</strong> (galets, électrolyseur, régulateur) et réglez la durée de filtration : environ la moitié de la température de l’eau, en heures par jour.</li>
</ol>

<h2>Les points à contrôler cette année</h2>
<ul>
  <li><strong>Le sable du filtre</strong> se change tous les 5 ans environ ; une cartouche, plus souvent.</li>
  <li><strong>L’électrolyseur</strong> : nettoyez la cellule si du calcaire s’y est déposé, ce qui est fréquent avec l’eau calcaire de nombreuses régions de Tunisie.</li>
  <li><strong>Les joints et le couvercle du préfiltre</strong> : une prise d’air fait perdre de la puissance à la pompe.</li>
</ul>

<h2>Se faire aider</h2>
<p>Nos techniciens peuvent faire la remise en route pour vous, vérifier l’installation et vous dire ce qui est à prévoir pour la saison. Et pour ne plus oublier les bonnes dates, inscrivez-vous à notre <a href="/entretien">calendrier d’entretien</a>.</p>
`
  }
];
