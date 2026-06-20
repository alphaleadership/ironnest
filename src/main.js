import './style.css';

// Références des éléments du DOM
const nestColSel = document.getElementById('nest-col');
const nestRowSel = document.getElementById('nest-row');
const nestSubXInput = document.getElementById('nest-sub-x');
const nestSubYInput = document.getElementById('nest-sub-y');
const nestDisplay = document.getElementById('nest-global-display');

const targetColSel = document.getElementById('target-col');
const targetRowSel = document.getElementById('target-row');
const targetSubXInput = document.getElementById('target-sub-x');
const targetSubYInput = document.getElementById('target-sub-y');
const targetDisplay = document.getElementById('target-global-display');

const ordnanceTypeSel = document.getElementById('ordnance-type');
const ordnanceRecommendation = document.getElementById('ordnance-recommendation');

const bearingDisplay = document.getElementById('bearing-value');
const distanceDisplay = document.getElementById('distance-value');
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

// Constantes pour la grille
const COLUMNS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T'];
let mapMode = 'nest'; // 'nest' ou 'target'

// Charger l'historique initial
let targetHistory = JSON.parse(localStorage.getItem('ironnest_history') || '[]');

// Mettre à jour l'horloge système
function updateClock() {
  const now = new Date();
  const format = (n) => String(n).padStart(2, '0');
  sysTimeDisplay.textContent = `SYS.TIME: ${format(now.getHours())}:${format(now.getMinutes())}:${format(now.getSeconds())}`;
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

  const targetCol = parseInt(targetColSel.value);
  const targetRow = parseInt(targetRowSel.value);
  const targetSubX = parseInt(targetSubXInput.value) || 0;
  const targetSubY = parseInt(targetSubYInput.value) || 0;

  // Affichage texte des coordonnées
  nestDisplay.textContent = formatCoord(nestCol, nestRow, nestSubX, nestSubY);
  targetDisplay.textContent = formatCoord(targetCol, targetRow, targetSubX, targetSubY);

  // Coordonnées globales en dizaine de mètres (chaque sous-case fait 100m, donc 1 unité globale = 100m)
  const nest = getGlobalCoords(nestCol, nestRow, nestSubX, nestSubY);
  const target = getGlobalCoords(targetCol, targetRow, targetSubX, targetSubY);

  const dx = target.x - nest.x;
  const dy = target.y - nest.y;

  // Distance en kilomètres (1 unité = 100m = 0.1km)
  const distanceKm = Math.sqrt(dx * dx + dy * dy) * 0.1;
  const distanceMeters = Math.round(distanceKm * 1000);

  // Gisement (Bearing) en degrés (Nord = 0°, Est = 90°, etc.)
  // dy positif va vers le haut (Nord), dx positif vers la droite (Est)
  let bearingRad = Math.atan2(dx, dy);
  let bearingDeg = bearingRad * (180 / Math.PI);
  if (bearingDeg < 0) {
    bearingDeg += 360;
  }

  // Mettre à jour l'affichage
  distanceDisplay.textContent = `${distanceKm.toFixed(2)} km`;
  bearingDisplay.textContent = `${bearingDeg.toFixed(1)}°`;

  // Mettre à jour l'aiguille de la boussole (tourne selon le gisement)
  needle.style.transform = `translate(-50%, -50%) rotate(${bearingDeg}deg)`;

  // Mettre à jour la table des élévations
  updateElevationTable(distanceKm);
  
  // Recommandation d'obus
  updateOrdnanceRecommendation();

  // Redessiner la carte
  drawMap(nest, target);
}

