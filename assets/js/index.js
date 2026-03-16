// KLARO — index.js
// Logique de la page d'accueil publique

// ─────────────────────────────────────────
// 1. RÉFÉRENCES DOM
// ─────────────────────────────────────────
var DOM = {
  fichesGrid:      document.getElementById('fichesGrid'),
  countBadge:      document.getElementById('countBadge'),
  searchInput:     document.getElementById('searchInput'),
  reqForm:         document.getElementById('reqForm'),
  reqNom:          document.getElementById('r_nom'),
  reqEmail:        document.getElementById('r_email'),
  reqEtablissement: document.getElementById('r_etablissement'),
  reqAutreEtab:    document.getElementById('r_autre_etab'),
  autreEtabGroup:  document.getElementById('autreEtabGroup'),
  reqFiliere:      document.getElementById('r_filiere'),
  reqAutreFiliere: document.getElementById('r_autre_filiere'),
  autreFiliereGroup: document.getElementById('autreFiliereGroup'),
  reqNiveau:       document.getElementById('r_niveau'),
  reqMatiere:      document.getElementById('r_matiere'),
  reqFichier:      document.getElementById('r_fichier'),
  reqDesc:         document.getElementById('r_desc'),
  submitBtn:       document.getElementById('submitBtn'),
  submitLabel:     document.getElementById('btnLabel'),
  feedbackMsg:     document.getElementById('fMsg'),
  uploadProgress:  document.getElementById('uploadProgress'),
  uploadPct:       document.getElementById('uploadPct'),
  uploadBar:       document.getElementById('uploadBar')
};


// ─────────────────────────────────────────
// 2. ÉTAT DE L'APPLICATION
// ─────────────────────────────────────────
var AppState = {
  fiches:    [],
  niveau:    'all',
  etab:      'all',
  filiere:   'all',
  recherche: ''
};


