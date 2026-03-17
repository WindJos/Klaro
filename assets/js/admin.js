// KLARO — admin.js
// Logique du tableau de bord administrateur
//
// Sections :
//  1.  Références DOM
//  2.  Authentification Supabase Auth
//  3.  Initialisation du dashboard
//  4.  Statistiques
//  5.  Onglets
//  6.  Demandes
//  7.  Affichage dynamique "Autre" formulaire fiche
//  8.  Publication d'une fiche
//  9.  Gestion des fiches existantes
// ─────────────────────────────────────────────────
// ★ 10. Chargement de la liste des fiches (select)  ← NOUVEAU
// ★ 11. Cours originaux — upload + liste            ← NOUVEAU
// ★ 12. Devoirs & Corrections — upload + liste      ← NOUVEAU
// ─────────────────────────────────────────────────
// 13. Initialisation


// ─────────────────────────────────────────
// 1. RÉFÉRENCES DOM
// ─────────────────────────────────────────
var DOM = {

  // ── Gate ──
  gate:       document.getElementById('gate'),
  emailInput: document.getElementById('emailInput'),
  pwdInput:   document.getElementById('pwdInput'),
  gateBtn:    document.getElementById('gateBtn'),
  gateError:  document.getElementById('gateErr'),

  // ── App ──
  app: document.getElementById('app'),

  // ── Topbar ──
  pendingBadge: document.getElementById('pendingBadge'),

  // ── Stats ──
  statFiches:   document.getElementById('st-fiches'),
  statDemandes: document.getElementById('st-demandes'),
  statPending:  document.getElementById('st-pending'),
  statDone:     document.getElementById('st-done'),

  // ── Demandes ──
  demandesTbody: document.getElementById('demandesTbody'),
  tabDot:        document.getElementById('tabDot'),

  // ── Formulaire publication fiche ──
  pubForm:              document.getElementById('pubForm'),
  pubTitre:             document.getElementById('p_titre'),
  pubEtablissement:     document.getElementById('p_etablissement'),
  pubAutreEtabGroup:    document.getElementById('pubAutreEtabGroup'),
  pubAutreEtab:         document.getElementById('p_autre_etab'),
  pubFiliere:           document.getElementById('p_filiere'),
  pubAutreFiliereGroup: document.getElementById('pubAutreFiliereGroup'),
  pubAutreFiliere:      document.getElementById('p_autre_filiere'),
  pubMatiere:           document.getElementById('p_matiere'),
  pubNiveau:            document.getElementById('p_niveau'),
  pubDesc:              document.getElementById('p_desc'),
  pubUrl:               document.getElementById('p_url'),
  pubBtn:               document.getElementById('pubBtn'),
  pubLabel:             document.getElementById('pubLabel'),
  pubMsg:               document.getElementById('pubMsg'),

  // ── Gestion fiches ──
  fichesTbody: document.getElementById('fichesTbody'),

  // ────────────────────────────────────────
  // ★ NOUVEAU — Cours originaux
  // ────────────────────────────────────────
  coursForm:           document.getElementById('coursForm'),
  coursFicheId:        document.getElementById('cours_fiche_id'),
  coursTitre:          document.getElementById('cours_titre'),
  coursFichier:        document.getElementById('cours_fichier'),
  coursUploadProgress: document.getElementById('coursUploadProgress'),
  coursUploadPct:      document.getElementById('coursUploadPct'),
  coursUploadBar:      document.getElementById('coursUploadBar'),
  coursBtn:            document.getElementById('coursBtn'),
  coursLabel:          document.getElementById('coursLabel'),
  coursMsg:            document.getElementById('coursMsg'),
  coursTbody:          document.getElementById('coursTbody'),

  // ────────────────────────────────────────
  // ★ NOUVEAU — Devoirs & Corrections
  // ────────────────────────────────────────
  devoirsForm:           document.getElementById('devoirsForm'),
  devoirFicheId:         document.getElementById('devoir_fiche_id'),
  devoirTitre:           document.getElementById('devoir_titre'),
  devoirAnnee:           document.getElementById('devoir_annee'),
  devoirSujets:          document.getElementById('devoir_sujets'),
  devoirCorrections:     document.getElementById('devoir_corrections'),
  devoirsUploadProgress: document.getElementById('devoirsUploadProgress'),
  devoirsUploadPct:      document.getElementById('devoirsUploadPct'),
  devoirsUploadBar:      document.getElementById('devoirsUploadBar'),
  devoirsBtn:            document.getElementById('devoirsBtn'),
  devoirsLabel:          document.getElementById('devoirsLabel'),
  devoirsMsg:            document.getElementById('devoirsMsg'),
  devoirsTbody:          document.getElementById('devoirsTbody')
};


