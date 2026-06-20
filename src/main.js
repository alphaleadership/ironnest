import './style.css';
import { translations } from './i18n.js';
import { supabase } from './supabase.js';

// Gestion de la langue (i18n)
let currentLang = localStorage.getItem('ironnest_lang') || 'fr';

// Références des éléments statiques du DOM
const nestColSel = document.getElementById('nest-col');
const nestRowSel = document.getElementById('nest-row');
const nestSubXInput = document.getElementById('nest-sub-x');
const nestSubYInput = document.getElementById('nest-sub-y');
const nestDisplay = document.getElementById('nest-global-display');

const ordnanceTypeSel = document.getElementById('ordnance-type');
const ordnanceRecommendation = document.getElementById('ordnance-recommendation');

const bearingDisplay = document.getElementById('bearing-value');
const distanceDisplay = document.getElementById('distance-value');
const dispersionDisplay = document.getElementById('dispersion-value');
const elevationTableBody = document.querySelector('#elevation-table tbody');

const needle = document.getElementById('compass-needle');
const canvas = document.getElementById('tactical-map');
const cursorCoordDisplay = document.getElementById('coord-under-cursor');

const btnReset = document.getElementById('btn-reset');
const btnSave = document.getElementById('btn-save');
const historyBody = document.getElementById('history-body');

const mapModeNestBtn = document.getElementById('map-mode-nest');
const mapModeTargetBtn = document.getElementById('map-mode-target');

const sysTimeDisplay = document.getElementById('sys-time');
const dbStatusBadge = document.getElementById('db-status-badge');

const salvoModeSel = document.getElementById('salvo-mode');
const salvoCountInput = document.getElementById('salvo-count');
const salvoCountField = document.getElementById('salvo-count-field');
const btnAddTarget = document.getElementById('btn-add-target');
const targetsListContainer = document.getElementById('targets-list-container');

// Langue boutons
const btnLangFr = document.getElementById('lang-fr');
const btnLangEn = document.getElementById('lang-en');

// Constantes pour la grille
const COLUMNS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T'];
let mapMode = 'nest'; // 'nest' ou 'target'

// Modèle de cibles : Tableau de cibles
let targets = [{ col: 11, row: 6, subX: 0, subY: 0 }];
let activeTargetIndex = 0; // Index de la cible active pour le clic sur le canvas

// Historique des cibles
let targetHistory = [];

// Mettre à jour le badge du stockage de données
function updateDbBadge() {
  if (supabase) {
    dbStatusBadge.textContent = currentLang === 'fr' ? 'SUPABASE (EN LIGNE)' : 'SUPABASE (ONLINE)';
    dbStatusBadge.className = 'db-status-badge supabase';
  } else {
    dbStatusBadge.textContent = currentLang === 'fr' ? 'LOCALSTORAGE (HORS LIGNE)' : 'LOCALSTORAGE (OFFLINE)';
    dbStatusBadge.className = 'db-status-badge local';
  }
}

