/* ============================================================
   KLARO — admin.js
   Logique du tableau de bord administrateur (admin.html).

   Ce fichier dépend de supabase-client.js qui doit être
   chargé avant lui dans le HTML.

   Responsabilités :
   - Gérer l'authentification via Supabase Auth (email + mdp)
   - Charger et afficher les statistiques du tableau de bord
   - Afficher et gérer les demandes des étudiants
   - Publier de nouvelles fiches dans Supabase
   - Gérer (afficher / supprimer) les fiches existantes

   Organisation :
   1.  Récupération des références DOM
   2.  Authentification Supabase Auth
   3.  Initialisation du dashboard
   4.  Statistiques
   5.  Onglets (tabs)
   6.  Chargement et affichage des demandes
   7.  Actions sur les demandes
   8.  Publication d'une nouvelle fiche
   9.  Gestion des fiches existantes
   10. Utilitaires
   11. Initialisation
   ============================================================ */


/* ────────────────────────────────────────────────
   1. RÉCUPÉRATION DES RÉFÉRENCES DOM
   ──────────────────────────────────────────────── */

const DOM = {

  /* ── Gate de connexion ── */
  gate:       document.getElementById('gate'),
  emailInput: document.getElementById('emailInput'),
  pwdInput:   document.getElementById('pwdInput'),
  gateBtn:    document.getElementById('gateBtn'),
  gateError:  document.getElementById('gateErr'),

  /* ── Application principale ── */
  app:        document.getElementById('app'),

  /* ── Topbar ── */
  pendingBadge: document.getElementById('pendingBadge'),

  /* ── Statistiques ── */
  statFiches:   document.getElementById('st-fiches'),
  statDemandes: document.getElementById('st-demandes'),
  statPending:  document.getElementById('st-pending'),
  statDone:     document.getElementById('st-done'),

  /* ── Onglet demandes ── */
  demandesTbody: document.getElementById('demandesTbody'),
  tabDot:        document.getElementById('tabDot'),

  /* ── Formulaire de publication ── */
  pubForm:    document.getElementById('pubForm'),
  pubTitre:   document.getElementById('p_titre'),
  pubMatiere: document.getElementById('p_matiere'),
  pubNiveau:  document.getElementById('p_niveau'),
  pubDesc:    document.getElementById('p_desc'),
  pubUrl:     document.getElementById('p_url'),
  pubBtn:     document.getElementById('pubBtn'),
  pubLabel:   document.getElementById('pubLabel'),
  pubMsg:     document.getElementById('pubMsg'),

  /* ── Onglet gestion des fiches ── */
  fichesTbody: document.getElementById('fichesTbody'),
};


/* ────────────────────────────────────────────────
   2. AUTHENTIFICATION SUPABASE AUTH
   ──────────────────────────────────────────────── */

/**
 * Tente de connecter l'administrateur via Supabase Auth.
 *
 * Contrairement à l'ancienne approche (mot de passe en clair
 * dans le code), ici les identifiants sont envoyés aux serveurs
 * Supabase qui les vérifient et retournent un token JWT signé.
 * Aucun mot de passe n'est stocké dans le code source.
 *
 * @async
 * @returns {Promise<void>}
 */
async function seConnecter() {

  const email      = DOM.emailInput.value.trim();
  const motDePasse = DOM.pwdInput.value;

  /* ── Validation basique côté client ── */
  if (!email || !motDePasse) {
    afficherErreurGate('Veuillez remplir tous les champs.');
    return;
  }

  /* ── Passe le bouton en état de chargement ── */
  DOM.gateBtn.disabled        = true;
  DOM.gateBtn.textContent     = 'Connexion…';
  cacherErreurGate();

  /* ── Appel Supabase Auth ── */
  const { data, error } = await window.FichlyDB.db.auth.signInWithPassword({
    email:    email,
    password: motDePasse,
  });

  /* ── Restaure le bouton dans tous les cas ── */
  DOM.gateBtn.disabled    = false;
  DOM.gateBtn.textContent = 'Accéder →';

  if (error) {
    /*
      Supabase retourne une erreur si l'email ou le mot de passe
      est incorrect. On affiche un message générique pour ne pas
      indiquer lequel des deux est faux (sécurité).
    */
    afficherErreurGate('Email ou mot de passe incorrect.');
    DOM.pwdInput.value = '';
    DOM.pwdInput.focus();
    console.warn('[admin.js] Échec de connexion :', error.message);
    return;
  }

  /* ── Succès : affiche le dashboard ── */
  ouvrirDashboard();
}