// ─────────────────────────────────────────
// 2. AUTHENTIFICATION SUPABASE AUTH
// ─────────────────────────────────────────
async function seConnecter() {
  var email = DOM.emailInput.value.trim();
  var mdp   = DOM.pwdInput.value;

  if (!email || !mdp) {
    afficherErreurGate('Veuillez remplir tous les champs.');
    return;
  }

  DOM.gateBtn.disabled    = true;
  DOM.gateBtn.textContent = 'Connexion…';
  cacherErreurGate();

  var result = await window.KlaroDB.db.auth.signInWithPassword({
    email: email, password: mdp
  });

  DOM.gateBtn.disabled    = false;
  DOM.gateBtn.textContent = 'Accéder →';

  if (result.error) {
    afficherErreurGate('Email ou mot de passe incorrect.');
    DOM.pwdInput.value = '';
    DOM.pwdInput.focus();
    return;
  }

  ouvrirDashboard();
}

async function seDeconnecter() {
  await window.KlaroDB.db.auth.signOut();
  DOM.app.style.display  = 'none';
  DOM.gate.style.display = 'flex';
  DOM.emailInput.value   = '';
  DOM.pwdInput.value     = '';
  cacherErreurGate();
  DOM.emailInput.focus();
}

async function verifierSession() {
  if (!window.KlaroDB || !window.KlaroDB.pret) {
    DOM.emailInput.focus();
    return;
  }
  var result = await window.KlaroDB.db.auth.getSession();
  if (result.data.session) {
    ouvrirDashboard();
  } else {
    DOM.emailInput.focus();
  }
}

function ouvrirDashboard() {
  DOM.gate.style.display = 'none';
  DOM.app.style.display  = 'flex';
  initialiserDashboard();
}

function afficherErreurGate(msg) {
  DOM.gateError.textContent   = msg;
  DOM.gateError.style.display = 'block';
}
function cacherErreurGate() {
  DOM.gateError.textContent   = '';
  DOM.gateError.style.display = 'none';
}

[DOM.emailInput, DOM.pwdInput].forEach(function(c) {
  if (c) c.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') seConnecter();
  });
});

window.seConnecter   = seConnecter;
window.seDeconnecter = seDeconnecter;


// ─────────────────────────────────────────
// 3. INITIALISATION DU DASHBOARD
// ─────────────────────────────────────────
async function initialiserDashboard() {
  await Promise.all([chargerStats(), chargerDemandes()]);
}


// ─────────────────────────────────────────
// 4. STATISTIQUES
// ─────────────────────────────────────────
async function chargerStats() {
  var db     = window.KlaroDB.db;
  var TABLES = window.KlaroDB.TABLES;

  var results = await Promise.all([
    db.from(TABLES.FICHES).select('*',   { count: 'exact', head: true }),
    db.from(TABLES.DEMANDES).select('*', { count: 'exact', head: true }),
    db.from(TABLES.DEMANDES).select('*', { count: 'exact', head: true }).eq('statut', 'en_attente'),
    db.from(TABLES.DEMANDES).select('*', { count: 'exact', head: true }).eq('statut', 'traitee')
  ]);

  DOM.statFiches.textContent   = results[0].count ?? 0;
  DOM.statDemandes.textContent = results[1].count ?? 0;
  DOM.statPending.textContent  = results[2].count ?? 0;
  DOM.statDone.textContent     = results[3].count ?? 0;

  var nPending = results[2].count || 0;
  if (nPending > 0) {
    DOM.pendingBadge.textContent   = nPending;
    DOM.pendingBadge.style.display = 'inline-block';
    DOM.tabDot.style.display       = 'inline-block';
  } else {
    DOM.pendingBadge.style.display = 'none';
    DOM.tabDot.style.display       = 'none';
  }
}


// ─────────────────────────────────────────
// 5. ONGLETS
// ─────────────────────────────────────────
// ★ MODIFIÉ : ajout des cas 'cours' et 'devoirs'
//   pour déclencher le chargement au clic sur l'onglet.
// ─────────────────────────────────────────
function afficherOnglet(id, btn) {
  document.querySelectorAll('.tab-content').forEach(function(t) {
    t.classList.remove('tab-content--active');
  });
  document.querySelectorAll('.tab-btn').forEach(function(b) {
    b.classList.remove('tab-btn--active');
  });
  document.getElementById('tab-' + id).classList.add('tab-content--active');
  if (btn) btn.classList.add('tab-btn--active');

  // Chargements spécifiques à chaque onglet
  if (id === 'gerer')   chargerGestionFiches();
  if (id === 'cours')   chargerCours();    // ★ NOUVEAU
  if (id === 'devoirs') chargerDevoirs();  // ★ NOUVEAU
}

