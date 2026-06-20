import './style.css';
import { translations } from './i18n.js';
import { supabase } from './supabase.js';

// Gestion de la langue (i18n)
let currentLang = localStorage.getItem('ironnest_lang') || 'fr';

// État global Steam
let currentSteamId = localStorage.getItem('ironnest_steam_id') || null;
let currentSteamProfile = null;

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

// Éléments d'authentification Steam
const btnSteamLogin = document.getElementById('btn-steam-login');
const steamProfileContainer = document.getElementById('steam-profile');
const steamAvatar = document.getElementById('steam-avatar');
const steamName = document.getElementById('steam-name');
const btnSteamLogout = document.getElementById('btn-steam-logout');

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

  nestDisplay.textContent = formatCoord(nestCol, nestRow, nestSubX, nestSubY);

  const nest = getGlobalCoords(nestCol, nestRow, nestSubX, nestSubY);

  const targetType = ordnanceTypeSel.value;
  const isSalvo = salvoModeSel.value === 'salvo';
  const salvoCount = parseInt(salvoCountInput.value) || 5;

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

  const activeSol = solutionsList[activeTargetIndex] || solutionsList[0];
  if (activeSol) {
    distanceDisplay.textContent = `${activeSol.distanceKm.toFixed(2)} km`;
    bearingDisplay.textContent = `${activeSol.bearingDeg.toFixed(1)}°`;
    dispersionDisplay.textContent = `Ø ${Math.round(activeSol.dispersion * 2)}m`;
    needle.style.transform = `translate(-50%, -50%) rotate(${activeSol.bearingDeg}deg)`;
  }

  updateElevationTable(solutionsList);
  updateOrdnanceRecommendation();
  drawMap(nest, solutionsList, isSalvo, salvoCount);
}

