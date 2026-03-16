/* ============================================================
   KLARO — index.js
   Logique de la page d'accueil publique (index.html).

   Ce fichier dépend de supabase-client.js qui doit être
   chargé avant lui dans le HTML.

   Corrections apportées :
   - Recherche en temps réel à chaque frappe (pas seulement Entrée)
   - Normalisation des accents (chercher "rse" trouve "RSE",
     "ecologie" trouve "écologie")
   - Filtres et recherche parfaitement combinés
   - Réinitialisation propre des filtres et de la recherche
   - Accès direct aux fiches via lien cliquable

   Organisation :
   1. Récupération des références DOM
   2. État de l'application
   3. Utilitaire : normalisation du texte
   4. Chargement des fiches
   5. Rendu de la grille
   6. Filtrage (niveau + recherche combinés)
   7. Construction des cartes
   8. Recherche
   9. Filtres par niveau
   10. Formulaire de demande
   11. Animations au scroll
   12. Initialisation
   ============================================================ */


/* ────────────────────────────────────────────────
   1. RÉCUPÉRATION DES RÉFÉRENCES DOM
   ──────────────────────────────────────────────── */

const DOM = {

  /* Grille d'affichage des fiches */
  fichesGrid:   document.getElementById('fichesGrid'),

  /* Badge affichant le nombre de fiches trouvées */
  countBadge:   document.getElementById('countBadge'),

  /* Champ de recherche dans le hero */
  searchInput:  document.getElementById('searchInput'),

  /* Formulaire de demande de fiche */
  reqForm:      document.getElementById('reqForm'),

  /* Champs du formulaire de demande */
  reqNom:       document.getElementById('r_nom'),
  reqEmail:     document.getElementById('r_email'),
  reqMatiere:   document.getElementById('r_matiere'),
  reqNiveau:    document.getElementById('r_niveau'),
  reqDesc:      document.getElementById('r_desc'),

  /* Bouton de soumission de la demande */
  submitBtn:    document.getElementById('submitBtn'),
  submitLabel:  document.getElementById('btnLabel'),

  /* Message de retour après soumission */
  feedbackMsg:  document.getElementById('fMsg'),
};


/* ────────────────────────────────────────────────
   2. ÉTAT DE L'APPLICATION
   ──────────────────────────────────────────────── */

/**
 * État centralisé de la page.
 * Toute modification des filtres passe par cet objet —
 * jamais directement dans le DOM.
 *
 * @type {Object}
 * @property {Array}  fiches    - Toutes les fiches chargées depuis Supabase
 * @property {string} niveau    - Filtre actif ('all' ou 'L1', 'L2'…)
 * @property {string} recherche - Texte de recherche normalisé en cours
 */
const AppState = {
  fiches:    [],
  niveau:    'all',
  recherche: '',
};


/* ────────────────────────────────────────────────
   3. UTILITAIRE : NORMALISATION DU TEXTE
   ──────────────────────────────────────────────── */

/**
 * Normalise une chaîne de caractères pour la recherche :
 * - Convertit en minuscules
 * - Supprime les accents (é → e, è → e, ç → c…)
 *
 * Cela permet de chercher "ecologie" et trouver "écologie",
 * ou chercher "rse" et trouver "RSE".
 *
 * @param   {string} texte - Texte à normaliser
 * @returns {string}         Texte normalisé sans accents, en minuscules
 *
 * @example
 * normaliser("Responsabilité Sociétale") → "responsabilite societale"
 * normaliser("Écologie")                 → "ecologie"
 */
function normaliser(texte) {
  return (texte || '')
    .toLowerCase()
    /*
      normalize('NFD') décompose les caractères accentués
      en lettre de base + signe diacritique.
      ex : "é" devient "e" + "´"
    */
    .normalize('NFD')
    /*
      \u0300-\u036f correspond à la plage Unicode des
      signes diacritiques (accents, cédilles…).
      On les supprime avec replace().
    */
    .replace(/[\u0300-\u036f]/g, '');
}


/* ────────────────────────────────────────────────
   4. CHARGEMENT DES FICHES
   ──────────────────────────────────────────────── */

/**
 * Charge toutes les fiches depuis Supabase et déclenche
 * le rendu de la grille.
 *
 * @async
 * @returns {Promise<void>}
 */