// Rendre la liste des formulaires pour les cibles
function renderTargetFields() {
  targetsListContainer.innerHTML = '';
  const t = translations[currentLang];

  targets.forEach((target, index) => {
    const rowItem = document.createElement('div');
    rowItem.className = `target-row-item ${index === activeTargetIndex ? 'active-target-row' : ''}`;
    rowItem.style.border = index === activeTargetIndex ? '1px solid var(--color-accent-amber)' : '1px solid transparent';
    rowItem.style.padding = '8px';
    rowItem.style.borderRadius = '4px';
    rowItem.style.marginBottom = '10px';
    rowItem.style.backgroundColor = index === activeTargetIndex ? 'rgba(255, 170, 0, 0.03)' : 'transparent';
    rowItem.dataset.index = index;

    // Entête de la ligne
    const header = document.createElement('div');
    header.className = 'target-row-header';

    const title = document.createElement('span');
    title.className = 'target-index-label';
    title.textContent = `${t.histTarget || 'Cible'} #${index + 1}`;

    header.appendChild(title);

    // Ajouter le bouton de suppression s'il y a plus d'une cible
    if (targets.length > 1) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-remove-target';
      deleteBtn.innerHTML = '✕';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeTarget(index);
      });
      header.appendChild(deleteBtn);
    }

    rowItem.appendChild(header);

    // Ligne d'inputs
    const inputsRow = document.createElement('div');
    inputsRow.className = 'inputs-row';

    // Sélection COL (A-T)
    const colField = document.createElement('div');
    colField.className = 'input-field';
    const colLabel = document.createElement('label');
    colLabel.textContent = t.column || 'COL';
    const colSelect = document.createElement('select');
    colSelect.className = 'custom-select';
    COLUMNS.forEach((col, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = col;
      if (idx === target.col) opt.selected = true;
      colSelect.appendChild(opt);
    });
    colSelect.addEventListener('input', (e) => {
      target.col = parseInt(e.target.value);
      calculateBalistics();
    });
    colField.appendChild(colLabel);
    colField.appendChild(colSelect);
    inputsRow.appendChild(colField);

    // Sélection LIGNE (1-10)
    const rowField = document.createElement('div');
    rowField.className = 'input-field';
    const rowLabel = document.createElement('label');
    rowLabel.textContent = t.row || 'LIGNE';
    const rowSelect = document.createElement('select');
    rowSelect.className = 'custom-select';
    for (let r = 1; r <= 10; r++) {
      const opt = document.createElement('option');
      opt.value = r;
      opt.textContent = r;
      if (r === target.row) opt.selected = true;
      rowSelect.appendChild(opt);
    }
    rowSelect.addEventListener('input', (e) => {
      target.row = parseInt(e.target.value);
      calculateBalistics();
    });
    rowField.appendChild(rowLabel);
    rowField.appendChild(rowSelect);
    inputsRow.appendChild(rowField);

    // Input SUB X
    const subXField = document.createElement('div');
    subXField.className = 'input-field';
    const subXLabel = document.createElement('label');
    subXLabel.textContent = t.subX || 'SUB X';
    const subXInput = document.createElement('input');
    subXInput.type = 'number';
    subXInput.className = 'custom-input';
    subXInput.min = 0;
    subXInput.max = 9;
    subXInput.value = target.subX;
    subXInput.addEventListener('input', (e) => {
      target.subX = Math.max(0, Math.min(9, parseInt(e.target.value) || 0));
      calculateBalistics();
    });
    subXField.appendChild(subXLabel);
    subXField.appendChild(subXInput);
    inputsRow.appendChild(subXField);

    // Input SUB Y
    const subYField = document.createElement('div');
    subYField.className = 'input-field';
    const subYLabel = document.createElement('label');
    subYLabel.textContent = t.subY || 'SUB Y';
    const subYInput = document.createElement('input');
    subYInput.type = 'number';
    subYInput.className = 'custom-input';
    subYInput.min = 0;
    subYInput.max = 9;
    subYInput.value = target.subY;
    subYInput.addEventListener('input', (e) => {
      target.subY = Math.max(0, Math.min(9, parseInt(e.target.value) || 0));
      calculateBalistics();
    });
    subYField.appendChild(subYLabel);
    subYField.appendChild(subYInput);
    inputsRow.appendChild(subYField);

    rowItem.appendChild(inputsRow);

    // Étiquette Global
    const displayLabel = document.createElement('div');
    displayLabel.className = 'computed-label';
    displayLabel.innerHTML = `GLOBAL: <span class="highlight">${formatCoord(target.col, target.row, target.subX, target.subY)}</span>`;
    rowItem.appendChild(displayLabel);

    // Activer cette cible au clic sur son bloc
    rowItem.addEventListener('click', () => {
      activeTargetIndex = index;
      // Mettre en évidence
      document.querySelectorAll('.target-row-item').forEach((item, idx) => {
        item.style.border = idx === activeTargetIndex ? '1px solid var(--color-accent-amber)' : '1px solid transparent';
        item.style.backgroundColor = idx === activeTargetIndex ? 'rgba(255, 170, 0, 0.03)' : 'transparent';
      });
      calculateBalistics();
    });

    targetsListContainer.appendChild(rowItem);
  });
}