// Mettre à jour la table des élévations
function updateElevationTable(solutionsList) {
  elevationTableBody.innerHTML = '';
  
  solutionsList.forEach((sol) => {
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    if (sol.index === activeTargetIndex) {
      tr.style.backgroundColor = 'rgba(255, 170, 0, 0.05)';
    }

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

// Dessiner la carte tactique
function drawMap(nest, solutionsList, isSalvo, salvoCount) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = '#050608';
  ctx.fillRect(0, 0, w, h);

  const cellW = w / 20;
  const cellH = h / 10;

  ctx.strokeStyle = 'rgba(57, 255, 20, 0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 20; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cellW, 0);
    ctx.lineTo(i * cellW, h);
    ctx.stroke();
  }

  for (let j = 0; j <= 10; j++) {
    ctx.beginPath();
    ctx.moveTo(0, j * cellH);
    ctx.lineTo(w, j * cellH);
    ctx.stroke();
  }

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

  solutionsList.forEach((sol) => {
    const target = getGlobalCoords(sol.targetObj.col, sol.targetObj.row, sol.targetObj.subX, sol.targetObj.subY);
    const targetPixelX = (target.x / 200) * w;
    const targetPixelY = h - (target.y / 100) * h;

    const isActive = sol.index === activeTargetIndex;

    ctx.beginPath();
    ctx.strokeStyle = isActive ? 'rgba(255, 170, 0, 0.6)' : 'rgba(255, 170, 0, 0.2)';
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.setLineDash([5, 5]);
    ctx.moveTo(nestPixelX, nestPixelY);
    ctx.lineTo(targetPixelX, targetPixelY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(targetPixelX, targetPixelY, isActive ? 6 : 5, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? '#ff3b30' : 'rgba(255, 59, 48, 0.5)';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = isActive ? 1.5 : 1;
    ctx.stroke();

    ctx.beginPath();
    const retSize = isActive ? 14 : 10;
    ctx.moveTo(targetPixelX - retSize, targetPixelY); ctx.lineTo(targetPixelX + retSize, targetPixelY);
    ctx.moveTo(targetPixelX, targetPixelY - retSize); ctx.lineTo(targetPixelX, targetPixelY + retSize);
    ctx.strokeStyle = isActive ? '#ff3b30' : 'rgba(255, 59, 48, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

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
    
    ctx.fillStyle = isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 9px Arial';
    ctx.fillText(`#${sol.index + 1}`, targetPixelX + 8, targetPixelY - 8);
  });

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

  const colIndex = Math.floor(x / (canvas.width / 20));
  const rowIndex = 10 - Math.floor(y / (canvas.height / 10));

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

// Mode de clic sur la carte
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

// Écouteurs de changement pour les contrôles de formulaire
[nestColSel, nestRowSel, nestSubXInput, nestSubYInput, ordnanceTypeSel, salvoModeSel, salvoCountInput].forEach(elem => {
  elem.addEventListener('input', calculateBalistics);
});

// Écouteur pour le mode Salve
salvoModeSel.addEventListener('change', () => {
  if (salvoModeSel.value === 'salvo') {
    salvoCountField.style.visibility = 'visible';
    salvoCountField.style.opacity = '1';
    btnAddTarget.style.display = 'inline-block';
  } else {
    salvoCountField.style.visibility = 'hidden';
    salvoCountField.style.opacity = '0';
    btnAddTarget.style.display = 'none';
    targets = [targets[0]];
    activeTargetIndex = 0;
    renderTargetFields();
  }
  calculateBalistics();
});

btnAddTarget.addEventListener('click', addTarget);

// Reset
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

// Charger l'historique (Lier avec steam_id si connecté)
async function loadHistory() {
  if (supabase) {
    try {
      let query = supabase
        .from('missions')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Filtrer par steam_id si l'utilisateur est connecté à Steam
      if (currentSteamId) {
        query = query.eq('steam_id', currentSteamId);
      } else {
        // Sinon, charger uniquement les cibles anonymes globales (steam_id est null)
        query = query.is('steam_id', null);
      }

      const { data, error } = await query.limit(20);
      
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
      targetHistory = JSON.parse(localStorage.getItem(currentSteamId ? `ironnest_history_${currentSteamId}` : 'ironnest_history') || '[]');
    }
  } else {
    targetHistory = JSON.parse(localStorage.getItem(currentSteamId ? `ironnest_history_${currentSteamId}` : 'ironnest_history') || '[]');
  }
  renderHistory();
}

// Enregistrer la cible (Lier avec steam_id si connecté)
btnSave.addEventListener('click', async () => {
  const nestCol = parseInt(nestColSel.value);
  const nestRow = parseInt(nestRowSel.value);
  const nestSubX = parseInt(nestSubXInput.value) || 0;
  const nestSubY = parseInt(nestSubYInput.value) || 0;

  const nest = getGlobalCoords(nestCol, nestRow, nestSubX, nestSubY);
  
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
      const record = {
        nest_coord: formatCoord(nestCol, nestRow, nestSubX, nestSubY),
        target_coord: targetStr,
        distance: avgDistance,
        bearing: avgBearing,
        solutions: solutionsStr,
        munition: munitionStr,
        raw_data: rawData
      };

      // Si l'utilisateur est connecté à Steam, lier l'enregistrement
      if (currentSteamId) {
        record.steam_id = currentSteamId;
      }

      const { error } = await supabase
        .from('missions')
        .insert([record]);

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
  const key = currentSteamId ? `ironnest_history_${currentSteamId}` : 'ironnest_history';
  const localHistory = JSON.parse(localStorage.getItem(key) || '[]');
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
  localStorage.setItem(key, JSON.stringify(localHistory));
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
    const key = currentSteamId ? `ironnest_history_${currentSteamId}` : 'ironnest_history';
    let localHistory = JSON.parse(localStorage.getItem(key) || '[]');
    localHistory = localHistory.filter(r => r.id !== id);
    localStorage.setItem(key, JSON.stringify(localHistory));
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

// ---- Gestion de l'authentification Steam OpenID ----

// Rediriger vers l'authentification Steam
btnSteamLogin.addEventListener('click', () => {
  const returnUrl = window.location.origin + window.location.pathname;
  const steamOpenIdUrl = 'https://steamcommunity.com/openid/login?' +
    'openid.ns=http://specs.openid.net/auth/2.0' +
    '&openid.mode=checkid_setup' +
    `&openid.return_to=${encodeURIComponent(returnUrl)}` +
    `&openid.realm=${encodeURIComponent(returnUrl)}` +
    '&openid.identity=http://specs.openid.net/auth/2.0/identifier_select' +
    '&openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select';
  
  window.location.href = steamOpenIdUrl;
});

// Déconnexion Steam
btnSteamLogout.addEventListener('click', () => {
  currentSteamId = null;
  currentSteamProfile = null;
  localStorage.removeItem('ironnest_steam_id');
  updateSteamUI();
  loadHistory();
});

// Vérifier si retour de Steam OpenID
async function checkSteamOpenIDCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const claimedId = urlParams.get('openid.claimed_id');
  
  if (claimedId) {
    // L'identifiant claimedId ressemble à : https://steamcommunity.com/openid/id/76561198031234567
    const steamId = claimedId.substring(claimedId.lastIndexOf('/') + 1);
    
    if (steamId && /^\d+$/.test(steamId)) {
      currentSteamId = steamId;
      localStorage.setItem('ironnest_steam_id', steamId);
      
      // Nettoyer les paramètres OpenID de l'URL pour garder le site propre
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Synchroniser le profil avec Supabase
      await syncSteamProfileWithSupabase(steamId);
    }
  }
  
  updateSteamUI();
  if (currentSteamId && !currentSteamProfile) {
    await fetchProfileFromSupabase(currentSteamId);
  }
}

// Synchroniser ou créer un profil joueur dans Supabase
async function syncSteamProfileWithSupabase(steamId) {
  if (!supabase) return;
  
  try {
    // 1. Chercher si le profil existe déjà
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('steam_id', steamId)
      .maybeSingle();
      
    if (error) throw error;
    
    if (profile) {
      currentSteamProfile = profile;
    } else {
      // 2. Si le profil n'existe pas, créer un profil par défaut temporaire (style recru militaire dieselpunk)
      const defaultName = `RECRUE #${steamId.substring(steamId.length - 6)}`;
      const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${steamId}`;
      
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert([{
          steam_id: steamId,
          personaname: defaultName,
          avatar: defaultAvatar
        }])
        .select()
        .single();
        
      if (insertError) throw insertError;
      currentSteamProfile = newProfile;
    }
  } catch (err) {
    console.error('Supabase: Échec de synchronisation du profil Steam.', err);
  }
}

// Charger le profil depuis Supabase au démarrage
async function fetchProfileFromSupabase(steamId) {
  if (!supabase) {
    // Hors ligne / Sans db : Création d'un profil fictif local
    currentSteamProfile = {
      steam_id: steamId,
      personaname: `RECRUE #${steamId.substring(steamId.length - 6)}`,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${steamId}`
    };
    updateSteamUI();
    return;
  }
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('steam_id', steamId)
      .maybeSingle();
      
    if (error) throw error;
    if (data) {
      currentSteamProfile = data;
    } else {
      await syncSteamProfileWithSupabase(steamId);
    }
  } catch (err) {
    console.error('Supabase: Échec de récupération du profil.', err);
    currentSteamProfile = {
      steam_id: steamId,
      personaname: `RECRUE #${steamId.substring(steamId.length - 6)}`,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${steamId}`
    };
  }
  updateSteamUI();
}

// Mettre à jour l'interface du profil Steam
function updateSteamUI() {
  if (currentSteamId && currentSteamProfile) {
    btnSteamLogin.style.display = 'none';
    steamProfileContainer.style.display = 'flex';
    steamAvatar.src = currentSteamProfile.avatar || '';
    steamName.textContent = currentSteamProfile.personaname || 'Opérateur';
  } else {
    btnSteamLogin.style.display = 'inline-flex';
    steamProfileContainer.style.display = 'none';
    steamAvatar.src = '';
    steamName.textContent = '--';
  }
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

// Initialisation générale au démarrage
async function init() {
  await checkSteamOpenIDCallback();
  applyLanguage();
}

init();
