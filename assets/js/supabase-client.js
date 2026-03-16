/* ============================================================
   KLARO — supabase-client.js
   Point d'entrée unique pour la connexion à Supabase.

   Ce fichier expose un objet global `window.KlaroDB` que
   tous les autres scripts utilisent pour interagir avec
   la base de données.

   ⚠️  Ne jamais dupliquer les clés Supabase dans d'autres
       fichiers. Toute modification de projet se fait ici.

   Organisation :
   1. Configuration du projet Supabase
   2. Vérification du chargement de la librairie CDN
   3. Initialisation du client
   4. Export vers l'objet global KlaroDB
   ============================================================ */


/* ────────────────────────────────────────────────
   1. CONFIGURATION DU PROJET SUPABASE
   ──────────────────────────────────────────────── */

/**
 * URL publique du projet Supabase.
 * @type {string}
 */
const SUPABASE_URL = 'https://lonofaznqdqptatyqgdn.supabase.co';

/**
 * Clé publique anonyme (anon key).
 * Cette clé est publique par nature — la sécurité repose
 * sur les politiques RLS configurées dans Supabase.
 * @type {string}
 */
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxvbm9mYXpucWRxcHRhdHlxZ2RuIiwi' +
  'cm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODgwOTcsImV4cCI6MjA4OTE2NDA5N30.' +
  'KNyYUt0vEW7jGabvD55U6-AgkLOI1r-6iOeGKDGSOU0';

/**
 * Noms des tables Supabase.
 * Centralisés ici pour éviter les fautes de frappe.
 * @type {Object.<string, string>}
 */
const DB_TABLES = {
  FICHES:   'fiches',
  DEMANDES: 'demandes',
};


/* ────────────────────────────────────────────────
   2. VÉRIFICATION DU CHARGEMENT DE LA LIBRAIRIE CDN
   ──────────────────────────────────────────────── */

/*
  window.supabase est exposé par la librairie CDN chargée
  dans le HTML avant ce fichier. Si elle est undefined,
  c'est que le CDN n'a pas réussi à se charger
  (réseau lent, coupure internet, firewall…).

  On vérifie explicitement avant d'utiliser la librairie
  pour éviter l'erreur :
  "Cannot destructure property 'createClient' of undefined"
*/
if (!window.supabase) {

  console.error(
    '[KlaroDB] ❌ La librairie Supabase (CDN) n\'a pas pu se charger.\n' +
    'Vérifie ta connexion internet et recharge la page.'
  );

  /*
    On expose un objet KlaroDB minimal pour éviter que
    les autres scripts plantent en cascade avec des
    erreurs "Cannot read properties of undefined".
    La propriété pret:false permet aux scripts de détecter
    que la connexion n'est pas disponible.
  */
  window.KlaroDB = {
    db:     null,
    TABLES: DB_TABLES,
    pret:   false,
  };

} else {

  /* ────────────────────────────────────────────────
     3. INITIALISATION DU CLIENT
     ──────────────────────────────────────────────── */

  /*
    Certaines versions du bundle UMD exposent createClient
    de deux façons différentes selon le bundler utilisé.
    On tente les deux formes pour garantir la compatibilité.
  */
  const createClient =
    window.supabase.createClient ||
    (window.supabase.default && window.supabase.default.createClient);

  if (!createClient) {

    console.error(
      '[KlaroDB] ❌ createClient introuvable dans window.supabase.\n' +
      'La version du CDN chargée est peut-être incompatible.'
    );

    window.KlaroDB = { db: null, TABLES: DB_TABLES, pret: false };

  } else {

    /**
     * Instance du client Supabase.
     * Utilisée pour toutes les opérations : select, insert, update, delete.
     * @type {import('@supabase/supabase-js').SupabaseClient}
     */
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


    /* ────────────────────────────────────────────────
       4. EXPORT VERS L'OBJET GLOBAL KlaroDB
       ──────────────────────────────────────────────── */

    /**
     * Objet global exposant le client et les constantes.
     *
     * Usage dans les autres fichiers :
     *
     *   // Vérifier que la connexion est disponible
     *   if (!window.KlaroDB.pret) return;
     *
     *   // Utiliser le client
     *   const { db, TABLES } = window.KlaroDB;
     *   const { data } = await db.from(TABLES.FICHES).select('*');
     *
     * @property {SupabaseClient|null} db     - Client Supabase (null si CDN échoue)
     * @property {Object}              TABLES - Noms des tables
     * @property {boolean}             pret   - true si connexion disponible
     */
    window.KlaroDB = {
      db:     supabaseClient,
      TABLES: DB_TABLES,
      pret:   true,
    };

    console.info('[KlaroDB] ✅ Client Supabase initialisé avec succès.');
  }
}
  Ce bloc s'exécute uniquement sur localhost pour vérifier
  que la connexion à Supabase est opérationnelle au démarrage.
  Il n'a aucun effet en production.
*/
(async function testConnection() {

  /* Ne s'exécute que si on travaille en local */
  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (!isLocalhost) return;

  try {
    /*
      Requête légère : on demande juste 1 ligne de la table
      fiches pour valider que la connexion fonctionne.
    */
    const { error } = await supabaseClient
      .from(DB_TABLES.FICHES)
      .select('id')
      .limit(1);

    if (error) {
      console.warn('[FichlyDB] ⚠️  Connexion Supabase — erreur :', error.message);
    } else {
      console.info('[FichlyDB] ✅ Connexion Supabase établie avec succès.');
    }

  } catch (err) {
    console.error('[FichlyDB] ❌ Erreur inattendue lors du test :', err);
  }

})();