// Ajouter une cible
function addTarget() {
  if (targets.length < 5) {
    // Copier la dernière cible ou mettre des valeurs par défaut
    const lastTarget = targets[targets.length - 1] || { col: 11, row: 6, subX: 0, subY: 0 };
    targets.push({
      col: Math.min(19, lastTarget.col + 1),
      row: lastTarget.row,
      subX: lastTarget.subX,
      subY: lastTarget.subY
    });
    activeTargetIndex = targets.length - 1;
    renderTargetFields();
    calculateBalistics();
  }
}

// Supprimer une cible
function removeTarget(index) {
  if (targets.length > 1) {
    targets.splice(index, 1);
    activeTargetIndex = Math.max(0, activeTargetIndex - 1);
    renderTargetFields();
    calculateBalistics();
  }
}

// Fonction d'application de la langue
function applyLanguage() {
  const t = translations[currentLang];
  
  // Parcourir tous les éléments ayant l'attribut data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) {
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
        if (el.placeholder) el.placeholder = t[key];
      } else {
        el.innerHTML = t[key];
      }
    }
  });

  // Mettre à jour la classe active sur les boutons de langue
  if (currentLang === 'fr') {
    btnLangFr.classList.add('active');
    btnLangEn.classList.remove('active');
    document.documentElement.lang = 'fr';
  } else {
    btnLangEn.classList.add('active');
    btnLangFr.classList.remove('active');
    document.documentElement.lang = 'en';
  }

  updateDbBadge();
  renderTargetFields();
  calculateBalistics();
  loadHistory();
}

// Mettre à jour l'horloge système
function updateClock() {
  const now = new Date();
  const format = (n) => String(n).padStart(2, '0');
  const t = translations[currentLang];
  sysTimeDisplay.textContent = `${t.systime || 'SYS.TIME'}: ${format(now.getHours())}:${format(now.getMinutes())}:${format(now.getSeconds())}`;
}
setInterval(updateClock, 1000);
updateClock();

// Helper pour formater les coordonnées globales en chaîne
function formatCoord(colIndex, rowIndex, subX, subY) {
  return `${COLUMNS[colIndex]}${rowIndex} ${subX}:${subY}`;
}

// Convertir coordonnée de grille en coordonnées métriques globales (axe X: gauche-droite, Y: bas-haut)
function getGlobalCoords(colIndex, rowIndex, subX, subY) {
  const x = colIndex * 10 + subX;
  const y = (rowIndex - 1) * 10 + subY;
  return { x, y };
}

// Calculer la distance et le bearing (azimut)
function calculateBalistics() {
  const nestCol = parseInt(nestColSel.value);
  const nestRow = parseInt(nestRowSel.value);
  const nestSubX = parseInt(nestSubXInput.value) || 0;
  const nestSubY = parseInt(nestSubYInput.value) || 0;

  // Affichage texte des coordonnées du nid
  nestDisplay.textContent = formatCoord(nestCol, nestRow, nestSubX, nestSubY);

  const nest = getGlobalCoords(nestCol, nestRow, nestSubX, nestSubY);

  // Évaluation de la dispersion
  const targetType = ordnanceTypeSel.value;
  const isSalvo = salvoModeSel.value === 'salvo';
  const salvoCount = parseInt(salvoCountInput.value) || 5;

  // Pour chaque cible, calculer les solutions
  const solutionsList = [];

  targets.forEach((targetObj, index) => {
    const target = getGlobalCoords(targetObj.col, targetObj.row, targetObj.subX, targetObj.subY);
    const dx = target.x - nest.x;
    const dy = target.y - nest.y;
    const distanceKm = Math.sqrt(dx * dx + dy * dy) * 0.1;

    let bearingRad = Math.atan2(dx, dy);
    let bearingDeg = bearingRad * (180 / Math.PI);
    if (bearingDeg < 0) bearingDeg += 360;

    let dispersion = 50;
    if (targetType === 'surface') {
      dispersion = 50 + (distanceKm * 10);
    } else if (targetType === 'bunker') {
      dispersion = 30 + (distanceKm * 5);
    } else if (targetType === 'smoke') {
      dispersion = 80 + (distanceKm * 15);
    }

    solutionsList.push({
      index,
      distanceKm,
      bearingDeg,
      dispersion,
      targetObj
    });
  });

  // Mettre à jour l'affichage de la cible ACTIVE pour la boussole et le readout principal
  const activeSol = solutionsList[activeTargetIndex] || solutionsList[0];
  if (activeSol) {
    distanceDisplay.textContent = `${activeSol.distanceKm.toFixed(2)} km`;
    bearingDisplay.textContent = `${activeSol.bearingDeg.toFixed(1)}°`;
    dispersionDisplay.textContent = `Ø ${Math.round(activeSol.dispersion * 2)}m`;
    needle.style.transform = `translate(-50%, -50%) rotate(${activeSol.bearingDeg}deg)`;
  }

  // Mettre à jour la table des élévations de toutes les cibles
  updateElevationTable(solutionsList);
  
  // Recommandation d'obus
  updateOrdnanceRecommendation();

  // Redessiner la carte
  drawMap(nest, solutionsList, isSalvo, salvoCount);
}