window.afficherOnglet = afficherOnglet;


// ─────────────────────────────────────────
// 6. DEMANDES
// ─────────────────────────────────────────
async function chargerDemandes() {
  var db     = window.KlaroDB.db;
  var TABLES = window.KlaroDB.TABLES;

  var result = await db
    .from(TABLES.DEMANDES)
    .select('*')
    .order('date_demande', { ascending: false });

  if (result.error || !result.data) {
    DOM.demandesTbody.innerHTML = '<tr><td colspan="8" class="table-empty"><p>Erreur de chargement.</p></td></tr>';
    return;
  }

  if (!result.data.length) {
    DOM.demandesTbody.innerHTML = '<tr><td colspan="8" class="table-empty"><p>Aucune demande pour le moment.</p></td></tr>';
    return;
  }

  DOM.demandesTbody.innerHTML = result.data.map(construireLigneDemande).join('');
}

function construireLigneDemande(d) {
  var date = new Date(d.date_demande).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
  var pill = d.statut === 'traitee'
    ? '<span class="pill pill--done">Traitée</span>'
    : '<span class="pill pill--pending">En attente</span>';

  var actions = d.statut === 'en_attente'
    ? '<button class="btn btn--sm btn--success" onclick="marquerTraitee(\'' + d.id + '\')">✓ Traiter</button> ' +
      '<button class="btn btn--sm btn--danger"  onclick="supprimerDemande(\'' + d.id + '\')">✕</button>'
    : '<button class="btn btn--sm btn--danger" onclick="supprimerDemande(\'' + d.id + '\')">✕ Suppr.</button>';

  var fichierHTML = '—';
  if (d.fichier_url) {
    var urlPublic = window.KlaroDB.db.storage
      .from('cours-documents').getPublicUrl(d.fichier_url);
    fichierHTML = '<a class="cell-link" href="' +
      (urlPublic.data && urlPublic.data.publicUrl) +
      '" target="_blank" rel="noopener">Voir ↗</a>';
  }

  var ecoleFiliere = [d.etablissement, d.filiere].filter(Boolean).join(' · ') || '—';
  var emailHTML    = d.email
    ? '<div class="cell-secondary">' + d.email + '</div>' : '';

  return '<tr>' +
    '<td><div class="cell-primary">' + d.nom + '</div>' + emailHTML + '</td>' +
    '<td>' + ecoleFiliere + '</td>' +
    '<td>' + d.matiere + '</td>' +
    '<td>' + (d.niveau || '—') + '</td>' +
    '<td>' + fichierHTML + '</td>' +
    '<td class="cell-date">' + date + '</td>' +
    '<td>' + pill + '</td>' +
    '<td><div class="btn-actions">' + actions + '</div></td>' +
  '</tr>';
}

async function marquerTraitee(id) {
  var db     = window.KlaroDB.db;
  var TABLES = window.KlaroDB.TABLES;
  await db.from(TABLES.DEMANDES).update({ statut: 'traitee' }).eq('id', id);
  await Promise.all([chargerStats(), chargerDemandes()]);
}

async function supprimerDemande(id) {
  if (!confirm('Supprimer définitivement cette demande ?')) return;
  var db     = window.KlaroDB.db;
  var TABLES = window.KlaroDB.TABLES;
  await db.from(TABLES.DEMANDES).delete().eq('id', id);
  await Promise.all([chargerStats(), chargerDemandes()]);
}

window.marquerTraitee   = marquerTraitee;
window.supprimerDemande = supprimerDemande;


// ─────────────────────────────────────────
// 7. AFFICHAGE DYNAMIQUE "AUTRE" FORMULAIRE FICHE
// ─────────────────────────────────────────
if (DOM.pubEtablissement) {
  DOM.pubEtablissement.addEventListener('change', function() {
    DOM.pubAutreEtabGroup.style.display =
      this.value === 'autre' ? 'flex' : 'none';
  });
}
if (DOM.pubFiliere) {
  DOM.pubFiliere.addEventListener('change', function() {
    DOM.pubAutreFiliereGroup.style.display =
      this.value === 'autre' ? 'flex' : 'none';
  });
}