// ─────────────────────────────────────────
// 3. NORMALISATION (accents + casse)
// ─────────────────────────────────────────
function normaliser(texte) {
  return (texte || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}


// ─────────────────────────────────────────
// 4. CHARGEMENT DES FICHES
// ─────────────────────────────────────────
async function chargerFiches() {
  DOM.fichesGrid.innerHTML = '<div class="state-empty"><div class="spinner"></div><p>Chargement des fiches…</p></div>';
  DOM.countBadge.textContent = '…';

  if (!window.KlaroDB || !window.KlaroDB.pret) {
    DOM.fichesGrid.innerHTML = '<div class="state-empty"><div class="state-icon">⚠️</div><p>Connexion impossible. Vérifie ta connexion et recharge.</p></div>';
    DOM.countBadge.textContent = '—';
    return;
  }

  var db     = window.KlaroDB.db;
  var TABLES = window.KlaroDB.TABLES;

  var result = await db
    .from(TABLES.FICHES)
    .select('*')
    .order('date_ajout', { ascending: false });

  if (result.error) {
    DOM.fichesGrid.innerHTML = '<div class="state-empty"><div class="state-icon">⚠️</div><p>Impossible de charger les fiches.</p></div>';
    DOM.countBadge.textContent = '—';
    console.error('[index.js] Erreur chargement :', result.error);
    return;
  }

  AppState.fiches = result.data || [];
  rendreGrille();
}


// ─────────────────────────────────────────
// 5. FILTRAGE (niveau + etab + filiere + recherche)
// ─────────────────────────────────────────
function filtrerFiches(fiches) {
  var terme = normaliser(AppState.recherche);

  return fiches.filter(function(f) {

    // Filtre niveau
    var niveauOk = AppState.niveau === 'all' || f.niveau === AppState.niveau;

    // Filtre établissement
    var etabOk = AppState.etab === 'all' || f.etablissement === AppState.etab;

    // Filtre filière
    var filiereOk = AppState.filiere === 'all' || f.filiere === AppState.filiere;

    // Filtre recherche texte
    var rechercheOk = terme === '' ||
      normaliser(f.titre).includes(terme) ||
      normaliser(f.matiere).includes(terme) ||
      normaliser(f.filiere).includes(terme) ||
      normaliser(f.etablissement).includes(terme) ||
      normaliser(f.description).includes(terme) ||
      normaliser(f.niveau).includes(terme);

    return niveauOk && etabOk && filiereOk && rechercheOk;
  });
}


// ─────────────────────────────────────────
// 6. RENDU DE LA GRILLE
// ─────────────────────────────────────────
function rendreGrille() {
  var liste = filtrerFiches(AppState.fiches);
  var total = liste.length;

  DOM.countBadge.textContent = total + ' fiche' + (total !== 1 ? 's' : '');

  if (total === 0) {
    var msg = AppState.recherche
      ? 'Aucune fiche pour "<strong>' + DOM.searchInput.value + '</strong>".<br><a href="#demande">Faire une demande ?</a>'
      : 'Aucune fiche pour ce filtre.<br><a href="#demande">Faire une demande ?</a>';
    DOM.fichesGrid.innerHTML = '<div class="state-empty"><div class="state-icon">📭</div><p>' + msg + '</p></div>';
    return;
  }

  DOM.fichesGrid.innerHTML = liste.map(construireCarte).join('');
  DOM.fichesGrid.style.opacity   = '1';
  DOM.fichesGrid.style.transform = 'none';
}

function construireCarte(f) {
  var date = new Date(f.date_ajout).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
  var descHTML = f.description
    ? '<div class="fiche-card__desc">' + f.description + '</div>' : '';
  var etabHTML = f.etablissement
    ? '<span class="badge badge--subject">' + f.etablissement + '</span>' : '';
  var filiereHTML = f.filiere
    ? '<span class="badge badge--subject">' + f.filiere + '</span>' : '';
  var cible = f.url.startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : '';

  return '<a class="fiche-card" href="' + f.url + '" ' + cible + '>' +
    '<div class="fiche-card__badges">' +
      '<span class="badge badge--level">' + f.niveau + '</span>' +
      etabHTML + filiereHTML +
    '</div>' +
    '<div class="fiche-card__title">' + f.titre + '</div>' +
    descHTML +
    '<div class="fiche-card__footer">' +
      '<span class="fiche-card__date">' + date + '</span>' +
      '<span class="fiche-card__cta">Ouvrir →</span>' +
    '</div>' +
  '</a>';
}


// ─────────────────────────────────────────
// 7. FILTRES
// ─────────────────────────────────────────
function filtrerParNiveau(btn) {
  document.querySelectorAll('[data-niveau]').forEach(function(b) {
    b.classList.remove('filter-btn--active');
  });
  btn.classList.add('filter-btn--active');
  AppState.niveau = btn.dataset.niveau;
  rendreGrille();
}

function filtrerParEtab(btn) {
  document.querySelectorAll('[data-etab]').forEach(function(b) {
    b.classList.remove('filter-btn--active');
  });
  btn.classList.add('filter-btn--active');
  AppState.etab = btn.dataset.etab;
  rendreGrille();
}

function filtrerParFiliere(btn) {
  document.querySelectorAll('[data-filiere]').forEach(function(b) {
    b.classList.remove('filter-btn--active');
  });
  btn.classList.add('filter-btn--active');
  AppState.filiere = btn.dataset.filiere;
  rendreGrille();
}

window.filtrerParNiveau  = filtrerParNiveau;
window.filtrerParEtab    = filtrerParEtab;
window.filtrerParFiliere = filtrerParFiliere;


// ─────────────────────────────────────────
// 8. RECHERCHE
// ─────────────────────────────────────────
function effectuerRecherche(val) {
  AppState.recherche = (val !== undefined ? val : DOM.searchInput.value).trim();
  rendreGrille();
}

DOM.searchInput.addEventListener('input', function() {
  effectuerRecherche(DOM.searchInput.value);
});

DOM.searchInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') effectuerRecherche();
});

window.effectuerRecherche = effectuerRecherche;


// ─────────────────────────────────────────
// 9. AFFICHAGE DYNAMIQUE "AUTRE ÉTABLISSEMENT / FILIÈRE"
// ─────────────────────────────────────────
DOM.reqEtablissement.addEventListener('change', function() {
  DOM.autreEtabGroup.style.display = this.value === 'autre' ? 'flex' : 'none';
  if (this.value !== 'autre') DOM.reqAutreEtab.value = '';
});

DOM.reqFiliere.addEventListener('change', function() {
  DOM.autreFiliereGroup.style.display = this.value === 'autre' ? 'flex' : 'none';
  if (this.value !== 'autre') DOM.reqAutreFiliere.value = '';
});