async function chargerFiches() {

  afficherEtatChargement();

  /* Vérifie que Supabase est bien initialisé */
  if (!window.KlaroDB || !window.KlaroDB.db) {
    DOM.fichesGrid.innerHTML = `
      <div class="state-empty">
        <div class="state-icon">⚠️</div>
        <p>Connexion impossible.<br>
           Ouvre le site depuis <strong>Netlify</strong>,
           pas en local depuis ton téléphone.</p>
      </div>`;
    DOM.countBadge.textContent = '—';
    return;
  }

  const { db, TABLES } = window.KlaroDB;

  const { data, error } = await db
    .from(TABLES.FICHES)
    .select('*')
    .order('date_ajout', { ascending: false });

  if (error) {
    afficherEtatErreur();
    console.error('[index.js] Erreur chargement fiches :', error);
    return;
  }

  AppState.fiches = data || [];
  rendreGrille();
}

/**
 * Affiche le spinner de chargement dans la grille.
 */
function afficherEtatChargement() {
  DOM.fichesGrid.innerHTML = `
    <div class="state-empty">
      <div class="spinner"></div>
      <p>Chargement des fiches…</p>
    </div>`;
  DOM.countBadge.textContent = '…';
}

/**
 * Affiche un message d'erreur dans la grille.
 */
function afficherEtatErreur() {
  DOM.fichesGrid.innerHTML = `
    <div class="state-empty">
      <div class="state-icon">⚠️</div>
      <p>Impossible de charger les fiches.<br>
         Vérifie ta connexion internet.</p>
    </div>`;
  DOM.countBadge.textContent = '—';
}


/* ────────────────────────────────────────────────
   5. RENDU DE LA GRILLE
   ──────────────────────────────────────────────── */

/**
 * Filtre les fiches selon l'état actuel et met à jour la grille.
 * Ne refait PAS de requête réseau — travaille sur AppState.fiches.
 * Appelée à chaque changement de filtre ou de recherche.
 */
function rendreGrille() {

  const fichesFiltrees = filtrerFiches(AppState.fiches);
  const total          = fichesFiltrees.length;

  /* Met à jour le badge compteur */
  DOM.countBadge.textContent = `${total} fiche${total !== 1 ? 's' : ''}`;

  /* Cas : aucun résultat après filtrage */
  if (total === 0) {

    /*
      Message différent selon la cause :
      - Recherche active → invite à reformuler
      - Filtre niveau → invite à changer de niveau
      - Les deux → invite à faire une demande
    */
    const messageVide = AppState.recherche
      ? `Aucune fiche ne correspond à "<strong>${DOM.searchInput.value}</strong>".<br>
         <a href="#demande">Demander cette fiche ?</a>`
      : `Aucune fiche disponible pour le niveau <strong>${AppState.niveau}</strong>.<br>
         <a href="#demande">Faire une demande ?</a>`;

    DOM.fichesGrid.innerHTML = `
      <div class="state-empty">
        <div class="state-icon">📭</div>
        <p>${messageVide}</p>
      </div>`;
    return;
  }

  /* Génère et insère les cartes */
  DOM.fichesGrid.innerHTML = fichesFiltrees
    .map(fiche => construireCarteHTML(fiche))
    .join('');

  /*
    S'assure que la grille est bien visible.
    Nécessaire si un résidu de classe fade-up était présent.
  */
  DOM.fichesGrid.style.opacity   = '1';
  DOM.fichesGrid.style.transform = 'none';
}


/* ────────────────────────────────────────────────
   6. FILTRAGE (NIVEAU + RECHERCHE COMBINÉS)
   ──────────────────────────────────────────────── */

/**
 * Filtre un tableau de fiches en appliquant simultanément
 * le filtre de niveau ET le filtre de recherche.
 *
 * Les deux filtres sont cumulatifs : une fiche doit satisfaire
 * les deux conditions pour apparaître.
 *
 * La recherche est insensible à la casse ET aux accents
 * grâce à la fonction normaliser().
 *
 * @param   {Array} fiches - Tableau complet des fiches
 * @returns {Array}          Tableau filtré
 */