// ─────────────────────────────────────────
// 8. PUBLICATION D'UNE FICHE
// ─────────────────────────────────────────
async function publierFiche(e) {
  e.preventDefault();

  var etabVal = DOM.pubEtablissement.value;
  var etab    = etabVal === 'autre' ? DOM.pubAutreEtab.value.trim() : etabVal;
  var filVal  = DOM.pubFiliere.value;
  var filiere = filVal  === 'autre' ? DOM.pubAutreFiliere.value.trim() : filVal;

  DOM.pubBtn.disabled      = true;
  DOM.pubLabel.textContent = 'Publication…';
  cacherMsgPublication();

  var db     = window.KlaroDB.db;
  var TABLES = window.KlaroDB.TABLES;

  var result = await db.from(TABLES.FICHES).insert([{
    titre:         DOM.pubTitre.value.trim(),
    matiere:       DOM.pubMatiere.value.trim(),
    niveau:        DOM.pubNiveau.value,
    etablissement: etab    || null,
    filiere:       filiere || null,
    description:   DOM.pubDesc.value.trim() || null,
    url:           DOM.pubUrl.value.trim()
  }]);

  if (result.error) {
    afficherMsgPublication('error', 'Erreur : ' + result.error.message);
  } else {
    afficherMsgPublication('success',
      '✓ Fiche publiée ! Elle est maintenant visible sur le site.');
    DOM.pubForm.reset();
    DOM.pubAutreEtabGroup.style.display    = 'none';
    DOM.pubAutreFiliereGroup.style.display = 'none';
    await chargerStats();
  }

  DOM.pubBtn.disabled      = false;
  DOM.pubLabel.textContent = 'Publier la fiche';
}

function afficherMsgPublication(type, msg) {
  DOM.pubMsg.textContent = msg;
  DOM.pubMsg.className   = 'feedback feedback--show feedback--' + type;
}
function cacherMsgPublication() {
  DOM.pubMsg.textContent = '';
  DOM.pubMsg.className   = 'feedback';
}

if (DOM.pubForm) {
  DOM.pubForm.addEventListener('submit', publierFiche);
}


// ─────────────────────────────────────────
// 9. GESTION DES FICHES EXISTANTES
// ─────────────────────────────────────────
async function chargerGestionFiches() {
  var db     = window.KlaroDB.db;
  var TABLES = window.KlaroDB.TABLES;

  var result = await db
    .from(TABLES.FICHES)
    .select('*')
    .order('date_ajout', { ascending: false });

  if (result.error || !result.data) {
    DOM.fichesTbody.innerHTML =
      '<tr><td colspan="7" class="table-empty"><p>Erreur.</p></td></tr>';
    return;
  }

  if (!result.data.length) {
    DOM.fichesTbody.innerHTML =
      '<tr><td colspan="7" class="table-empty"><p>Aucune fiche publiée.</p></td></tr>';
    return;
  }

  DOM.fichesTbody.innerHTML = result.data.map(construireLigneFiche).join('');
}

function construireLigneFiche(f) {
  var date = new Date(f.date_ajout).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
  var ecoleFiliere =
    [f.etablissement, f.filiere].filter(Boolean).join(' · ') || '—';

  return '<tr>' +
    '<td><div class="cell-primary" style="max-width:200px;">' + f.titre + '</div></td>' +
    '<td>' + ecoleFiliere + '</td>' +
    '<td>' + f.matiere + '</td>' +
    '<td><span class="pill pill--pending">' + f.niveau + '</span></td>' +
    '<td class="cell-date">' + date + '</td>' +
    '<td><a class="cell-link" href="' + f.url +
      '" target="_blank" rel="noopener">Ouvrir ↗</a></td>' +
    '<td><button class="btn btn--sm btn--danger" ' +
      'onclick="retirerFiche(\'' + f.id + '\')">✕ Retirer</button></td>' +
  '</tr>';
}

async function retirerFiche(id) {
  if (!confirm('Retirer cette fiche du site ?')) return;
  var db     = window.KlaroDB.db;
  var TABLES = window.KlaroDB.TABLES;
  await db.from(TABLES.FICHES).delete().eq('id', id);
  await Promise.all([chargerStats(), chargerGestionFiches()]);
}

window.retirerFiche         = retirerFiche;
window.chargerGestionFiches = chargerGestionFiches;


// ═════════════════════════════════════════════════════════════
// ★★★ NOUVELLE PARTIE — Sections 10, 11 et 12 ★★★
// Tout ce qui suit est nouveau et ne modifie rien au-dessus.
// ═════════════════════════════════════════════════════════════