// Mettre à jour la table d'élévation
function updateElevationTable(distKm) {
  elevationTableBody.innerHTML = '';
  
  // Dans le jeu, on peut utiliser de 1 à 6 charges
  for (let charges = 1; charges <= 6; charges++) {
    const elevation = (12 / charges) * distKm;
    let statusClass = 'status-stable';
    let statusText = 'Excellent';

    if (elevation > 85) {
      statusClass = 'status-danger';
      statusText = 'Trop proche / Impossible';
    } else if (elevation < 3) {
      statusClass = 'status-warning';
      statusText = 'Portée max dépassée';
    } else if (elevation > 65) {
      statusClass = 'status-warning';
      statusText = 'Dispersion élevée';
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${charges} ${charges === 1 ? 'Charge' : 'Charges'}</td>
      <td class="highlight-amber">${elevation > 85 ? 'N/A' : elevation.toFixed(2) + '°'}</td>
      <td class="${statusClass}">${statusText}</td>
    `;
    elevationTableBody.appendChild(tr);
  }
}

// Recommandations d'obus
function updateOrdnanceRecommendation() {
  const targetType = ordnanceTypeSel.value;
  let text = '';
  if (targetType === 'surface') {
    text = 'Recommandation : <span class="highlight-text" style="color: #00ff66;">HE (High Explosive)</span> - Idéal pour infanterie et blindés légers sans abri.';
  } else if (targetType === 'bunker') {
    text = 'Recommandation : <span class="highlight-text" style="color: #ff3333;">AP (Armor Piercing)</span> - Requis pour percer les toits de bunkers et blindages lourds.';
  } else {
    text = 'Recommandation : <span class="highlight-text" style="color: #ff9900;">SMOKE (Fumigène)</span> - Pour masquer les mouvements alliés ou aveugler les vigies.';
  }
  ordnanceRecommendation.innerHTML = text;
}

// Dessiner la carte tactique sur le Canvas
function drawMap(nest, target) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Effacer
  ctx.fillStyle = '#06070a';
  ctx.fillRect(0, 0, w, h);

  // Dessiner la grille 20x10
  const cellW = w / 20;
  const cellH = h / 10;

  // Lignes verticales
  ctx.strokeStyle = 'rgba(0, 255, 102, 0.1)';
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
  ctx.fillStyle = 'rgba(0, 255, 102, 0.4)';
  ctx.font = '10px Share Tech Mono';
  for (let i = 0; i < 20; i++) {
    ctx.fillText(COLUMNS[i], i * cellW + 4, 12);
  }
  for (let j = 0; j < 10; j++) {
    // 10 en haut, 1 en bas
    ctx.fillText(String(10 - j), 4, j * cellH + cellH - 4);
  }

  // Tracer la ligne de visée (si nest et target sont définis)
  if (nest && target) {
    // Convertir les coordonnées globales en pixels canvas
    // Rappel : global X va de 0 à 200, Y de 0 à 100.
    // Ligne 1 est Y global 0..9, Ligne 10 est Y global 90..99
    // Le canvas a Y=0 en haut, donc Y_canvas = h - (Y_global / 100) * h
    const nestPixelX = (nest.x / 200) * w;
    const nestPixelY = h - (nest.y / 100) * h;
    const targetPixelX = (target.x / 200) * w;
    const targetPixelY = h - (target.y / 100) * h;

    // Ligne pointillée
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 153, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.moveTo(nestPixelX, nestPixelY);
    ctx.lineTo(targetPixelX, targetPixelY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Dessiner le Nest (Vert)
    ctx.beginPath();
    ctx.arc(nestPixelX, nestPixelY, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#00ff66';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Réticule Nest
    ctx.beginPath();
    ctx.moveTo(nestPixelX - 12, nestPixelY);
    ctx.lineTo(nestPixelX + 12, nestPixelY);
    ctx.moveTo(nestPixelX, nestPixelY - 12);
    ctx.lineTo(nestPixelX, nestPixelY + 12);
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Dessiner la Cible (Rouge)
    ctx.beginPath();
    ctx.arc(targetPixelX, targetPixelY, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ff3333';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Réticule cible
    ctx.beginPath();
    ctx.moveTo(targetPixelX - 14, targetPixelY);
    ctx.lineTo(targetPixelX + 14, targetPixelY);
    ctx.moveTo(targetPixelX, targetPixelY - 14);
    ctx.lineTo(targetPixelX, targetPixelY + 14);
    ctx.strokeStyle = '#ff3333';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Cercle d'aide de portée autour de la cible
    ctx.beginPath();
    ctx.arc(targetPixelX, targetPixelY, 15, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 51, 51, 0.4)';
    ctx.stroke();
  }
}

// Gérer le survol et le clic sur la carte
function handleMapInteraction(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  // Calculer la case de la grille
  const colIndex = Math.floor(x / (canvas.width / 20));
  const rowIndex = 10 - Math.floor(y / (canvas.height / 10)); // Ligne 1 en bas, 10 en haut

  // Calculer la coordonnée fine (sub-cell)
  const cellW = canvas.width / 20;
  const cellH = canvas.height / 10;
  const relativeX = x % cellW;
  const relativeY = y % cellH;

  const subX = Math.floor((relativeX / cellW) * 10);
  const subY = 9 - Math.floor((relativeY / cellH) * 10); // 9 en haut, 0 en bas

  // Limiter
  const finalCol = Math.max(0, Math.min(19, colIndex));
  const finalRow = Math.max(1, Math.min(10, rowIndex));
  const finalSubX = Math.max(0, Math.min(9, subX));
  const finalSubY = Math.max(0, Math.min(9, subY));

  if (e.type === 'mousemove') {
    cursorCoordDisplay.textContent = `Curseur: ${formatCoord(finalCol, finalRow, finalSubX, finalSubY)}`;
  } else if (e.type === 'click') {
    if (mapMode === 'nest') {
      nestColSel.value = finalCol;
      nestRowSel.value = finalRow;
      nestSubXInput.value = finalSubX;
      nestSubYInput.value = finalSubY;
    } else {
      targetColSel.value = finalCol;
      targetRowSel.value = finalRow;
      targetSubXInput.value = finalSubX;
      targetSubYInput.value = finalSubY;
    }
    calculateBalistics();
  }
}

canvas.addEventListener('mousemove', handleMapInteraction);
canvas.addEventListener('click', handleMapInteraction);
canvas.addEventListener('mouseleave', () => {
  cursorCoordDisplay.textContent = 'Curseur: --';
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

// Écouteurs de changement pour les contrôles de formulaire
[nestColSel, nestRowSel, nestSubXInput, nestSubYInput,
 targetColSel, targetRowSel, targetSubXInput, targetSubYInput, ordnanceTypeSel].forEach(elem => {
  elem.addEventListener('input', calculateBalistics);
});

// Gérer le bouton Reset
btnReset.addEventListener('click', () => {
  nestColSel.value = 10;
  nestRowSel.value = 5;
  nestSubXInput.value = 0;
  nestSubYInput.value = 0;

  targetColSel.value = 11;
  targetRowSel.value = 6;
  targetSubXInput.value = 0;
  targetSubYInput.value = 0;

  calculateBalistics();
});

// Enregistrer la cible dans l'historique
btnSave.addEventListener('click', () => {
  const nestCol = parseInt(nestColSel.value);
  const nestRow = parseInt(nestRowSel.value);
  const nestSubX = parseInt(nestSubXInput.value) || 0;
  const nestSubY = parseInt(nestSubYInput.value) || 0;

  const targetCol = parseInt(targetColSel.value);
  const targetRow = parseInt(targetRowSel.value);
  const targetSubX = parseInt(targetSubXInput.value) || 0;
  const targetSubY = parseInt(targetSubYInput.value) || 0;

  const nest = getGlobalCoords(nestCol, nestRow, nestSubX, nestSubY);
  const target = getGlobalCoords(targetCol, targetRow, targetSubX, targetSubY);

  const dx = target.x - nest.x;
  const dy = target.y - nest.y;
  const distanceKm = Math.sqrt(dx * dx + dy * dy) * 0.1;
  
  let bearingRad = Math.atan2(dx, dy);
  let bearingDeg = bearingRad * (180 / Math.PI);
  if (bearingDeg < 0) bearingDeg += 360;

  // Calculer les solutions d'élévation
  const solutions = [];
  for (let c = 1; c <= 4; c++) {
    const elev = (12 / c) * distanceKm;
    if (elev <= 85 && elev >= 3) {
      solutions.push(`${c}C: ${elev.toFixed(1)}°`);
    }
  }

  const newRecord = {
    id: Date.now(),
    date: new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit', second:'2-digit'}),
    nest: formatCoord(nestCol, nestRow, nestSubX, nestSubY),
    target: formatCoord(targetCol, targetRow, targetSubX, targetSubY),
    distance: `${distanceKm.toFixed(2)} km`,
    bearing: `${bearingDeg.toFixed(1)}°`,
    solutions: solutions.join(' | ') || 'Hors limite',
    munition: ordnanceTypeSel.value.toUpperCase(),
    // Sauvegarder les valeurs brutes pour rechargement
    raw: {
      nestCol, nestRow, nestSubX, nestSubY,
      targetCol, targetRow, targetSubX, targetSubY
    }
  };

  targetHistory.unshift(newRecord);
  if (targetHistory.length > 20) targetHistory.pop(); // Limite à 20 entrées
  localStorage.setItem('ironnest_history', JSON.stringify(targetHistory));
  renderHistory();
});

// Charger un enregistrement historique
window.loadRecord = function(id) {
  const record = targetHistory.find(r => r.id === id);
  if (record && record.raw) {
    nestColSel.value = record.raw.nestCol;
    nestRowSel.value = record.raw.nestRow;
    nestSubXInput.value = record.raw.nestSubX;
    nestSubYInput.value = record.raw.nestSubY;

    targetColSel.value = record.raw.targetCol;
    targetRowSel.value = record.raw.targetRow;
    targetSubXInput.value = record.raw.targetSubX;
    targetSubYInput.value = record.raw.targetSubY;

    calculateBalistics();
  }
};

// Supprimer un enregistrement historique
window.deleteRecord = function(id) {
  targetHistory = targetHistory.filter(r => r.id !== id);
  localStorage.setItem('ironnest_history', JSON.stringify(targetHistory));
  renderHistory();
};

// Rendre la table d'historique
function renderHistory() {
  historyBody.innerHTML = '';
  if (targetHistory.length === 0) {
    historyBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--color-text-dim);">Aucune cible enregistrée pour le moment.</td></tr>`;
    return;
  }

  targetHistory.forEach(record => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${record.date}</td>
      <td class="highlight-text">${record.nest}</td>
      <td class="status-danger" style="font-weight: bold;">${record.target}</td>
      <td>${record.distance}</td>
      <td>${record.bearing}</td>
      <td class="highlight">${record.solutions}</td>
      <td>${record.munition}</td>
      <td>
        <button class="btn btn-small btn-success" onclick="loadRecord(${record.id})">CHARGER</button>
        <button class="btn btn-small btn-danger" onclick="deleteRecord(${record.id})">SUPPR</button>
      </td>
    `;
    historyBody.appendChild(tr);
  });
}

// Initialisation au chargement
calculateBalistics();
renderHistory();