function filtrerFiches(fiches) {

  /* Terme de recherche normalisé — calculé une seule fois */
  const termeNormalise = normaliser(AppState.recherche);

  return fiches.filter(fiche => {

    /* ── Condition 1 : filtre par niveau ── */
    const niveauOk =
      AppState.niveau === 'all' ||
      fiche.niveau === AppState.niveau;

    /* ── Condition 2 : filtre par recherche ── */
    /*
      Si la recherche est vide, toutes les fiches passent.
      Sinon, on cherche le terme dans le titre, la matière
      et la description — les trois champs textuels pertinents.
      Chaque champ est normalisé avant comparaison.
    */
    const rechercheOk =
      termeNormalise === '' ||
      normaliser(fiche.titre).includes(termeNormalise)       ||
      normaliser(fiche.matiere).includes(termeNormalise)     ||
      normaliser(fiche.description).includes(termeNormalise) ||
      normaliser(fiche.niveau).includes(termeNormalise);

    /* La fiche s'affiche seulement si les deux conditions sont vraies */
    return niveauOk && rechercheOk;
  });
}


/* ────────────────────────────────────────────────
   7. CONSTRUCTION DES CARTES
   ──────────────────────────────────────────────── */

/**
 * Construit le HTML d'une carte de fiche cliquable.
 *
 * Le lien pointe vers l'URL stockée dans Supabase.
 * Si c'est un chemin relatif (ex: "fiches/rse-2026.html"),
 * il s'ouvre dans le même site.
 * Si c'est une URL complète (ex: "https://..."), elle s'ouvre
 * dans un nouvel onglet.
 *
 * @param   {Object} fiche - Objet fiche provenant de Supabase
 * @returns {string}         Chaîne HTML de la carte
 */
function construireCarteHTML(fiche) {

  /* Formate la date en français lisible */
  const dateFormatee = new Date(fiche.date_ajout).toLocaleDateString('fr-FR', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  });

  /* Description optionnelle */
  const descHTML = fiche.description
    ? `<div class="fiche-card__desc">${fiche.description}</div>`
    : '';

  /*
    Détermine si l'URL est externe (commence par http)
    pour ouvrir dans un nouvel onglet uniquement si nécessaire.
  */
  const estExterne  = fiche.url.startsWith('http');
  const targetAttr  = estExterne ? 'target="_blank" rel="noopener noreferrer"' : '';

  return `
    <a class="fiche-card" href="${fiche.url}" ${targetAttr}>

      <div class="fiche-card__badges">
        <span class="badge badge--level">${fiche.niveau}</span>
        <span class="badge badge--subject">${fiche.matiere}</span>
      </div>

      <div class="fiche-card__title">${fiche.titre}</div>

      ${descHTML}

      <div class="fiche-card__footer">
        <span class="fiche-card__date">${dateFormatee}</span>
        <span class="fiche-card__cta">Ouvrir →</span>
      </div>

    </a>`;
}


/* ────────────────────────────────────────────────
   8. RECHERCHE
   ──────────────────────────────────────────────── */

/**
 * Met à jour l'état de recherche et relance le rendu.
 * Appelée à chaque frappe dans le champ de recherche.
 *
 * @param {string} [valeur] - Valeur à rechercher.
 *                            Si omise, lit directement le champ.
 */
function effectuerRecherche(valeur) {
  AppState.recherche = (valeur !== undefined ? valeur : DOM.searchInput.value).trim();
  rendreGrille();
}

/*
  ── Recherche en temps réel ──
  Déclenche la recherche à CHAQUE frappe dans le champ.
  L'utilisateur voit les résultats se filtrer instantanément
  sans avoir à appuyer sur Entrée ou cliquer sur le bouton.
*/
DOM.searchInput.addEventListener('input', () => {
  effectuerRecherche(DOM.searchInput.value);
});

/*
  ── Recherche sur Entrée ──
  Conservé pour les utilisateurs qui appuient sur Entrée.
*/
DOM.searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') effectuerRecherche();
});

/*
  Expose la fonction au HTML pour le bouton "Chercher".
*/
window.effectuerRecherche = effectuerRecherche;


/* ────────────────────────────────────────────────
   9. FILTRES PAR NIVEAU
   ──────────────────────────────────────────────── */