// ─────────────────────────────────────────
// ★ 10. CHARGEMENT DE LA LISTE DES FICHES
//        dans les menus déroulants des onglets
//        "Cours originaux" et "Devoirs"
// ─────────────────────────────────────────
//
// Cette fonction remplit les deux <select> (cours_fiche_id
// et devoir_fiche_id) avec toutes les fiches existantes.
// Elle est appelée automatiquement quand l'admin ouvre
// l'un des deux onglets concernés.
//
async function chargerListeFiches(selectEl) {
  // selectEl : l'élément <select> HTML à remplir

  if (!selectEl) return;

  var db     = window.KlaroDB.db;
  var TABLES = window.KlaroDB.TABLES;

  // On récupère uniquement l'id et le titre — suffisant
  // pour construire les options du select
  var result = await db
    .from(TABLES.FICHES)
    .select('id, titre, niveau, etablissement')
    .order('titre', { ascending: true });

  if (result.error || !result.data || !result.data.length) {
    selectEl.innerHTML =
      '<option value="">Aucune fiche disponible</option>';
    return;
  }

  // Construit les options : titre + niveau + école pour
  // aider l'admin à identifier la bonne fiche rapidement
  selectEl.innerHTML = '<option value="">Sélectionner une fiche…</option>' +
    result.data.map(function(f) {
      var label = f.titre;
      var detail = [f.niveau, f.etablissement].filter(Boolean).join(' · ');
      if (detail) label += ' (' + detail + ')';
      return '<option value="' + f.id + '">' + label + '</option>';
    }).join('');
}


// ─────────────────────────────────────────
// ★ 11. COURS ORIGINAUX
//        Upload d'un fichier PDF/Word et
//        affichage de la liste des cours publiés
// ─────────────────────────────────────────

// ── 11a. Charger l'onglet cours ──────────
//
// Appelée quand l'admin clique sur l'onglet "Cours originaux".
// Lance en parallèle :
//   - le remplissage du select des fiches
//   - le chargement de la liste des cours déjà publiés
//
async function chargerCours() {
  await Promise.all([
    chargerListeFiches(DOM.coursFicheId),
    chargerListeCours()
  ]);
}

window.chargerCours = chargerCours;


// ── 11b. Upload du fichier cours ─────────
//
// Uploade le fichier PDF/Word dans le bucket
// Supabase Storage "cours-originaux".
//
// Nom du fichier dans le bucket :
//   timestamp_nomfichier.pdf
//   (le timestamp évite les doublons de nom)
//
// Retourne le chemin du fichier dans le bucket.
//
async function uploaderFichierCours(fichier) {

  // Vérification taille : max 20 Mo
  if (fichier.size > 20 * 1024 * 1024) {
    throw new Error('Le fichier dépasse 20 Mo.');
  }

  var db = window.KlaroDB.db;

  // Nom unique dans le bucket
  var nomNettoye = fichier.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  var chemin     = 'cours/' + Date.now() + '_' + nomNettoye;

  // Affiche la barre de progression
  DOM.coursUploadProgress.style.display = 'block';
  DOM.coursUploadBar.style.width        = '30%';
  DOM.coursUploadPct.textContent        = '30%';

  var result = await db.storage
    .from('cours-originaux')
    .upload(chemin, fichier, { cacheControl: '3600', upsert: false });

  DOM.coursUploadBar.style.width  = '100%';
  DOM.coursUploadPct.textContent  = '100%';
  DOM.coursUploadProgress.style.display = 'none';

  if (result.error) {
    throw new Error('Erreur upload : ' + result.error.message);
  }

  return result.data.path;
}


// ── 11c. Soumission du formulaire cours ──
//
// Étapes :
//   1. Valide les champs obligatoires
//   2. Uploade le fichier dans Storage
//   3. Insère un enregistrement dans cours_originaux
//      avec fiche_id, titre et fichier_url
//
async function publierCours(e) {
  e.preventDefault();

  var ficheId = DOM.coursFicheId.value;
  var titre   = DOM.coursTitre.value.trim();
  var fichier = DOM.coursFichier.files[0];

  // Validations
  if (!ficheId) {
    afficherMsg(DOM.coursMsg, 'error', 'Sélectionne la fiche concernée.');
    return;
  }
  if (!titre) {
    afficherMsg(DOM.coursMsg, 'error', 'Renseigne le titre du cours.');
    return;
  }
  if (!fichier) {
    afficherMsg(DOM.coursMsg, 'error', 'Sélectionne un fichier à uploader.');
    return;
  }

  DOM.coursBtn.disabled      = true;
  DOM.coursLabel.textContent = 'Upload en cours…';
  cacherMsg(DOM.coursMsg);

  // 1. Upload du fichier
  var fichierUrl;
  try {
    fichierUrl = await uploaderFichierCours(fichier);
  } catch (err) {
    afficherMsg(DOM.coursMsg, 'error', err.message);
    DOM.coursBtn.disabled      = false;
    DOM.coursLabel.textContent = 'Publier le cours';
    return;
  }

  // 2. Insertion dans la table cours_originaux
  var db     = window.KlaroDB.db;
  var result = await db.from('cours_originaux').insert([{
    fiche_id:    ficheId,
    titre:       titre,
    fichier_url: fichierUrl
  }]);

  if (result.error) {
    afficherMsg(DOM.coursMsg, 'error',
      'Erreur d\'enregistrement : ' + result.error.message);
  } else {
    afficherMsg(DOM.coursMsg, 'success',
      '✓ Cours publié ! Les étudiants peuvent maintenant le télécharger.');
    DOM.coursForm.reset();
    // Recharge la liste des cours publiés
    await chargerListeCours();
  }

  DOM.coursBtn.disabled      = false;
  DOM.coursLabel.textContent = 'Publier le cours';
}

