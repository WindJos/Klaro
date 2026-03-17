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

  /* Récupère le bouton dans le DOM */
  var btn = document.getElementById('btnCoursOriginal');
  if (!btn) return; /* La page n'a pas de bouton cours — on sort */

  /* Vérifie que Supabase est disponible */
  if (!window.KlaroDB || !window.KlaroDB.pret) {
    btn.style.display = 'none';
    return;
  }

  var db = window.KlaroDB.db;

  /*
    Extrait le chemin relatif de la fiche depuis l'URL du navigateur.
    Exemple :
      URL complète  → "https://user.github.io/klaro/fiches/rse-2026.html"
      On veut       → "fiches/rse-2026.html"

    On cherche "fiches/" dans le pathname et on prend tout depuis là.
    Si le site est à la racine ou dans un sous-dossier (ex: /klaro/),
    cette méthode fonctionne dans les deux cas.
  */
  var pathname    = window.location.pathname;
  var idxFiches   = pathname.indexOf('fiches/');
  if (idxFiches === -1) {
    /* Chemin inattendu — on masque le bouton par sécurité */
    btn.style.display = 'none';
    return;
  }
  var cheminFiche = pathname.substring(idxFiches);
  /* Résultat : "fiches/rse-2026.html" */

  /*
    Étape 1 : trouve la fiche dans Supabase par son URL
  */
  var resultFiche = await db
    .from('fiches')
    .select('id')
    .eq('url', cheminFiche)
    .single();

  if (resultFiche.error || !resultFiche.data) {
    /* Fiche introuvable en base → masque le bouton */
    btn.style.display = 'none';
    return;
  }

  var ficheId = resultFiche.data.id;

  /*
    Étape 2 : cherche le cours original lié à cette fiche
    On prend le plus récent si plusieurs existent (order desc)
  */
  var resultCours = await db
    .from('cours_originaux')
    .select('fichier_url, titre')
    .eq('fiche_id', ficheId)
    .order('date_ajout', { ascending: false })
    .limit(1)
    .single();

  if (resultCours.error || !resultCours.data) {
    /* Aucun cours publié pour cette fiche → masque le bouton */
    btn.style.display = 'none';
    return;
  }

  /*
    Étape 3 : récupère l'URL publique du fichier dans Storage
    Le bucket "cours-originaux" est public, donc l'URL est
    directement accessible sans authentification.
  */
  var urlResult = db.storage
    .from('cours-originaux')
    .getPublicUrl(resultCours.data.fichier_url);

  var urlPublique = urlResult.data && urlResult.data.publicUrl;

  if (!urlPublique) {
    btn.style.display = 'none';
    return;
  }

  /*
    Étape 4 : injecte l'URL dans le bouton et met à jour
    son titre pour l'accessibilité
  */
  btn.href  = urlPublique;
  btn.title = 'Télécharger : ' + resultCours.data.titre;

  /* S'assure que le bouton est visible */
  btn.style.display = '';

  console.log('[fiche.js] Cours original chargé :', resultCours.data.titre);
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