/**
 * Active un filtre de niveau.
 * La recherche en cours est conservée — les deux filtres
 * s'appliquent simultanément.
 *
 * @param {HTMLElement} boutonClique - Le bouton filtre cliqué
 */
function filtrerParNiveau(boutonClique) {

  /* Retire l'état actif de tous les boutons de filtre */
  document.querySelectorAll('[data-niveau]').forEach(btn => {
    btn.classList.remove('filter-btn--active');
  });

  /* Active le bouton cliqué */
  boutonClique.classList.add('filter-btn--active');

  /* Met à jour l'état et relance le rendu */
  AppState.niveau = boutonClique.dataset.niveau;
  rendreGrille();
}

/*
  Expose la fonction au HTML pour les boutons de filtre.
*/
window.filtrerParNiveau = filtrerParNiveau;


/* ────────────────────────────────────────────────
   10. FORMULAIRE DE DEMANDE
   ──────────────────────────────────────────────── */

/**
 * Gère la soumission du formulaire de demande de fiche.
 * Envoie les données dans la table "demandes" de Supabase.
 *
 * @async
 * @param {SubmitEvent} evenement
 */
async function envoyerDemande(evenement) {

  evenement.preventDefault();

  /* Validation : champs obligatoires non vides */
  const nom     = DOM.reqNom.value.trim();
  const matiere = DOM.reqMatiere.value.trim();

  if (!nom || !matiere) {
    afficherFeedback('error', 'Merci de remplir au moins ton nom et la matière.');
    return;
  }

  /* Passe en état de chargement */
  DOM.submitBtn.disabled      = true;
  DOM.submitLabel.textContent = 'Envoi en cours…';
  cacherFeedback();

  const donneesDemande = {
    nom,
    email:       DOM.reqEmail.value.trim()  || null,
    matiere,
    niveau:      DOM.reqNiveau.value        || null,
    description: DOM.reqDesc.value.trim()   || null,
    statut:      'en_attente',
  };

  const { db, TABLES } = window.KlaroDB;

  /* Vérifie que le client est disponible avant d'envoyer */
  if (!db) {
    afficherFeedback('error',
      'Connexion impossible. Vérifie ta connexion internet.'
    );
    DOM.submitBtn.disabled      = false;
    DOM.submitLabel.textContent = 'Envoyer la demande';
    return;
  }

  const { error } = await db
    .from(TABLES.DEMANDES)
    .insert([donneesDemande]);

  if (error) {
    afficherFeedback('error',
      'Une erreur est survenue. Réessaie dans quelques instants.'
    );
    console.error('[index.js] Erreur envoi demande :', error);
  } else {
    afficherFeedback('success',
      '✓ Demande envoyée ! Notre équipe Klaro s\'en occupe rapidement.'
    );
    DOM.reqForm.reset();
  }

  DOM.submitBtn.disabled      = false;
  DOM.submitLabel.textContent = 'Envoyer la demande';
}

/**
 * Affiche un message de retour sous le formulaire.
 * @param {'success'|'error'} type
 * @param {string}            message
 */
function afficherFeedback(type, message) {
  DOM.feedbackMsg.textContent = message;
  DOM.feedbackMsg.className   = `feedback feedback--show feedback--${type}`;
}

/**
 * Masque le message de retour.
 */
function cacherFeedback() {
  DOM.feedbackMsg.textContent = '';
  DOM.feedbackMsg.className   = 'feedback';
}

if (DOM.reqForm) {
  DOM.reqForm.addEventListener('submit', envoyerDemande);
}


/* ────────────────────────────────────────────────
   11. ANIMATIONS AU SCROLL
   ──────────────────────────────────────────────── */

/**
 * Active les animations fade-up au scroll via IntersectionObserver.
 */
function initialiserAnimationsScroll() {

  const observateur = new IntersectionObserver(
    (entrees) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) {
          entree.target.classList.add('visible');
          observateur.unobserve(entree.target);
        }
      });
    },
    { threshold: 0.08 }
  );

  document.querySelectorAll('.fade-up').forEach(el => {
    observateur.observe(el);
  });
}


/* ────────────────────────────────────────────────
   12. INITIALISATION
   ──────────────────────────────────────────────── */