if (DOM.coursForm) {
  DOM.coursForm.addEventListener('submit', publierCours);
}


// ── 11d. Chargement de la liste des cours publiés ──
//
// Affiche dans le tableau "Cours publiés" tous les cours
// existants avec un lien de téléchargement direct.
//
async function chargerListeCours() {
  if (!DOM.coursTbody) return;

  var db = window.KlaroDB.db;

  // Jointure avec fiches pour afficher le titre de la fiche
  var result = await db
    .from('cours_originaux')
    .select('*, fiches(titre, niveau)')
    .order('date_ajout', { ascending: false });

  if (result.error || !result.data) {
    DOM.coursTbody.innerHTML =
      '<tr><td colspan="5" class="table-empty"><p>Erreur de chargement.</p></td></tr>';
    return;
  }

  if (!result.data.length) {
    DOM.coursTbody.innerHTML =
      '<tr><td colspan="5" class="table-empty"><p>Aucun cours publié pour le moment.</p></td></tr>';
    return;
  }

  DOM.coursTbody.innerHTML = result.data.map(function(c) {

    var date = new Date(c.date_ajout).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric'
    });

    // Récupère l'URL publique du fichier dans Storage
    var urlResult = db.storage
      .from('cours-originaux')
      .getPublicUrl(c.fichier_url);
    var urlPublique = urlResult.data ? urlResult.data.publicUrl : '#';

    // Titre de la fiche parente (via la jointure)
    var titreFiche = c.fiches
      ? c.fiches.titre + (c.fiches.niveau ? ' (' + c.fiches.niveau + ')' : '')
      : '—';

    return '<tr>' +
      '<td>' + titreFiche + '</td>' +
      '<td><div class="cell-primary">' + c.titre + '</div></td>' +
      '<td class="cell-date">' + date + '</td>' +
      '<td><a class="cell-link" href="' + urlPublique +
        '" target="_blank" rel="noopener">Télécharger ↗</a></td>' +
      '<td><button class="btn btn--sm btn--danger" ' +
        'onclick="supprimerCours(\'' + c.id + '\', \'' + c.fichier_url + '\')">' +
        '✕ Suppr.</button></td>' +
    '</tr>';

  }).join('');
}

window.chargerListeCours = chargerListeCours;


// ── 11e. Suppression d'un cours ──────────
//
// Supprime à la fois :
//   - l'enregistrement dans la table cours_originaux
//   - le fichier dans le bucket Storage cours-originaux
//
async function supprimerCours(id, fichierUrl) {
  if (!confirm('Supprimer ce cours ? Le fichier sera définitivement supprimé.'))
    return;

  var db = window.KlaroDB.db;

  // Supprime le fichier du Storage
  await db.storage.from('cours-originaux').remove([fichierUrl]);

  // Supprime l'enregistrement en base
  await db.from('cours_originaux').delete().eq('id', id);

  await chargerListeCours();
}

window.supprimerCours = supprimerCours;


// ─────────────────────────────────────────
// ★ 12. DEVOIRS & CORRECTIONS
//        Upload d'images (sujets + corrections)
//        et affichage de la liste des devoirs publiés
// ─────────────────────────────────────────

// ── 12a. Charger l'onglet devoirs ────────
//
// Appelée quand l'admin clique sur "Devoirs & Corrections".
// Lance en parallèle :
//   - le remplissage du select des fiches
//   - le chargement de la liste des devoirs déjà publiés
//
async function chargerDevoirs() {
  await Promise.all([
    chargerListeFiches(DOM.devoirFicheId),
    chargerListeDevoirs()
  ]);
}

window.chargerDevoirs = chargerDevoirs;