/**
 * Déconnecte l'administrateur via Supabase Auth.
 * Invalide le token JWT côté serveur.
 *
 * @async
 * @returns {Promise<void>}
 */
async function seDeconnecter() {

  await window.FichlyDB.db.auth.signOut();

  /* Réaffiche la gate et vide les champs */
  DOM.app.style.display   = 'none';
  DOM.gate.style.display  = 'flex';
  DOM.emailInput.value    = '';
  DOM.pwdInput.value      = '';
  cacherErreurGate();

  /* Replace le focus sur le champ email */
  DOM.emailInput.focus();
}

/**
 * Vérifie si une session Supabase Auth existe déjà au chargement.
 * Évite de devoir se reconnecter après un simple rafraîchissement
 * de la page — Supabase persiste le token dans localStorage.
 *
 * @async
 * @returns {Promise<void>}
 */
async function verifierSessionExistante() {

  const { data: { session } } = await window.FichlyDB.db.auth.getSession();

  if (session) {
    /*
      Session valide trouvée : on ouvre directement le dashboard
      sans passer par la gate.
    */
    ouvrirDashboard();
  } else {
    /* Pas de session : on affiche la gate et on focus l'email */
    DOM.emailInput.focus();
  }
}

/**
 * Masque la gate et affiche l'application.
 * Centralise l'ouverture du dashboard pour éviter la duplication.
 */
function ouvrirDashboard() {
  DOM.gate.style.display = 'none';
  DOM.app.style.display  = 'flex';
  initialiserDashboard();
}

/**
 * Affiche un message d'erreur dans la gate.
 * @param {string} message - Texte à afficher
 */
function afficherErreurGate(message) {
  DOM.gateError.textContent    = message;
  DOM.gateError.style.display  = 'block';
}

/**
 * Masque le message d'erreur de la gate.
 */
function cacherErreurGate() {
  DOM.gateError.textContent   = '';
  DOM.gateError.style.display = 'none';
}

/*
  Permet de valider la gate en appuyant sur Entrée
  depuis n'importe quel champ du formulaire.
*/
[DOM.emailInput, DOM.pwdInput].forEach(champ => {
  if (champ) {
    champ.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') seConnecter();
    });
  }
});

/*
  Expose les fonctions au HTML pour les attributs onclick.
*/
window.seConnecter   = seConnecter;
window.seDeconnecter = seDeconnecter;


/* ────────────────────────────────────────────────
   4. INITIALISATION DU DASHBOARD
   ──────────────────────────────────────────────── */

/**
 * Lance tous les chargements nécessaires après authentification.
 * Exécute les requêtes en parallèle pour minimiser le temps d'attente.
 *
 * @async
 * @returns {Promise<void>}
 */
async function initialiserDashboard() {

  /*
    Promise.all() permet de lancer les deux requêtes simultanément
    plutôt que l'une après l'autre (gain de temps).
  */
  await Promise.all([
    chargerStatistiques(),
    chargerDemandes(),
  ]);

  /* Active l'onglet par défaut */
  const ongletDefaut = document.querySelector(`[data-tab="${DEFAULT_TAB}"]`);
  if (ongletDefaut) afficherOnglet(DEFAULT_TAB, ongletDefaut);
}


/* ────────────────────────────────────────────────
   5. STATISTIQUES
   ──────────────────────────────────────────────── */

/**
 * Charge les 4 compteurs du bandeau de statistiques.
 * Utilise des requêtes avec head:true pour ne récupérer
 * que le count sans les données — plus léger.
 *
 * @async
 * @returns {Promise<void>}
 */
async function chargerStatistiques() {

  const { db, TABLES } = window.FichlyDB;

  /* Lance les 4 requêtes en parallèle */
  const [
    { count: nbFiches   },
    { count: nbDemandes },
    { count: nbAttente  },
    { count: nbTraitees },
  ] = await Promise.all([

    db.from(TABLES.FICHES)
      .select('*', { count: 'exact', head: true }),

    db.from(TABLES.DEMANDES)
      .select('*', { count: 'exact', head: true }),

    db.from(TABLES.DEMANDES)
      .select('*', { count: 'exact', head: true })
      .eq('statut', 'en_attente'),

    db.from(TABLES.DEMANDES)
      .select('*', { count: 'exact', head: true })
      .eq('statut', 'traitee'),
  ]);

  /* Met à jour l'affichage des compteurs */
  DOM.statFiches.textContent   = nbFiches   ?? 0;
  DOM.statDemandes.textContent = nbDemandes ?? 0;
  DOM.statPending.textContent  = nbAttente  ?? 0;
  DOM.statDone.textContent     = nbTraitees ?? 0;

  /* Affiche le badge rouge dans la topbar si demandes en attente */
  if (nbAttente > 0) {
    DOM.pendingBadge.textContent    = nbAttente;
    DOM.pendingBadge.style.display  = 'inline-block';
    /* Affiche également le point rouge sur l'onglet "Demandes" */
    DOM.tabDot.style.display        = 'inline-block';
  }
}


