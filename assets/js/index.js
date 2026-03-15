/* ============================================================
   FICHLY — index.js
   Logique de la page d'accueil publique (index.html).

   Ce fichier dépend de supabase-client.js qui doit être
   chargé avant lui dans le HTML.

   Responsabilités :
   - Charger et afficher les fiches depuis Supabase
   - Gérer la recherche par mot-clé
   - Gérer les filtres par niveau académique
   - Envoyer les demandes de fiche via le formulaire
   - Animer l'apparition des sections au scroll

   Organisation :
   1. Récupération des références DOM
   2. État de l'application
   3. Chargement des fiches
   4. Rendu de la grille
   5. Recherche
   6. Filtres par niveau
   7. Formulaire de demande
   8. Animations au scroll
   9. Initialisation
   ============================================================ */


/* ────────────────────────────────────────────────
   1. RÉCUPÉRATION DES RÉFÉRENCES DOM
   ──────────────────────────────────────────────── */

/*
  On centralise toutes les références aux éléments HTML ici.
  Cela évite de répéter document.getElementById() dans
  chaque fonction et améliore les performances.
*/
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
 * Toute modification passe par cet objet pour
 * garantir la cohérence entre les données et l'affichage.
 *
 * @type {Object}
 * @property {Array}  fiches    - Toutes les fiches chargées depuis Supabase
 * @property {string} niveau    - Filtre actif ('all' ou 'L1', 'L2'…)
 * @property {string} recherche - Texte de recherche en cours
 */
const AppState = {
  fiches:    [],
  niveau:    'all',
  recherche: '',
};


/* ────────────────────────────────────────────────
   3. CHARGEMENT DES FICHES
   ──────────────────────────────────────────────── */

/**
 * Charge toutes les fiches depuis Supabase et déclenche
 * le rendu de la grille.
 *
 * Les fiches sont triées par date d'ajout décroissante
 * (les plus récentes apparaissent en premier).
 *
 * @async
 * @returns {Promise<void>}
 */
async function chargerFiches() {

  /* Affiche l'indicateur de chargement pendant la requête */
  afficherEtatChargement();

  const { db, TABLES } = window.FichlyDB;

  const { data, error } = await db
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
