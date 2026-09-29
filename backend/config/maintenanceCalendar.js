// The pool care reminders sent through the year (Admin → Settings →
// Reminders), for the Tunisian climate. The shop can change the date, the
// text and the products of each one, or turn it off; the keys stay fixed so
// nobody gets the same reminder twice in a year.
const DEFAULT_CALENDAR = [
  {
    key: 'check',
    month: 2,
    day: 15,
    title: 'Révision du matériel avant la saison',
    message: 'Avant les beaux jours, faites vérifier la pompe, le filtre et les joints. Une petite fuite ou un roulement fatigué se répare plus vite en février qu’en juillet. Nos techniciens peuvent passer chez vous.'
  },
  {
    key: 'opening',
    month: 4,
    day: 1,
    title: 'Remise en route de votre piscine',
    message: 'Retirez et nettoyez la bâche, remettez l’eau à niveau, videz le panier du skimmer et relancez la filtration. Faites ensuite un traitement choc et ramenez le pH entre 7,2 et 7,4.'
  },
  {
    key: 'season',
    month: 5,
    day: 15,
    title: 'La saison commence : contrôlez votre eau',
    message: 'Mesurez le pH et le chlore chaque semaine : pH entre 7,2 et 7,4, chlore libre entre 1 et 3 mg/L. Filtrez chaque jour autant d’heures que la moitié de la température de l’eau (à 26 °C, 13 h).'
  },
  {
    key: 'summer',
    month: 7,
    day: 1,
    title: 'Plein été : filtre et ligne d’eau',
    message: 'Avec la chaleur et les baignades, faites un contre-lavage du filtre à sable toutes les deux semaines, videz les paniers et nettoyez la ligne d’eau. Gardez toujours du chlore lent dans le skimmer ou le diffuseur.'
  },
  {
    key: 'heat',
    month: 8,
    day: 1,
    title: 'Canicule : gardez une eau claire',
    message: 'Au-dessus de 28 °C, les algues se développent vite. Filtrez plus longtemps, ajoutez un anti-algues et faites un traitement choc après une forte fréquentation ou un orage.'
  },
  {
    key: 'autumn',
    month: 9,
    day: 20,
    title: 'Fin d’été : grand nettoyage',
    message: 'Les feuilles commencent à tomber : passez le robot, videz les paniers plus souvent et vérifiez l’équilibre de l’eau avant l’automne.'
  },
  {
    key: 'winter',
    month: 11,
    day: 1,
    title: 'Préparez l’hivernage',
    message: 'Quand l’eau passe sous 15 °C, nettoyez le bassin, faites un dernier traitement choc, ajoutez un produit d’hivernage, réduisez la filtration et couvrez la piscine.'
  }
].map(reminder => ({ ...reminder, products: [], active: true }));

const REMINDER_KEYS = DEFAULT_CALENDAR.map(reminder => reminder.key);

module.exports = { DEFAULT_CALENDAR, REMINDER_KEYS };