// ── 12b. Upload d'un tableau d'images ────
//
// Uploade plusieurs images dans le bucket "devoirs-images".
// Reçoit un FileList (depuis un input[type=file][multiple])
// et un préfixe de dossier ('sujets' ou 'corrections').
//
// Retourne un tableau JSON des chemins uploadés :
//   ["sujets/1234_page1.jpg", "sujets/1234_page2.jpg"]
//
// La barre de progression est mise à jour à chaque image.
//
async function uploaderImages(fileList, prefixe, barreEl, pctEl) {

  var db      = window.KlaroDB.db;
  var chemins = [];
  var total   = fileList.length;

  for (var i = 0; i < total; i++) {

    var fichier    = fileList[i];
    var nomNettoye = fichier.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    var chemin     = prefixe + '/' + Date.now() + '_' + i + '_' + nomNettoye;

    var result = await db.storage
      .from('devoirs-images')
      .upload(chemin, fichier, { cacheControl: '3600', upsert: false });

    if (result.error) {
      throw new Error('Erreur upload image ' + (i + 1) + ' : ' + result.error.message);
    }

    chemins.push(result.data.path);

    // Met à jour la barre : pourcentage basé sur le nombre d'images uploadées
    var pct = Math.round(((i + 1) / total) * 100);
    if (barreEl) barreEl.style.width  = pct + '%';
    if (pctEl)   pctEl.textContent    = pct + '%';
  }

  return chemins;
}


// ── 12c. Soumission du formulaire devoir ─
//
// Étapes :
//   1. Valide les champs obligatoires
//   2. Uploade les images du sujet
//   3. Uploade les images de la correction
//   4. Insère dans la table devoirs avec les tableaux
//      JSON d'URLs (sujets_urls et corrections_urls)
//
async function publierDevoir(e) {
  e.preventDefault();

  var ficheId     = DOM.devoirFicheId.value;
  var titre       = DOM.devoirTitre.value.trim();
  var annee       = DOM.devoirAnnee.value.trim();
  var filesSujets = DOM.devoirSujets.files;
  var filesCorrx  = DOM.devoirCorrections.files;

  // Validations
  if (!ficheId) {
    afficherMsg(DOM.devoirsMsg, 'error', 'Sélectionne la fiche concernée.');
    return;
  }
  if (!titre) {
    afficherMsg(DOM.devoirsMsg, 'error', 'Renseigne le titre du devoir.');
    return;
  }
  if (!filesSujets.length) {
    afficherMsg(DOM.devoirsMsg, 'error', 'Ajoute au moins une image du sujet.');
    return;
  }
  if (!filesCorrx.length) {
    afficherMsg(DOM.devoirsMsg, 'error', 'Ajoute au moins une image de la correction.');
    return;
  }

  DOM.devoirsBtn.disabled      = true;
  DOM.devoirsLabel.textContent = 'Upload en cours…';
  cacherMsg(DOM.devoirsMsg);
  DOM.devoirsUploadProgress.style.display = 'block';
  DOM.devoirsUploadBar.style.width        = '0%';
  DOM.devoirsUploadPct.textContent        = '0%';

  var sujetsUrls      = [];
  var correctionsUrls = [];

  // 1. Upload des images du sujet
  try {
    sujetsUrls = await uploaderImages(
      filesSujets,
      'sujets',
      DOM.devoirsUploadBar,
      DOM.devoirsUploadPct
    );
  } catch (err) {
    DOM.devoirsUploadProgress.style.display = 'none';
    afficherMsg(DOM.devoirsMsg, 'error', 'Sujets — ' + err.message);
    DOM.devoirsBtn.disabled      = false;
    DOM.devoirsLabel.textContent = 'Publier le devoir';
    return;
  }

  // 2. Upload des images de la correction
  try {
    correctionsUrls = await uploaderImages(
      filesCorrx,
      'corrections',
      DOM.devoirsUploadBar,
      DOM.devoirsUploadPct
    );
  } catch (err) {
    DOM.devoirsUploadProgress.style.display = 'none';
    afficherMsg(DOM.devoirsMsg, 'error', 'Corrections — ' + err.message);
    DOM.devoirsBtn.disabled      = false;
    DOM.devoirsLabel.textContent = 'Publier le devoir';
    return;
  }

  DOM.devoirsUploadProgress.style.display = 'none';

  // 3. Insertion dans la table devoirs
  var db     = window.KlaroDB.db;
  var result = await db.from('devoirs').insert([{
    fiche_id:         ficheId,
    titre:            titre,
    annee:            annee || null,
    // Stockés en JSON dans la colonne JSONB
    sujets_urls:      JSON.stringify(sujetsUrls),
    corrections_urls: JSON.stringify(correctionsUrls)
  }]);

  if (result.error) {
    afficherMsg(DOM.devoirsMsg, 'error',
      'Erreur d\'enregistrement : ' + result.error.message);
  } else {
    afficherMsg(DOM.devoirsMsg, 'success',
      '✓ Devoir publié ! ' +
      sujetsUrls.length + ' image(s) sujet · ' +
      correctionsUrls.length + ' image(s) correction.');
    DOM.devoirsForm.reset();
    await chargerListeDevoirs();
  }

  DOM.devoirsBtn.disabled      = false;
  DOM.devoirsLabel.textContent = 'Publier le devoir';
}

if (DOM.devoirsForm) {
  DOM.devoirsForm.addEventListener('submit', publierDevoir);
}


