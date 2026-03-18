/* ============================================================
   KLARO — fiche.js
   Logique commune à toutes les fiches de révision.

   Ce fichier est autonome : il ne dépend d'aucune autre
   librairie ni de supabase-client.js.
   Il doit être chargé en fin de body dans chaque fiche HTML.

   Responsabilités :
   - Gérer l'ouverture/fermeture des accordéons
   - Gérer la logique des quiz interactifs
   - Animer l'apparition des sections au scroll
   - Surligner le lien actif dans la navigation interne

   Organisation :
   1. Accordéon
   2. Quiz
   3. Animations au scroll
   4. Surlignage de la navigation interne
   5. Initialisation
   ============================================================ */


/* ────────────────────────────────────────────────
   1. ACCORDÉON
   ──────────────────────────────────────────────── */

/**
 * Bascule l'état ouvert/fermé d'un accordéon.
 * Appelé via onclick="toggleAccordion(this)" sur le bouton déclencheur.
 *
 * @param {HTMLElement} declencheur - Le bouton .accordion__trigger cliqué
 */
function toggleAccordion(declencheur) {

  const corps   = declencheur.nextElementSibling; /* .accordion__body */
  const estOuvert = declencheur.getAttribute('aria-expanded') === 'true';

  /* Met à jour l'attribut ARIA pour l'accessibilité */
  declencheur.setAttribute('aria-expanded', !estOuvert);

  /* Bascule la classe d'affichage du corps */
  corps.classList.toggle('open', !estOuvert);
}

/*
  Expose la fonction au HTML pour les attributs onclick.
*/
window.toggleAccordion = toggleAccordion;


/* ────────────────────────────────────────────────
   2. QUIZ
   ──────────────────────────────────────────────── */

/**
 * Traite le clic sur une option de quiz.
 * Appelé via onclick="repondre(this, true/false)" sur chaque option.
 *
 * Comportement :
 * - Marque l'option cliquée comme correcte ou incorrecte.
 * - Si incorrecte, révèle la bonne réponse.
 * - Affiche un message de feedback.
 * - Verrouille la question pour empêcher de répondre à nouveau.
 *
 * @param {HTMLElement} optionCliquee - L'élément .quiz__option cliqué
 * @param {boolean}     estCorrect    - True si cette option est la bonne réponse
 */
function repondre(optionCliquee, estCorrect) {

  /* Récupère le bloc question parent */
  const blocQuestion = optionCliquee.closest('.quiz__question');

  /* Empêche de répondre plusieurs fois à la même question */
  if (blocQuestion.dataset.repondu) return;
  blocQuestion.dataset.repondu = 'true';

  /* Récupère tous les éléments nécessaires */
  const toutesOptions = blocQuestion.querySelectorAll('.quiz__option');
  const feedback      = blocQuestion.querySelector('.quiz__feedback');
  const cercle        = optionCliquee.querySelector('.quiz__option-circle');

  /* Désactive toutes les options après réponse */
  toutesOptions.forEach(opt => {
    opt.style.pointerEvents = 'none';
  });

  if (estCorrect) {

    /* ── Bonne réponse ── */
    optionCliquee.classList.add('quiz__option--correct');
    cercle.textContent      = '✓';
    feedback.textContent    = '✓ Bonne réponse !';
    feedback.className      = 'quiz__feedback quiz__feedback--show quiz__feedback--good';

  } else {

    /* ── Mauvaise réponse ── */
    optionCliquee.classList.add('quiz__option--wrong');
    cercle.textContent = '✗';

    /*
      Révèle la bonne réponse parmi les autres options.
      On identifie la bonne réponse via son attribut onclick
      qui contient "true".
    */
    toutesOptions.forEach(opt => {
      if (opt !== optionCliquee) {
        const aBonneReponse = opt.getAttribute('onclick').includes('true');
        if (aBonneReponse) {
          opt.classList.add('quiz__option--reveal');
          opt.querySelector('.quiz__option-circle').textContent = '✓';
        }
      }
    });

    feedback.textContent = '✗ Incorrect. La bonne réponse est mise en évidence.';
    feedback.className   = 'quiz__feedback quiz__feedback--show quiz__feedback--bad';
  }
}

/*
  Expose la fonction au HTML pour les attributs onclick.
*/
window.repondre = repondre;


/* ────────────────────────────────────────────────
   3. ANIMATIONS AU SCROLL
   ──────────────────────────────────────────────── */

/**
 * Initialise l'observateur d'intersection pour les animations
 * fade-up au scroll. Chaque élément portant .fade-up reçoit
 * la classe .visible lorsqu'il entre dans le viewport.
 */