// Mettre à jour la table des élévations (Multi-cibles)
function updateElevationTable(solutionsList) {
  elevationTableBody.innerHTML = '';
  
  solutionsList.forEach((sol) => {
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    if (sol.index === activeTargetIndex) {
      tr.style.backgroundColor = 'rgba(255, 170, 0, 0.05)';
    }

    // Calculer les charges d'élévation
    const solutionsText = [];
    for (let c = 1; c <= 4; c++) {
      const elev = (12 / c) * sol.distanceKm;
      if (elev <= 85 && elev >= 3) {
        solutionsText.push(`${c}C: ${elev.toFixed(1)}°`);
      }
    }

    tr.innerHTML = `
      <td class="highlight-text" style="font-weight:bold;">#${sol.index + 1} (${formatCoord(sol.targetObj.col, sol.targetObj.row, sol.targetObj.subX, sol.targetObj.subY)})</td>
      <td>${sol.distanceKm.toFixed(2)} km</td>
      <td>${sol.bearingDeg.toFixed(1)}°</td>
      <td class="highlight-amber">${solutionsText.join(' | ') || 'N/A'}</td>
    `;

    // Cliquer sur une ligne de solution active cette cible
    tr.addEventListener('click', () => {
      activeTargetIndex = sol.index;
      renderTargetFields();
      calculateBalistics();
    });

    elevationTableBody.appendChild(tr);
  });
}

// Recommandations d'obus
function updateOrdnanceRecommendation() {
  const targetType = ordnanceTypeSel.value;
  const t = translations[currentLang];
  let text = '';
  if (targetType === 'surface') {
    text = t.recHe;
  } else if (targetType === 'bunker') {
    text = t.recAp;
  } else {
    text = t.recSmoke;
  }
  ordnanceRecommendation.innerHTML = text;
}

