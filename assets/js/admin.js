// KLARO — admin.js
// Logique du tableau de bord administrateur

// ─────────────────────────────────────────
// 1. RÉFÉRENCES DOM
// ─────────────────────────────────────────
var DOM = {
  // Gate
  gate:       document.getElementById('gate'),
  emailInput: document.getElementById('emailInput'),
  pwdInput:   document.getElementById('pwdInput'),
  gateBtn:    document.getElementById('gateBtn'),
  gateError:  document.getElementById('gateErr'),
  // App
  app:        document.getElementById('app'),
  // Topbar
  pendingBadge: document.getElementById('pendingBadge'),
  // Stats
  statFiches:   document.getElementById('st-fiches'),
  statDemandes: document.getElementById('st-demandes'),
  statPending:  document.getElementById('st-pending'),
  statDone:     document.getElementById('st-done'),
  // Demandes
  demandesTbody: document.getElementById('demandesTbody'),
  tabDot:        document.getElementById('tabDot'),
  // Formulaire publication
  pubForm:           document.getElementById('pubForm'),
  pubTitre:          document.getElementById('p_titre'),
  pubEtablissement:  document.getElementById('p_etablissement'),
  pubAutreEtabGroup: document.getElementById('pubAutreEtabGroup'),
  pubAutreEtab:      document.getElementById('p_autre_etab'),
  pubFiliere:        document.getElementById('p_filiere'),
  pubAutreFiliereGroup: document.getElementById('pubAutreFiliereGroup'),
  pubAutreFiliere:   document.getElementById('p_autre_filiere'),
  pubMatiere:        document.getElementById('p_matiere'),
  pubNiveau:         document.getElementById('p_niveau'),
  pubDesc:           document.getElementById('p_desc'),
  pubUrl:            document.getElementById('p_url'),
  pubBtn:            document.getElementById('pubBtn'),
  pubLabel:          document.getElementById('pubLabel'),
  pubMsg:            document.getElementById('pubMsg'),
  // Gestion fiches
  fichesTbody: document.getElementById('fichesTbody')
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
function afficherOnglet(id, btn) {
  document.querySelectorAll('.tab-content').forEach(function(t) {
    t.classList.remove('tab-content--active');
  });
  document.querySelectorAll('.tab-btn').forEach(function(b) {
    b.classList.remove('tab-btn--active');
  });
  document.getElementById('tab-' + id).classList.add('tab-content--active');
  if (btn) btn.classList.add('tab-btn--active');
  if (id === 'gerer') chargerGestionFiches();
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

  // Lien vers le fichier uploadé
  var fichierHTML = '—';
  if (d.fichier_url) {
    var db       = window.KlaroDB.db;
    var urlPublic = db.storage.from('cours-documents').getPublicUrl(d.fichier_url);
    fichierHTML = '<a class="cell-link" href="' + (urlPublic.data && urlPublic.data.publicUrl) + '" target="_blank" rel="noopener">Voir ↗</a>';
  }

  var ecoleFiliere = [d.etablissement, d.filiere].filter(Boolean).join(' · ') || '—';
  var emailHTML    = d.email ? '<div class="cell-secondary">' + d.email + '</div>' : '';

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
// 7. AFFICHAGE DYNAMIQUE "AUTRE" DANS LE FORMULAIRE
// ─────────────────────────────────────────
if (DOM.pubEtablissement) {
  DOM.pubEtablissement.addEventListener('change', function() {
    DOM.pubAutreEtabGroup.style.display = this.value === 'autre' ? 'flex' : 'none';
  });
}
if (DOM.pubFiliere) {
  DOM.pubFiliere.addEventListener('change', function() {
    DOM.pubAutreFiliereGroup.style.display = this.value === 'autre' ? 'flex' : 'none';
  });
}


// ─────────────────────────────────────────
// 8. PUBLICATION D'UNE FICHE
// ─────────────────────────────────────────
async function publierFiche(e) {
  e.preventDefault();

  var etabVal  = DOM.pubEtablissement.value;
  var etab     = etabVal === 'autre' ? DOM.pubAutreEtab.value.trim() : etabVal;
  var filVal   = DOM.pubFiliere.value;
  var filiere  = filVal === 'autre' ? DOM.pubAutreFiliere.value.trim() : filVal;

  DOM.pubBtn.disabled      = true;
  DOM.pubLabel.textContent = 'Publication…';
  cacherMsgPublication();

  var db     = window.KlaroDB.db;
  var TABLES = window.KlaroDB.TABLES;

  var result = await db.from(TABLES.FICHES).insert([{
    titre:         DOM.pubTitre.value.trim(),
    matiere:       DOM.pubMatiere.value.trim(),
    niveau:        DOM.pubNiveau.value,
    etablissement: etab   || null,
    filiere:       filiere || null,
    description:   DOM.pubDesc.value.trim() || null,
    url:           DOM.pubUrl.value.trim()
  }]);

  if (result.error) {
    afficherMsgPublication('error', 'Erreur : ' + result.error.message);
    console.error('[admin.js] Erreur publication :', result.error);
  } else {
    afficherMsgPublication('success', '✓ Fiche publiée ! Elle est maintenant visible sur le site.');
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
    DOM.fichesTbody.innerHTML = '<tr><td colspan="7" class="table-empty"><p>Erreur.</p></td></tr>';
    return;
  }

  if (!result.data.length) {
    DOM.fichesTbody.innerHTML = '<tr><td colspan="7" class="table-empty"><p>Aucune fiche publiée.</p></td></tr>';
    return;
  }

  DOM.fichesTbody.innerHTML = result.data.map(construireLigneFiche).join('');
}

function construireLigneFiche(f) {
  var date = new Date(f.date_ajout).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
  var ecoleFiliere = [f.etablissement, f.filiere].filter(Boolean).join(' · ') || '—';

  return '<tr>' +
    '<td><div class="cell-primary" style="max-width:200px;">' + f.titre + '</div></td>' +
    '<td>' + ecoleFiliere + '</td>' +
    '<td>' + f.matiere + '</td>' +
    '<td><span class="pill pill--pending">' + f.niveau + '</span></td>' +
    '<td class="cell-date">' + date + '</td>' +
    '<td><a class="cell-link" href="' + f.url + '" target="_blank" rel="noopener">Ouvrir ↗</a></td>' +
    '<td><button class="btn btn--sm btn--danger" onclick="retirerFiche(\'' + f.id + '\')">✕ Retirer</button></td>' +
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


// ─────────────────────────────────────────
// 10. INITIALISATION
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  verifierSession();
  console.log('[admin.js] Interface prête.');
});