/* ────────────────────────────────────────────────
   6. ONGLETS (TABS)
   ──────────────────────────────────────────────── */

/**
 * Affiche l'onglet demandé et masque les autres.
 * Appelé via onclick="afficherOnglet('id', this)" dans le HTML.
 *
 * @param {string}      idOnglet - Identifiant de l'onglet ('demandes', 'publier', 'gerer')
 * @param {HTMLElement} bouton   - Le bouton onglet cliqué
 */
function afficherOnglet(idOnglet, bouton) {

  /* ── Masque tous les contenus d'onglets ── */
  document.querySelectorAll('.tab-content').forEach(contenu => {
    contenu.classList.remove('tab-content--active');
  });

  /* ── Retire l'état actif de tous les boutons ── */
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('tab-btn--active');
  });

  /* ── Active l'onglet sélectionné ── */
  const contenuCible = document.getElementById(`tab-${idOnglet}`);
  if (contenuCible) contenuCible.classList.add('tab-content--active');
  if (bouton)       bouton.classList.add('tab-btn--active');

  /*
    Charge les fiches quand on ouvre l'onglet de gestion,
    pour avoir les données à jour sans rafraîchir la page.
  */
  if (idOnglet === 'gerer') chargerGestionFiches();
}

/*
  Expose la fonction au HTML pour les attributs onclick.
*/
window.afficherOnglet = afficherOnglet;


/* ────────────────────────────────────────────────
   7. CHARGEMENT ET AFFICHAGE DES DEMANDES
   ──────────────────────────────────────────────── */

/**
 * Charge toutes les demandes depuis Supabase et les affiche
 * dans le tableau de l'onglet "Demandes".
 *
 * Triées par date décroissante : les plus récentes en premier.
 *
 * @async
 * @returns {Promise<void>}
 */
async function chargerDemandes() {

  const { db, TABLES } = window.FichlyDB;

  const { data, error } = await db
    .from(TABLES.DEMANDES)
    .select('*')
    .order('date_demande', { ascending: false });

  if (error) {
    DOM.demandesTbody.innerHTML = `
      <tr>
        <td colspan="7" class="table-empty">
          <p>Erreur lors du chargement des demandes.</p>
        </td>
      </tr>`;
    console.error('[admin.js] Erreur chargement demandes :', error);
    return;
  }

  /* Cas : aucune demande */
  if (!data || data.length === 0) {
    DOM.demandesTbody.innerHTML = `
      <tr>
        <td colspan="7" class="table-empty">
          <p>Aucune demande pour le moment.</p>
        </td>
      </tr>`;
    return;
  }

  /* Génère les lignes du tableau */
  DOM.demandesTbody.innerHTML = data
    .map(demande => construireLigneDemande(demande))
    .join('');
}

/**
 * Construit le HTML d'une ligne du tableau des demandes.
 *
 * @param   {Object} demande - Objet demande provenant de Supabase
 * @returns {string}           Chaîne HTML de la ligne <tr>
 */
function construireLigneDemande(demande) {

  const dateFormatee = new Date(demande.date_demande).toLocaleDateString('fr-FR', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  });

  /* Pill de statut selon la valeur en base */
  const pillStatut = demande.statut === 'traitee'
    ? `<span class="pill pill--done">Traitée</span>`
    : `<span class="pill pill--pending">En attente</span>`;

  /* Boutons d'action : "Traiter" uniquement si en attente */
  const boutonsAction = demande.statut === 'en_attente'
    ? `<button class="btn btn--sm btn--success" onclick="marquerTraitee('${demande.id}')">✓ Traiter</button>
       <button class="btn btn--sm btn--danger"  onclick="supprimerDemande('${demande.id}')">✕</button>`
    : `<button class="btn btn--sm btn--danger"  onclick="supprimerDemande('${demande.id}')">✕ Suppr.</button>`;

  /* Email affiché comme sous-info si présent */
  const emailHTML = demande.email
    ? `<div class="cell-secondary">${demande.email}</div>`
    : '';

  return `
    <tr>
      <td>
        <div class="cell-primary">${demande.nom}</div>
        ${emailHTML}
      </td>
      <td>${demande.matiere}</td>
      <td>${demande.niveau || '—'}</td>
      <td style="max-width:200px; font-size:12px; color:rgba(255,255,255,.5);">
        ${demande.description || '—'}
      </td>
      <td class="cell-date">${dateFormatee}</td>
      <td>${pillStatut}</td>
      <td>
        <div class="btn-actions">${boutonsAction}</div>
      </td>
    </tr>`;
}