// Dessiner la carte tactique sur le Canvas (Support Multi-cibles)
function drawMap(nest, solutionsList, isSalvo, salvoCount) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Effacer
  ctx.fillStyle = '#050608';
  ctx.fillRect(0, 0, w, h);

  const cellW = w / 20;
  const cellH = h / 10;

  // Lignes verticales
  ctx.strokeStyle = 'rgba(57, 255, 20, 0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 20; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cellW, 0);
    ctx.lineTo(i * cellW, h);
    ctx.stroke();
  }

  // Lignes horizontales
  for (let j = 0; j <= 10; j++) {
    ctx.beginPath();
    ctx.moveTo(0, j * cellH);
    ctx.lineTo(w, j * cellH);
    ctx.stroke();
  }

  // Affichage des index A..T et 1..10
  ctx.fillStyle = 'rgba(57, 255, 20, 0.4)';
  ctx.font = '11px Share Tech Mono';
  for (let i = 0; i < 20; i++) {
    ctx.fillText(COLUMNS[i], i * cellW + 4, 14);
  }
  for (let j = 0; j < 10; j++) {
    ctx.fillText(String(10 - j), 4, j * cellH + cellH - 4);
  }

  const nestPixelX = (nest.x / 200) * w;
  const nestPixelY = h - (nest.y / 100) * h;

  // Dessiner chaque cible
  solutionsList.forEach((sol) => {
    const target = getGlobalCoords(sol.targetObj.col, sol.targetObj.row, sol.targetObj.subX, sol.targetObj.subY);
    const targetPixelX = (target.x / 200) * w;
    const targetPixelY = h - (target.y / 100) * h;

    const isActive = sol.index === activeTargetIndex;

    // Ligne de visée pointillée
    ctx.beginPath();
    ctx.strokeStyle = isActive ? 'rgba(255, 170, 0, 0.6)' : 'rgba(255, 170, 0, 0.2)';
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.setLineDash([5, 5]);
    ctx.moveTo(nestPixelX, nestPixelY);
    ctx.lineTo(targetPixelX, targetPixelY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Dessiner la Cible
    ctx.beginPath();
    ctx.arc(targetPixelX, targetPixelY, isActive ? 6 : 5, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? '#ff3b30' : 'rgba(255, 59, 48, 0.5)';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = isActive ? 1.5 : 1;
    ctx.stroke();

    // Réticule
    ctx.beginPath();
    const retSize = isActive ? 14 : 10;
    ctx.moveTo(targetPixelX - retSize, targetPixelY); ctx.lineTo(targetPixelX + retSize, targetPixelY);
    ctx.moveTo(targetPixelX, targetPixelY - retSize); ctx.lineTo(targetPixelX, targetPixelY + retSize);
    ctx.strokeStyle = isActive ? '#ff3b30' : 'rgba(255, 59, 48, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Zone d'impact
    if (sol.dispersion > 0) {
      const pixelRadius = (sol.dispersion / 1000) * cellW;

      ctx.beginPath();
      ctx.arc(targetPixelX, targetPixelY, pixelRadius, 0, Math.PI * 2);
      ctx.strokeStyle = isActive ? 'rgba(255, 59, 48, 0.4)' : 'rgba(255, 59, 48, 0.15)';
      ctx.lineWidth = isActive ? 1.5 : 1;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = isActive ? 'rgba(255, 59, 48, 0.08)' : 'rgba(255, 59, 48, 0.02)';
      ctx.fill();
    }

    // Dessiner la Salve de cette cible
    if (isSalvo) {
      let seed = nest.x + nest.y + target.x + target.y;
      const seededRandom = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
      };

      for (let s = 0; s < salvoCount; s++) {
        const angle = seededRandom() * Math.PI * 2;
        const distRatio = (seededRandom() + seededRandom()) / 2;
        const dist = distRatio * sol.dispersion;

        const dxMeters = Math.cos(angle) * dist;
        const dyMeters = Math.sin(angle) * dist;

        const impactPixelX = targetPixelX + (dxMeters / 1000) * cellW;
        const impactPixelY = targetPixelY - (dyMeters / 1000) * cellW;

        ctx.beginPath();
        ctx.arc(impactPixelX, impactPixelY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = s === 0 ? 'rgba(255, 170, 0, 0.8)' : 'rgba(255, 59, 48, 0.6)';
        ctx.fill();
      }
    }
    
    // Numéro de la cible
    ctx.fillStyle = isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 9px Arial';
    ctx.fillText(`#${sol.index + 1}`, targetPixelX + 8, targetPixelY - 8);
  });

  // Dessiner le Nest (toujours au premier plan)
  ctx.beginPath();
  ctx.arc(nestPixelX, nestPixelY, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#39ff14';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(nestPixelX - 12, nestPixelY); ctx.lineTo(nestPixelX + 12, nestPixelY);
  ctx.moveTo(nestPixelX, nestPixelY - 12); ctx.lineTo(nestPixelX, nestPixelY + 12);
  ctx.strokeStyle = '#39ff14';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// Gérer le survol et le clic sur la carte
function handleMapInteraction(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;
  const t = translations[currentLang];

  // Case de la grille
  const colIndex = Math.floor(x / (canvas.width / 20));
  const rowIndex = 10 - Math.floor(y / (canvas.height / 10));

  // Coordonnée fine
  const cellW = canvas.width / 20;
  const cellH = canvas.height / 10;
  const relativeX = x % cellW;
  const relativeY = y % cellH;

  const subX = Math.floor((relativeX / cellW) * 10);
  const subY = 9 - Math.floor((relativeY / cellH) * 10);

  const finalCol = Math.max(0, Math.min(19, colIndex));
  const finalRow = Math.max(1, Math.min(10, rowIndex));
  const finalSubX = Math.max(0, Math.min(9, subX));
  const finalSubY = Math.max(0, Math.min(9, subY));

  if (e.type === 'mousemove') {
    cursorCoordDisplay.textContent = `${t.cursor || 'Cursor'}: ${formatCoord(finalCol, finalRow, finalSubX, finalSubY)}`;
  } else if (e.type === 'click') {
    if (mapMode === 'nest') {
      nestColSel.value = finalCol;
      nestRowSel.value = finalRow;
      nestSubXInput.value = finalSubX;
      nestSubYInput.value = finalSubY;
    } else {
      // Déplacer la cible ACTIVE
      if (targets[activeTargetIndex]) {
        targets[activeTargetIndex].col = finalCol;
        targets[activeTargetIndex].row = finalRow;
        targets[activeTargetIndex].subX = finalSubX;
        targets[activeTargetIndex].subY = finalSubY;
        renderTargetFields();
      }
    }
    calculateBalistics();
  }
}

canvas.addEventListener('mousemove', handleMapInteraction);
canvas.addEventListener('click', handleMapInteraction);
canvas.addEventListener('mouseleave', () => {
  const t = translations[currentLang];
  cursorCoordDisplay.textContent = `${t.cursor || 'Cursor'}: --`;
});

// Gérer le changement de mode de clic sur la carte
mapModeNestBtn.addEventListener('click', () => {
  mapMode = 'nest';
  mapModeNestBtn.classList.add('active');
  mapModeTargetBtn.classList.remove('active');
});

mapModeTargetBtn.addEventListener('click', () => {
  mapMode = 'target';
  mapModeTargetBtn.classList.add('active');
  mapModeNestBtn.classList.remove('active');
});

// Écouteurs de changement pour les contrôles de formulaire statiques
[nestColSel, nestRowSel, nestSubXInput, nestSubYInput, ordnanceTypeSel, salvoModeSel, salvoCountInput].forEach(elem => {
  elem.addEventListener('input', calculateBalistics);
});

// Écouteur spécifique pour le mode Salve (affiche/cache le bouton + Cible)
salvoModeSel.addEventListener('change', () => {
  if (salvoModeSel.value === 'salvo') {
    salvoCountField.style.visibility = 'visible';
    salvoCountField.style.opacity = '1';
    btnAddTarget.style.display = 'inline-block';
  } else {
    salvoCountField.style.visibility = 'hidden';
    salvoCountField.style.opacity = '0';
    btnAddTarget.style.display = 'none';
    // Repasser à une cible unique
    targets = [targets[0]];
    activeTargetIndex = 0;
    renderTargetFields();
  }
  calculateBalistics();
});

// Bouton d'ajout de cible
btnAddTarget.addEventListener('click', addTarget);

// Gérer le bouton Reset
btnReset.addEventListener('click', () => {
  nestColSel.value = 10;
  nestRowSel.value = 5;
  nestSubXInput.value = 0;
  nestSubYInput.value = 0;

  salvoModeSel.value = 'single';
  salvoCountField.style.visibility = 'hidden';
  salvoCountField.style.opacity = '0';
  btnAddTarget.style.display = 'none';

  targets = [{ col: 11, row: 6, subX: 0, subY: 0 }];
  activeTargetIndex = 0;

  renderTargetFields();
  calculateBalistics();
});

// Charger l'historique
async function loadHistory() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;

      targetHistory = data.map(item => ({
        id: item.id,
        date: new Date(item.created_at).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit', second:'2-digit'}),
        nest: item.nest_coord,
        target: item.target_coord,
        distance: `${parseFloat(item.distance).toFixed(2)} km`,
        bearing: `${parseFloat(item.bearing).toFixed(1)}°`,
        solutions: item.solutions,
        munition: item.munition,
        raw: item.raw_data
      }));
    } catch (err) {
      console.error('Supabase: Échec de chargement des cibles, repli sur localStorage.', err);
      targetHistory = JSON.parse(localStorage.getItem('ironnest_history') || '[]');
    }
  } else {
    targetHistory = JSON.parse(localStorage.getItem('ironnest_history') || '[]');
  }
  renderHistory();
}