/**
 * Point d'entrée principal.
 * Lance le chargement des fiches puis les fonctionnalités UI.
 */
async function initialiser() {
  await chargerFiches();
  initialiserAnimationsScroll();
}

document.addEventListener('DOMContentLoaded', initialiser);
    .from(TABLES.FICHES)
    .select('*')
    .order('date_ajout', { ascending: false });

  /* Gestion de l'erreur réseau ou Supabase */
  if (error) {
    afficherEtatErreur();
    console.error('[index.js] Erreur lors du chargement des fiches :', error);
    return;
  }

  /* Stocke les données dans l'état global */
  AppState.fiches = data || [];

  /* Déclenche l'affichage avec les filtres actuels */
  rendreGrille();
}

/**
 * Affiche un indicateur de chargement dans la grille.
 * Remplace temporairement le contenu pendant la requête.
 */
function afficherEtatChargement() {
  DOM.fichesGrid.innerHTML = `
    <div class="state-empty">
      <div class="spinner"></div>
      <p>Chargement des fiches…</p>
    </div>`;
  DOM.countBadge.textContent = '…';
}

/**
 * Affiche un message d'erreur dans la grille.
 * Appelé uniquement si la requête Supabase échoue.
 */
function afficherEtatErreur() {
  DOM.fichesGrid.innerHTML = `
    <div class="state-empty">
      <div class="state-icon">⚠️</div>
      <p>Impossible de charger les fiches.<br>Vérifie ta connexion.</p>
    </div>`;
  DOM.countBadge.textContent = '—';
}


/* ────────────────────────────────────────────────
   4. RENDU DE LA GRILLE
   ──────────────────────────────────────────────── */

/**
 * Filtre les fiches selon l'état actuel (niveau + recherche)
 * et met à jour l'affichage de la grille.
 *
 * Cette fonction est appelée à chaque changement de filtre
 * ou de texte de recherche — elle ne refait pas de requête
 * réseau, elle travaille uniquement sur AppState.fiches.
 */
function rendreGrille() {

  /* Applique les filtres sur la liste complète */
  const fichesFiltrees = filtrerFiches(AppState.fiches);

  /* Met à jour le compteur */
  const total = fichesFiltrees.length;
  DOM.countBadge.textContent = `${total} fiche${total !== 1 ? 's' : ''}`;

  /* Cas : aucun résultat */
  if (total === 0) {
    DOM.fichesGrid.innerHTML = `
      <div class="state-empty">
        <div class="state-icon">📭</div>
        <p>Aucune fiche trouvée.<br>
           <a href="#demande">Faire une demande ?</a>
        </p>
      </div>`;
    return;
  }

  /* Génère et insère le HTML des cartes */
  DOM.fichesGrid.innerHTML = fichesFiltrees
    .map(fiche => construireCarteHTML(fiche))
    .join('');
}

/**
 * Filtre un tableau de fiches selon le niveau et la recherche
 * stockés dans AppState.
 *
 * @param   {Array} fiches - Tableau de toutes les fiches
 * @returns {Array}          Tableau filtré
 */
function filtrerFiches(fiches) {

  return fiches.filter(fiche => {

    /* ── Filtre par niveau ── */
    const niveauOk =
      AppState.niveau === 'all' ||
      fiche.niveau === AppState.niveau;

    /* ── Filtre par recherche (insensible à la casse) ── */
    const termeNormalise = AppState.recherche.toLowerCase();
    const rechercheOk =
      AppState.recherche === '' ||
      fiche.titre.toLowerCase().includes(termeNormalise)            ||
      fiche.matiere.toLowerCase().includes(termeNormalise)          ||
      (fiche.description || '').toLowerCase().includes(termeNormalise);

    /* La fiche passe si elle satisfait LES DEUX conditions */
    return niveauOk && rechercheOk;
  });
}

/**
 * Construit le HTML d'une carte de fiche.
 *
 * @param   {Object} fiche - Objet fiche provenant de Supabase
 * @returns {string}         Chaîne HTML de la carte
 */