function initialiserAnimationsScroll() {

  const observateur = new IntersectionObserver(
    (entrees) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) {
          entree.target.classList.add('visible');
          /* L'animation ne rejoue pas une fois déclenchée */
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
   4. SURLIGNAGE DE LA NAVIGATION INTERNE
   ──────────────────────────────────────────────── */

/**
 * Met en surbrillance le lien de navigation interne
 * correspondant à la section actuellement visible à l'écran.
 * Utilise les classes CSS de fiche.css (.fiche-nav__link--active).
 */
function initialiserNavigation() {

  const sections = document.querySelectorAll('section[id]');
  const liens    = document.querySelectorAll('.fiche-nav__link');

  if (!sections.length || !liens.length) return;

  window.addEventListener('scroll', () => {

    let idActif = '';

    /* Identifie la section la plus proche du haut du viewport */
    sections.forEach((section) => {
      if (window.scrollY >= section.offsetTop - 80) {
        idActif = section.id;
      }
    });

    /* Met à jour les classes des liens */
    liens.forEach((lien) => {
      const estActif = lien.getAttribute('href') === `#${idActif}`;
      lien.classList.toggle('fiche-nav__link--active', estActif);
    });
  });
}


/* ────────────────────────────────────────────────
   5. BOUTON COURS ORIGINAL
   ──────────────────────────────────────────────── */

/**
 * Charge l'URL du cours original depuis Supabase et
 * l'injecte dans le bouton "Cours original" de la fiche.
 *
 * Fonctionnement :
 *  1. Détermine l'URL relative de la fiche en cours
 *     (ex: "fiches/rse-2026.html") à partir de window.location
 *  2. Cherche dans la table "fiches" la ligne dont le champ
 *     "url" correspond à ce chemin
 *  3. Cherche dans "cours_originaux" le cours lié à cette fiche
 *  4. Récupère l'URL publique du fichier dans le bucket Storage
 *  5. Met à jour le href du bouton
 *
 * Si aucun cours n'est disponible, le bouton est masqué
 * pour ne pas présenter un lien mort à l'étudiant.
 */
async function chargerCoursOriginal() {

  var btn = document.getElementById('btnCoursOriginal');
  if (!btn) return;

  /* Vérifie que Supabase est disponible */
  if (!window.KlaroDB || !window.KlaroDB.pret) {
    console.warn('[fiche.js] KlaroDB non disponible — bouton masqué.');
    btn.style.display = 'none';
    return;
  }

  var db = window.KlaroDB.db;

  /*
    Stratégie URL plus robuste :
    On extrait le nom du fichier HTML depuis l'URL du navigateur
    puis on cherche dans Supabase toutes les fiches dont l'URL
    SE TERMINE par ce nom de fichier.

    Exemple :
      pathname → "/klaro/fiches/rse-2026.html"
      nomFichier → "rse-2026.html"
      On cherche les fiches où url contient "rse-2026.html"

    C'est plus souple que la correspondance exacte, car
    l'URL stockée dans Supabase peut être "fiches/rse-2026.html"
    ou "../fiches/rse-2026.html" selon comment elle a été saisie.
  */
  var pathname   = window.location.pathname;
  var nomFichier = pathname.split('/').pop(); /* "rse-2026.html" */

  console.log('[fiche.js] Pathname :', pathname);
  console.log('[fiche.js] Nom de fichier extrait :', nomFichier);

  if (!nomFichier || !nomFichier.endsWith('.html')) {
    console.warn('[fiche.js] Nom de fichier invalide — bouton masqué.');
    btn.style.display = 'none';
    return;
  }

  /* Étape 1 : cherche la fiche dont l'URL contient ce nom de fichier */
  var resultFiche = await db
    .from('fiches')
    .select('id, titre, url')
    .ilike('url', '%' + nomFichier); /* ilike = insensible à la casse */

  console.log('[fiche.js] Résultat recherche fiche :', resultFiche);

  if (resultFiche.error || !resultFiche.data || !resultFiche.data.length) {
    console.warn('[fiche.js] Fiche introuvable dans Supabase pour :', nomFichier);
    btn.style.display = 'none';
    return;
  }

  var ficheId = resultFiche.data[0].id;
  console.log('[fiche.js] Fiche trouvée — id :', ficheId,
    '| titre :', resultFiche.data[0].titre);

  /* Étape 2 : cherche le cours original lié à cette fiche */
  var resultCours = await db
    .from('cours_originaux')
    .select('fichier_url, titre')
    .eq('fiche_id', ficheId)
    .order('date_ajout', { ascending: false });

  console.log('[fiche.js] Résultat cours_originaux :', resultCours);

  if (resultCours.error || !resultCours.data || !resultCours.data.length) {
    console.warn('[fiche.js] Aucun cours publié pour cette fiche.');
    btn.style.display = 'none';
    return;
  }

  var cours = resultCours.data[0];

  /* Étape 3 : récupère l'URL publique du fichier dans Storage */
  var urlResult   = db.storage
    .from('cours-originaux')
    .getPublicUrl(cours.fichier_url);
  var urlPublique = urlResult.data && urlResult.data.publicUrl;

  console.log('[fiche.js] URL publique cours :', urlPublique);

  if (!urlPublique) {
    console.warn('[fiche.js] URL publique introuvable.');
    btn.style.display = 'none';
    return;
  }

  /* Étape 4 : injecte l'URL dans le bouton et l'affiche */
  btn.href         = urlPublique;
  btn.title        = 'Télécharger : ' + cours.titre;
  btn.style.display = '';

  console.log('[fiche.js] ✅ Bouton cours original activé :', cours.titre);
}


/* ────────────────────────────────────────────────
   6. INITIALISATION
   ──────────────────────────────────────────────── */

/**
 * Point d'entrée — lancé quand le DOM est prêt.
 */
document.addEventListener('DOMContentLoaded', () => {
  initialiserAnimationsScroll();
  initialiserNavigation();
  chargerCoursOriginal(); /* ★ Nouveau — charge l'URL du cours */
});
   