// Enregistrer la cible
btnSave.addEventListener('click', async () => {
  const nestCol = parseInt(nestColSel.value);
  const nestRow = parseInt(nestRowSel.value);
  const nestSubX = parseInt(nestSubXInput.value) || 0;
  const nestSubY = parseInt(nestSubYInput.value) || 0;

  const nest = getGlobalCoords(nestCol, nestRow, nestSubX, nestSubY);
  
  // Compiler les infos de toutes les cibles
  const targetsStrList = [];
  let totalDistance = 0;
  let totalBearing = 0;

  targets.forEach(tObj => {
    targetsStrList.push(formatCoord(tObj.col, tObj.row, tObj.subX, tObj.subY));
    const tG = getGlobalCoords(tObj.col, tObj.row, tObj.subX, tObj.subY);
    const dx = tG.x - nest.x;
    const dy = tG.y - nest.y;
    totalDistance += Math.sqrt(dx * dx + dy * dy) * 0.1;
    let b = Math.atan2(dx, dy) * (180 / Math.PI);
    if (b < 0) b += 360;
    totalBearing += b;
  });

  const avgDistance = totalDistance / targets.length;
  const avgBearing = totalBearing / targets.length;

  const targetStr = targetsStrList.join(' | ');

  // Solutions récapitulatives
  const solutionsTextList = [];
  for (let c = 1; c <= 4; c++) {
    const elev = (12 / c) * avgDistance;
    if (elev <= 85 && elev >= 3) {
      solutionsTextList.push(`${c}C: ${elev.toFixed(1)}°`);
    }
  }
  const solutionsStr = solutionsTextList.join(' | ') || 'Hors limite';

  const isSalvo = salvoModeSel.value === 'salvo';
  const salvoCount = parseInt(salvoCountInput.value) || 5;
  const munitionBase = ordnanceTypeSel.value.toUpperCase();
  // Mentionner si c'est une salve multi-cibles
  const munitionStr = isSalvo 
    ? `${munitionBase} (SALVE x${salvoCount} / ${targets.length} CIBLES)` 
    : munitionBase;

  const rawData = {
    nestCol, nestRow, nestSubX, nestSubY,
    targets,
    isSalvo,
    salvoCount
  };

  if (supabase) {
    try {
      const { error } = await supabase
        .from('missions')
        .insert([{
          nest_coord: formatCoord(nestCol, nestRow, nestSubX, nestSubY),
          target_coord: targetStr,
          distance: avgDistance,
          bearing: avgBearing,
          solutions: solutionsStr,
          munition: munitionStr,
          raw_data: rawData
        }]);

      if (error) throw error;
    } catch (err) {
      console.error('Supabase: Échec de sauvegarde.', err);
      saveLocalRecord(nestCol, nestRow, nestSubX, nestSubY, targetStr, avgDistance, avgBearing, solutionsStr, munitionStr, rawData);
    }
  } else {
    saveLocalRecord(nestCol, nestRow, nestSubX, nestSubY, targetStr, avgDistance, avgBearing, solutionsStr, munitionStr, rawData);
  }

  await loadHistory();
});