function construireCarteHTML(fiche) {

  /* Formate la date en français : "12 mars 2026" */
  const dateFormatee = new Date(fiche.date_ajout).toLocaleDateString('fr-FR', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  });

  /* La description est optionnelle */
  const descHTML = fiche.description
    ? `<div class="fiche-card__desc">${fiche.description}</div>`
    : '';

  return `
    <a class="fiche-card" href="${fiche.url}" target="_blank" rel="noopener noreferrer">

      <div class="fiche-card__badges">
        <span class="badge badge--level">${fiche.niveau}</span>
        <span class="badge badge--subject">${fiche.matiere}</span>
      </div>

      <div class="fiche-card__title">${fiche.titre}</div>

      ${descHTML}

      <div class="fiche-card__footer">
        <span class="fiche-card__date">${dateFormatee}</span>
        <span class="fiche-card__cta">Ouvrir →</span>
      </div>

    </a>`;
}


/* ────────────────────────────────────────────────
   5. RECHERCHE
   ──────────────────────────────────────────────── */

/**
 * Déclenche la recherche en mettant à jour l'état et
 * en relançant le rendu de la grille.
 * Appelé par le bouton "Chercher" et la touche Entrée.
 */
function effectuerRecherche() {
  AppState.recherche = DOM.searchInput.value.trim();
  rendreGrille();
}

/*
  Écoute la touche Entrée dans le champ de recherche
  pour déclencher la recherche sans cliquer sur le bouton.
*/
DOM.searchInput.addEventListener('keydown', (evenement) => {
  if (evenement.key === 'Enter') {
    effectuerRecherche();
  }
});

/*
  Réinitialise la recherche si l'utilisateur vide le champ.
  Cela évite d'avoir à recliquer sur "Chercher" pour voir
  toutes les fiches à nouveau.
*/
DOM.searchInput.addEventListener('input', (evenement) => {
  if (evenement.target.value === '') {
    AppState.recherche = '';
    rendreGrille();
  }
});

/*
  Expose la fonction au HTML pour le bouton onclick="effectuerRecherche()"
*/
window.effectuerRecherche = effectuerRecherche;


/* ────────────────────────────────────────────────
   6. FILTRES PAR NIVEAU
   ──────────────────────────────────────────────── */

/**
 * Active un filtre de niveau et met à jour l'affichage.
 * Appelé via onclick="filtrerParNiveau(this)" dans le HTML.
 *
 * @param {HTMLElement} boutonClique - Le bouton filtre cliqué
 */
function filtrerParNiveau(boutonClique) {

  /* Retire la classe active de tous les boutons */
  document.querySelectorAll('[data-niveau]').forEach(btn => {
    btn.classList.remove('filter-btn--active');
  });

  /* Applique la classe active sur le bouton cliqué */
  boutonClique.classList.add('filter-btn--active');

  /* Met à jour l'état et relance le rendu */
  AppState.niveau = boutonClique.dataset.niveau;
  rendreGrille();
}

/*
  Expose la fonction au HTML pour les boutons onclick="filtrerParNiveau(this)"
*/
window.filtrerParNiveau = filtrerParNiveau;


/* ────────────────────────────────────────────────
   7. FORMULAIRE DE DEMANDE
   ──────────────────────────────────────────────── */

/**
 * Gère la soumission du formulaire de demande de fiche.
 * Envoie les données dans la table "demandes" de Supabase.
 *
 * @async
 * @param {SubmitEvent} evenement - Événement de soumission du formulaire
 * @returns {Promise<void>}
 */
async function envoyerDemande(evenement) {

  /* Empêche le rechargement de la page */
  evenement.preventDefault();

  /* ── Passe en état de chargement ── */
  DOM.submitBtn.disabled    = true;
  DOM.submitLabel.textContent = 'Envoi en cours…';
  cacherFeedback();

  /* ── Collecte les valeurs du formulaire ── */
  const donneesDemande = {
    nom:         DOM.reqNom.value.trim(),
    email:       DOM.reqEmail.value.trim() || null, /* null si vide */
    matiere:     DOM.reqMatiere.value.trim(),
    niveau:      DOM.reqNiveau.value       || null,
    description: DOM.reqDesc.value.trim()  || null,
    statut:      'en_attente',              /* Statut initial par défaut */
  };

  /* ── Envoi vers Supabase ── */
  const { db, TABLES } = window.FichlyDB;

  const { error } = await db
    .from(TABLES.DEMANDES)
    .insert([donneesDemande]);

  /* ── Traitement du résultat ── */
  if (error) {
    afficherFeedback(
      'error',
      'Une erreur est survenue lors de l\'envoi. Réessaie dans quelques instants.'
    );
    console.error('[index.js] Erreur lors de l\'envoi de la demande :', error);
  } else {
    afficherFeedback(
      'success',
      '✓ Demande envoyée ! Notre équipe WindJos s\'en occupe rapidement.'
    );
    /* Réinitialise le formulaire après succès */
    DOM.reqForm.reset();
  }

  /* ── Restaure l'état du bouton ── */
  DOM.submitBtn.disabled      = false;
  DOM.submitLabel.textContent = 'Envoyer la demande';
}