// ─────────────────────────────────────────
// 10. UPLOAD FICHIER VERS SUPABASE STORAGE
// ─────────────────────────────────────────
async function uploaderFichier(fichier) {
  if (!fichier) return null;

  // Limite 10 Mo
  if (fichier.size > 10 * 1024 * 1024) {
    throw new Error('Le fichier dépasse 10 Mo. Choisis un fichier plus léger.');
  }

  var db = window.KlaroDB.db;

  // Nom unique : timestamp + nom original nettoyé
  var nomNettoye = fichier.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  var cheminFichier = Date.now() + '_' + nomNettoye;

  // Affiche la barre de progression
  DOM.uploadProgress.style.display = 'block';
  DOM.uploadBar.style.width = '20%';
  DOM.uploadPct.textContent = '20%';

  var uploadResult = await db.storage
    .from('cours-documents')
    .upload(cheminFichier, fichier, { cacheControl: '3600', upsert: false });

  DOM.uploadBar.style.width = '100%';
  DOM.uploadPct.textContent = '100%';

  if (uploadResult.error) {
    DOM.uploadProgress.style.display = 'none';
    throw new Error('Erreur upload : ' + uploadResult.error.message);
  }

  DOM.uploadProgress.style.display = 'none';
  return uploadResult.data.path;
}


// ─────────────────────────────────────────
// 11. FORMULAIRE DE DEMANDE
// ─────────────────────────────────────────
async function envoyerDemande(e) {
  e.preventDefault();

  // Récupère les valeurs
  var nom          = DOM.reqNom.value.trim();
  var matiere      = DOM.reqMatiere.value.trim();
  var etabVal      = DOM.reqEtablissement.value;
  var etablissement = etabVal === 'autre'
    ? DOM.reqAutreEtab.value.trim()
    : etabVal;
  var filiereVal   = DOM.reqFiliere.value;
  var filiere      = filiereVal === 'autre'
    ? DOM.reqAutreFiliere.value.trim()
    : filiereVal;

  // Validation
  if (!nom) { afficherFeedback('error', 'Merci de renseigner ton nom.'); return; }
  if (!etablissement) { afficherFeedback('error', 'Merci de renseigner ton établissement.'); return; }
  if (!filiere) { afficherFeedback('error', 'Merci de renseigner ta filière.'); return; }
  if (!matiere) { afficherFeedback('error', 'Merci de renseigner la matière.'); return; }

  if (!window.KlaroDB || !window.KlaroDB.pret) {
    afficherFeedback('error', 'Connexion impossible. Recharge la page.');
    return;
  }

  DOM.submitBtn.disabled      = true;
  DOM.submitLabel.textContent = 'Envoi en cours…';
  cacherFeedback();

  // Upload du fichier si présent
  var fichierUrl = null;
  var fichierInput = DOM.reqFichier.files[0];
  if (fichierInput) {
    try {
      fichierUrl = await uploaderFichier(fichierInput);
    } catch (err) {
      afficherFeedback('error', err.message);
      DOM.submitBtn.disabled      = false;
      DOM.submitLabel.textContent = 'Envoyer la demande';
      return;
    }
  }

  // Envoi dans Supabase
  var db     = window.KlaroDB.db;
  var TABLES = window.KlaroDB.TABLES;

  var donnees = {
    nom:          nom,
    email:        DOM.reqEmail.value.trim() || null,
    etablissement: etablissement || null,
    filiere:      filiere || null,
    matiere:      matiere,
    niveau:       DOM.reqNiveau.value || null,
    description:  DOM.reqDesc.value.trim() || null,
    fichier_url:  fichierUrl,
    statut:       'en_attente'
  };

  var result = await db.from(TABLES.DEMANDES).insert([donnees]);

  if (result.error) {
    afficherFeedback('error', 'Une erreur est survenue. Réessaie dans quelques instants.');
    console.error('[index.js] Erreur demande :', result.error);
  } else {
    afficherFeedback('success', '✓ Demande envoyée ! Notre équipe Klaro s\'en occupe rapidement.');
    DOM.reqForm.reset();
    DOM.autreEtabGroup.style.display    = 'none';
    DOM.autreFiliereGroup.style.display = 'none';
  }

  DOM.submitBtn.disabled      = false;
  DOM.submitLabel.textContent = 'Envoyer la demande';
}

function afficherFeedback(type, msg) {
  DOM.feedbackMsg.textContent = msg;
  DOM.feedbackMsg.className   = 'feedback feedback--show feedback--' + type;
}
function cacherFeedback() {
  DOM.feedbackMsg.textContent = '';
  DOM.feedbackMsg.className   = 'feedback';
}

if (DOM.reqForm) {
  DOM.reqForm.addEventListener('submit', envoyerDemande);
}


// ─────────────────────────────────────────
// 12. ANIMATIONS SCROLL
// ─────────────────────────────────────────
function initialiserAnimations() {
  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('.fade-up').forEach(function(el) {
    obs.observe(el);
  });
}


// ─────────────────────────────────────────
// 13. INITIALISATION
// ─────────────────────────────────────────
async function initialiser() {
  await chargerFiches();
  initialiserAnimations();
}

document.addEventListener('DOMContentLoaded', initialiser);