// Helper de sauvegarde locale
function saveLocalRecord(nestCol, nestRow, nestSubX, nestSubY, targetStr, distanceKm, bearingDeg, solutionsStr, munitionStr, rawData) {
  const localHistory = JSON.parse(localStorage.getItem('ironnest_history') || '[]');
  const newRecord = {
    id: Date.now(),
    date: new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit', second:'2-digit'}),
    nest: formatCoord(nestCol, nestRow, nestSubX, nestSubY),
    target: targetStr,
    distance: `${distanceKm.toFixed(2)} km`,
    bearing: `${bearingDeg.toFixed(1)}°`,
    solutions: solutionsStr,
    munition: munitionStr,
    raw: rawData
  };
  localHistory.unshift(newRecord);
  if (localHistory.length > 20) localHistory.pop();
  localStorage.setItem('ironnest_history', JSON.stringify(localHistory));
}

// Charger un enregistrement historique
window.loadRecord = function(id) {
  const record = targetHistory.find(r => r.id === id);
  if (record && record.raw) {
    nestColSel.value = record.raw.nestCol;
    nestRowSel.value = record.raw.nestRow;
    nestSubXInput.value = record.raw.nestSubX;
    nestSubYInput.value = record.raw.nestSubY;

    if (record.raw.targets) {
      targets = JSON.parse(JSON.stringify(record.raw.targets));
    } else if (record.raw.targetCol !== undefined) {
      // Compatibilité ancienne version
      targets = [{
        col: record.raw.targetCol,
        row: record.raw.targetRow,
        subX: record.raw.targetSubX,
        subY: record.raw.targetSubY
      }];
    }

    activeTargetIndex = 0;

    if (record.raw.isSalvo) {
      salvoModeSel.value = 'salvo';
      salvoCountInput.value = record.raw.salvoCount;
      salvoCountField.style.visibility = 'visible';
      salvoCountField.style.opacity = '1';
      btnAddTarget.style.display = 'inline-block';
    } else {
      salvoModeSel.value = 'single';
      salvoCountField.style.visibility = 'hidden';
      salvoCountField.style.opacity = '0';
      btnAddTarget.style.display = 'none';
    }

    renderTargetFields();
    calculateBalistics();
  }
};

