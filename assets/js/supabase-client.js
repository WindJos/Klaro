/* ============================================================
   FICHLY — supabase-client.js
   Point d'entrée unique pour la connexion à Supabase.

   Ce fichier doit être chargé EN PREMIER avant index.js
   et admin.js. Il expose un objet global `FichlyDB` que
   tous les autres scripts utilisent pour interagir avec
   la base de données.

   ⚠️  Ne jamais dupliquer les clés Supabase dans d'autres
       fichiers. Toute modification de projet se fait ici
       uniquement.

   Organisation :
   1. Configuration du projet Supabase
   2. Initialisation du client
   3. Export vers l'objet global FichlyDB
   4. Test de connexion (optionnel, mode développement)
   ============================================================ */


/* ────────────────────────────────────────────────
   1. CONFIGURATION DU PROJET SUPABASE
   ──────────────────────────────────────────────── */

/**
 * URL publique du projet Supabase.
 * Disponible dans : Supabase Dashboard → Settings → API → Project URL
 * @type {string}
 */
const SUPABASE_URL = 'https://lonofaznqdqptatyqgdn.supabase.co';

/**
 * Clé publique anonyme (anon key).
 * Disponible dans : Supabase Dashboard → Settings → API → Project API Keys
 *
 * ℹ️  Cette clé est publique par nature : elle est visible dans
 *     le navigateur. La sécurité repose sur les politiques RLS
 *     (Row Level Security) configurées dans Supabase, pas sur
 *     le secret de cette clé.
 *
 * @type {string}
 */
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxvbm9mYXpucWRxcHRhdHlxZ2RuIiwi' +
  'cm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODgwOTcsImV4cCI6MjA4OTE2NDA5N30.' +
  'KNyYUt0vEW7jGabvD55U6-AgkLOI1r-6iOeGKDGSOU0';

/**
 * Noms des tables Supabase.
 * Centralisés ici pour éviter les fautes de frappe dans les
 * requêtes et faciliter un éventuel renommage.
 * @type {Object.<string, string>}
 */
const DB_TABLES = {
  FICHES:   'fiches',
  DEMANDES: 'demandes',
};


/* ────────────────────────────────────────────────
   2. INITIALISATION DU CLIENT
   ──────────────────────────────────────────────── */

/*
  On récupère la fonction createClient depuis la librairie
  Supabase chargée via le CDN dans les fichiers HTML.
  La librairie expose un objet global `window.supabase`.
*/
const { createClient } = window.supabase;

/**
 * Instance du client Supabase.
 * Utilisée pour toutes les opérations de base de données :
 * select, insert, update, delete.
 *
 * @type {import('@supabase/supabase-js').SupabaseClient}
 */
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


/* ────────────────────────────────────────────────
   3. EXPORT VERS L'OBJET GLOBAL FichlyDB
   ──────────────────────────────────────────────── */

/**
 * Objet global exposant le client Supabase et les constantes
 * nécessaires aux autres scripts (index.js, admin.js).
 *
 * Usage dans les autres fichiers :
 *   const { db, TABLES } = window.FichlyDB;
 *   const { data } = await db.from(TABLES.FICHES).select('*');
 *
 * @namespace FichlyDB
 * @property {SupabaseClient} db     - Instance du client Supabase
 * @property {Object}         TABLES - Noms des tables de la BDD
 */
window.FichlyDB = {
  db:     supabaseClient,
  TABLES: DB_TABLES,
};


/* ────────────────────────────────────────────────
   4. TEST DE CONNEXION (MODE DÉVELOPPEMENT)
   ──────────────────────────────────────────────── */

/*
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