// ── 12d. Chargement de la liste des devoirs ──
//
// Affiche dans le tableau "Devoirs publiés" tous les
// devoirs existants avec le nombre d'images par type.
//
async function chargerListeDevoirs() {
  if (!DOM.devoirsTbody) return;

  var db = window.KlaroDB.db;

  var result = await db
    .from('devoirs')
    .select('*, fiches(titre, niveau)')
    .order('date_ajout', { ascending: false });

  if (result.error || !result.data) {
    DOM.devoirsTbody.innerHTML =
      '<tr><td colspan="7" class="table-empty"><p>Erreur de chargement.</p></td></tr>';
    return;
  }

  if (!result.data.length) {
    DOM.devoirsTbody.innerHTML =
      '<tr><td colspan="7" class="table-empty"><p>Aucun devoir publié pour le moment.</p></td></tr>';
    return;
  }

  DOM.devoirsTbody.innerHTML = result.data.map(function(d) {

    var date = new Date(d.date_ajout).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric'
    });

    var titreFiche = d.fiches
      ? d.fiches.titre + (d.fiches.niveau ? ' (' + d.fiches.niveau + ')' : '')
      : '—';

    // Compte le nombre d'images dans chaque tableau JSON
    var sujets      = Array.isArray(d.sujets_urls)      ? d.sujets_urls      : [];
    var corrections = Array.isArray(d.corrections_urls) ? d.corrections_urls : [];
    // Supabase peut retourner les JSONB déjà parsés ou en string
    if (typeof d.sujets_urls === 'string') {
      try { sujets = JSON.parse(d.sujets_urls); } catch(e) { sujets = []; }
    }
    if (typeof d.corrections_urls === 'string') {
      try { corrections = JSON.parse(d.corrections_urls); } catch(e) { corrections = []; }
    }

    return '<tr>' +
      '<td>' + titreFiche + '</td>' +
      '<td><div class="cell-primary">' + d.titre + '</div></td>' +
      '<td>' + (d.annee || '—') + '</td>' +
      '<td style="text-align:center;">' + sujets.length + ' image(s)</td>' +
      '<td style="text-align:center;">' + corrections.length + ' image(s)</td>' +
      '<td class="cell-date">' + date + '</td>' +
      '<td><button class="btn btn--sm btn--danger" ' +
        'onclick="supprimerDevoir(\'' + d.id + '\')">' +
        '✕ Suppr.</button></td>' +
    '</tr>';

  }).join('');
}

window.chargerListeDevoirs = chargerListeDevoirs;


// ── 12e. Suppression d'un devoir ─────────
//
// Supprime :
//   - toutes les images du sujet dans Storage
//   - toutes les images de la correction dans Storage
//   - l'enregistrement dans la table devoirs
//
async function supprimerDevoir(id) {
  if (!confirm('Supprimer ce devoir et toutes ses images ?')) return;

  var db = window.KlaroDB.db;

  // Récupère les URLs avant suppression pour pouvoir
  // nettoyer le Storage
  var result = await db
    .from('devoirs')
    .select('sujets_urls, corrections_urls')
    .eq('id', id)
    .single();

  if (!result.error && result.data) {

    var sujets      = result.data.sujets_urls      || [];
    var corrections = result.data.corrections_urls || [];

    if (typeof sujets      === 'string') { try { sujets      = JSON.parse(sujets);      } catch(e) { sujets = []; } }
    if (typeof corrections === 'string') { try { corrections = JSON.parse(corrections); } catch(e) { corrections = []; } }

    // Supprime toutes les images du bucket
    var tousLesFichiers = sujets.concat(corrections);
    if (tousLesFichiers.length) {
      await db.storage.from('devoirs-images').remove(tousLesFichiers);
    }
  }

  // Supprime l'enregistrement
  await db.from('devoirs').delete().eq('id', id);

  await chargerListeDevoirs();
}

window.supprimerDevoir = supprimerDevoir;


// ═════════════════════════════════════════
// FIN DE LA NOUVELLE PARTIE
// ═════════════════════════════════════════


// ─────────────────────────────────────────
// UTILITAIRES PARTAGÉS
// (utilisés par les 3 formulaires)
// ─────────────────────────────────────────

// Affiche un message de feedback dans un élément donné
function afficherMsg(el, type, msg) {
  if (!el) return;
  el.textContent = msg;
  el.className   = 'feedback feedback--show feedback--' + type;
}

// Masque un message de feedback
function cacherMsg(el) {
  if (!el) return;
  el.textContent = '';
  el.className   = 'feedback';
}


// ─────────────────────────────────────────
// 13. INITIALISATION
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  verifierSession();
  console.log('[admin.js] Interface prête.');
});