// Supprimer un enregistrement historique
window.deleteRecord = async function(id) {
  if (supabase && typeof id === 'string') {
    try {
      const { error } = await supabase
        .from('missions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Supabase: Échec de suppression.', err);
    }
  } else {
    let localHistory = JSON.parse(localStorage.getItem('ironnest_history') || '[]');
    localHistory = localHistory.filter(r => r.id !== id);
    localStorage.setItem('ironnest_history', JSON.stringify(localHistory));
  }
  await loadHistory();
};

// Rendre la table d'historique
function renderHistory() {
  historyBody.innerHTML = '';
  const t = translations[currentLang];
  if (targetHistory.length === 0) {
    historyBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--color-text-dim);">${t.histEmpty || 'No targets.'}</td></tr>`;
    return;
  }

  targetHistory.forEach(record => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${record.date}</td>
      <td class="highlight-text">${record.nest}</td>
      <td class="status-danger" style="font-weight: bold; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${record.target}">${record.target}</td>
      <td>${record.distance}</td>
      <td>${record.bearing}</td>
      <td class="highlight">${record.solutions}</td>
      <td>${record.munition}</td>
      <td>
        <button class="btn btn-small btn-success" onclick="loadRecord('${record.id}')">${t.btnLoad || 'LOAD'}</button>
        <button class="btn btn-small btn-danger" onclick="deleteRecord('${record.id}')">${t.btnDelete || 'DEL'}</button>
      </td>
    `;
    historyBody.appendChild(tr);
  });
}

// Événements boutons de langue
btnLangFr.addEventListener('click', () => {
  currentLang = 'fr';
  localStorage.setItem('ironnest_lang', 'fr');
  applyLanguage();
});

btnLangEn.addEventListener('click', () => {
  currentLang = 'en';
  localStorage.setItem('ironnest_lang', 'en');
  applyLanguage();
});

// Initialisation au chargement
applyLanguage();