/* ────────────────────────────────────────────────
   8. ACTIONS SUR LES DEMANDES
   ──────────────────────────────────────────────── */

/**
 * Marque une demande comme "traitée" dans Supabase.
 * Met à jour le tableau et les statistiques.
 *
 * @async
 * @param {string} id - UUID de la demande à marquer traitée
 * @returns {Promise<void>}
 */
async function marquerTraitee(id) {

  const { db, TABLES } = window.FichlyDB;

  const { error } = await db
    .from(TABLES.DEMANDES)
    .update({ statut: 'traitee' })
    .eq('id', id);

  if (error) {
    console.error('[admin.js] Erreur lors de la mise à jour :', error);
    return;
  }

  /* Recharge les données pour refléter les changements */
  await Promise.all([chargerStatistiques(), chargerDemandes()]);
}

/**
 * Supprime définitivement une demande de Supabase.
 * Demande une confirmation avant l'action.
 *
 * @async
 * @param {string} id - UUID de la demande à supprimer
 * @returns {Promise<void>}
 */
async function supprimerDemande(id) {

  /* Demande une confirmation explicite à l'administrateur */
  const confirmed = window.confirm(
    'Supprimer définitivement cette demande ?\nCette action est irréversible.'
  );

  if (!confirmed) return;

  const { db, TABLES } = window.FichlyDB;

  const { error } = await db
    .from(TABLES.DEMANDES)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[admin.js] Erreur lors de la suppression :', error);
    return;
  }

  await Promise.all([chargerStatistiques(), chargerDemandes()]);
}

/*
  Expose les fonctions au HTML pour les attributs onclick.
*/
window.marquerTraitee  = marquerTraitee;
window.supprimerDemande = supprimerDemande;


/* ────────────────────────────────────────────────
   9. PUBLICATION D'UNE NOUVELLE FICHE
   ──────────────────────────────────────────────── */

/**
 * Gère la soumission du formulaire de publication de fiche.
 * Insère la nouvelle fiche dans la table "fiches" de Supabase.
 *
 * @async
 * @param {SubmitEvent} evenement - Événement de soumission du formulaire
 * @returns {Promise<void>}
 */
async function publierFiche(evenement) {

  evenement.preventDefault();

  /* ── Passe en état de chargement ── */
  DOM.pubBtn.disabled       = true;
  DOM.pubLabel.textContent  = 'Publication…';
  cacherMessagePublication();

  /* ── Collecte les données du formulaire ── */
  const donneesFiche = {
    titre:       DOM.pubTitre.value.trim(),
    matiere:     DOM.pubMatiere.value.trim(),
    niveau:      DOM.pubNiveau.value,
    description: DOM.pubDesc.value.trim() || null,
    url:         DOM.pubUrl.value.trim(),
  };

  /* ── Envoi vers Supabase ── */
  const { db, TABLES } = window.FichlyDB;

  const { error } = await db
    .from(TABLES.FICHES)
    .insert([donneesFiche]);

  /* ── Traitement du résultat ── */
  if (error) {
    afficherMessagePublication(
      'error',
      `Erreur : ${error.message}`
    );
    console.error('[admin.js] Erreur lors de la publication :', error);
  } else {
    afficherMessagePublication(
      'success',
      '✓ Fiche publiée ! Elle est maintenant visible sur le site.'
    );

    /* Réinitialise le formulaire et met à jour les stats */
    DOM.pubForm.reset();
    await chargerStatistiques();
  }

  /* ── Restaure le bouton ── */
  DOM.pubBtn.disabled      = false;
  DOM.pubLabel.textContent = 'Publier la fiche';
}

/**
 * Affiche un message de retour sous le formulaire de publication.
 *
 * @param {'success'|'error'} type    - Type de message
 * @param {string}            message - Texte à afficher
 */
