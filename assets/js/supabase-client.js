// KLARO — supabase-client.js
// Initialise la connexion Supabase et expose window.KlaroDB

var SUPABASE_URL = 'https://lonofaznqdqptatyqgdn.supabase.co';

var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxvbm9mYXpucWRxcHRhdHlxZ2RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODgwOTcsImV4cCI6MjA4OTE2NDA5N30.KNyYUt0vEW7jGabvD55U6-AgkLOI1r-6iOeGKDGSOU0';

var DB_TABLES = {
  FICHES:   'fiches',
  DEMANDES: 'demandes'
};

// Tente d'initialiser le client Supabase
try {

  // La librairie Supabase expose window.supabase depuis le fichier local
  // Elle peut exposer createClient directement ou via .default selon la version
  var _supabase = window.supabase || {};
  var createClient = _supabase.createClient || (_supabase.default && _supabase.default.createClient);

  if (!createClient) {
    throw new Error('createClient introuvable dans window.supabase');
  }

  var client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  window.KlaroDB = {
    db:     client,
    TABLES: DB_TABLES,
    pret:   true
  };

  console.log('[KlaroDB] Connexion Supabase initialisee avec succes.');

} catch (err) {

  console.error('[KlaroDB] Erreur initialisation Supabase :', err.message);

  // Objet vide pour eviter les erreurs en cascade dans index.js et admin.js
  window.KlaroDB = {
    db:     null,
    TABLES: DB_TABLES,
    pret:   false
  };
}