/**
 * Affiche un message de retour (succès ou erreur) sous le formulaire.
 *
 * @param {'success'|'error'} type    - Type de message
 * @param {string}            message - Texte à afficher
 */
function afficherFeedback(type, message) {
  DOM.feedbackMsg.textContent = message;
  DOM.feedbackMsg.className   = `feedback feedback--show feedback--${type}`;
}

/**
 * Masque le message de retour.
 */
function cacherFeedback() {
  DOM.feedbackMsg.textContent = '';
  DOM.feedbackMsg.className   = 'feedback';
}

/*
  Attache l'événement de soumission au formulaire de demande.
*/
if (DOM.reqForm) {
  DOM.reqForm.addEventListener('submit', envoyerDemande);
}


/* ────────────────────────────────────────────────
   8. ANIMATIONS AU SCROLL
   ──────────────────────────────────────────────── */

/**
 * Initialise l'observateur d'intersection pour les animations
 * de type "fade-up" (apparition progressive au scroll).
 *
 * Chaque élément portant la classe .fade-up reçoit la classe
 * .visible lorsqu'il entre dans le viewport.
 */
function initialiserAnimationsScroll() {

  /*
    IntersectionObserver déclenche un callback lorsqu'un élément
    entre dans la zone visible de la page (viewport).
    threshold: 0.08 = déclenche quand 8% de l'élément est visible.
  */
  const observateur = new IntersectionObserver(
    (entrees) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) {
          entree.target.classList.add('visible');

          /* On arrête d'observer cet élément : l'animation ne rejoue pas */
          observateur.unobserve(entree.target);
        }
      });
    },
    { threshold: 0.08 }
  );

  /* Observe tous les éléments avec la classe fade-up */
  document.querySelectorAll('.fade-up').forEach(el => {
    observateur.observe(el);
  });
}

/**
 * Met en surbrillance le lien de navigation correspondant
 * à la section actuellement visible à l'écran.
 */
function initialiserSurlignageNav() {

  const sections  = document.querySelectorAll('section[id]');
  const liensNav  = document.querySelectorAll('nav a[href^="#"]');

  window.addEventListener('scroll', () => {

    let idSectionActive = '';

    /* Identifie la section dont le haut est le plus proche du viewport */
    sections.forEach((section) => {
      if (window.scrollY >= section.offsetTop - 80) {
        idSectionActive = section.id;
      }
    });

    /* Met à jour les styles des liens */
    liensNav.forEach((lien) => {
      const estActif = lien.getAttribute('href') === `#${idSectionActive}`;
      lien.style.color            = estActif ? 'var(--color-gold)' : '';
      lien.style.borderBottomColor = estActif ? 'var(--color-gold)' : 'transparent';
    });
  });
}


/* ────────────────────────────────────────────────
   9. INITIALISATION
   ──────────────────────────────────────────────── */

/**
 * Point d'entrée principal.
 * Appelé automatiquement lorsque le DOM est entièrement chargé.
 * Lance toutes les fonctionnalités dans le bon ordre.
 */
async function initialiser() {

  /* 1. Lance le chargement des fiches depuis Supabase */
  await chargerFiches();

  /* 2. Active les animations de scroll */
  initialiserAnimationsScroll();

  /* 3. Active le surlignage de la navigation */
  initialiserSurlignageNav();
}

/*
  Attend que le DOM soit complètement construit avant
  de lancer l'initialisation.
*/
document.addEventListener('DOMContentLoaded', initialiser);