function afficherMessagePublication(type, message) {
  DOM.pubMsg.textContent = message;
  DOM.pubMsg.className   = `feedback feedback--show feedback--${type}`;
}

/**
 * Masque le message de retour du formulaire de publication.
 */
function cacherMessagePublication() {
  DOM.pubMsg.textContent = '';
  DOM.pubMsg.className   = 'feedback';
}

/*
  Attache l'événement de soumission au formulaire de publication.
*/
if (DOM.pubForm) {
  DOM.pubForm.addEventListener('submit', publierFiche);
}


/* ────────────────────────────────────────────────
   10. GESTION DES FICHES EXISTANTES
   ──────────────────────────────────────────────── */

/**
 * Charge et affiche la liste des fiches publiées dans
 * l'onglet "Gérer les fiches".
 *
 * @async
 * @returns {Promise<void>}
 */
async function chargerGestionFiches() {

  const { db, TABLES } = window.FichlyDB;

  const { data, error } = await db
    .from(TABLES.FICHES)
    .select('*')
    .order('date_ajout', { ascending: false });

  if (error) {
    DOM.fichesTbody.innerHTML = `
      <tr>
        <td colspan="6" class="table-empty">
          <p>Erreur lors du chargement.</p>
        </td>
      </tr>`;
    return;
  }

  if (!data || data.length === 0) {
    DOM.fichesTbody.innerHTML = `
      <tr>
        <td colspan="6" class="table-empty">
          <p>Aucune fiche publiée pour le moment.</p>
        </td>
      </tr>`;
    return;
  }

  DOM.fichesTbody.innerHTML = data
    .map(fiche => construireLigneFiche(fiche))
    .join('');
}

/**
 * Construit le HTML d'une ligne du tableau de gestion des fiches.
 *
 * @param   {Object} fiche - Objet fiche provenant de Supabase
 * @returns {string}         Chaîne HTML de la ligne <tr>
 */
function construireLigneFiche(fiche) {

  const dateFormatee = new Date(fiche.date_ajout).toLocaleDateString('fr-FR', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  });

  return `
    <tr>
      <td><div class="cell-primary">${fiche.titre}</div></td>
      <td>${fiche.matiere}</td>
      <td><span class="pill pill--pending">${fiche.niveau}</span></td>
      <td class="cell-date">${dateFormatee}</td>
      <td>
        <a class="cell-link" href="${fiche.url}" target="_blank" rel="noopener">
          Ouvrir ↗
        </a>
      </td>
      <td>
        <button class="btn btn--sm btn--danger" onclick="retirerFiche('${fiche.id}')">
          ✕ Retirer
        </button>
      </td>
    </tr>`;
}

/**
 * Supprime définitivement une fiche de Supabase.
 * La fiche disparaît du site public immédiatement.
 *
 * @async
 * @param {string} id - UUID de la fiche à supprimer
 * @returns {Promise<void>}
 */
async function retirerFiche(id) {

  const confirmed = window.confirm(
    'Retirer cette fiche du site ?\nElle ne sera plus visible par les étudiants.'
  );

  if (!confirmed) return;

  const { db, TABLES } = window.FichlyDB;

  const { error } = await db
    .from(TABLES.FICHES)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[admin.js] Erreur lors de la suppression de la fiche :', error);
    return;
  }

  await Promise.all([chargerStatistiques(), chargerGestionFiches()]);
}

/*
  Expose les fonctions de gestion au HTML.
*/
window.retirerFiche        = retirerFiche;
window.chargerGestionFiches = chargerGestionFiches;


/* ────────────────────────────────────────────────
   11. UTILITAIRES
   ──────────────────────────────────────────────── */

/**
 * Formate une date ISO en chaîne lisible en français.
 *
 * @param   {string} dateISO - Date au format ISO 8601
 * @returns {string}           Date formatée (ex: "12 mars 2026")
 */
function formaterDate(dateISO) {
  return new Date(dateISO).toLocaleDateString('fr-FR', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  });
}


/* ────────────────────────────────────────────────
   11. INITIALISATION
   ──────────────────────────────────────────────── */

/**
 * Point d'entrée — lancé quand le DOM est prêt.
 *
 * Vérifie d'abord si une session Supabase Auth existe déjà
 * (cas d'un rafraîchissement de page). Si oui, ouvre le
 * dashboard directement. Sinon, affiche la gate de connexion.
 */
document.addEventListener('DOMContentLoaded', () => {

  /* Vérifie une session existante avant d'afficher la gate */
  verifierSessionExistante();

  console.info('[admin.js] Interface administrateur prête.');
});
