/* =====================================================================
   BRAIN CHALLENGE 3D  -  Minijuego 3: Ta-Te-Ti 3D de 3 fichas
   Materia: Informática Educativa 2
   Tecnología: p5.js (modo WEBGL)

   Reglas:
   1) Fase de colocar: cada jugador pone sus 3 fichas, de a una por turno.
   2) Fase de mover: en cada turno hay que mover SÍ o SÍ una ficha propia a una
      casilla vacía contigua, solo en horizontal o vertical (NO en diagonal).
   3) Gana quien arma 3 en línea (fila, columna o diagonal), incluso al colocar.
   4) Si pasan TT_MAX_MOVIDAS movimientos sin ganador, es empate.
      (Con 3 fichas por lado nadie puede quedar sin jugadas sin que haya una línea
      hecha; igual el código lo contempla: quien no puede mover, pierde.)

   Casillas numeradas así:      0 1 2
                                3 4 5
                                6 7 8
   Jugador 1 = círculos verdes (empieza la primera partida).
   Jugador 2 = cruces rojas (la compu, o un amigo).
   ===================================================================== */

/* ---------- 1. CONFIGURACIÓN (acá se ajusta todo) ---------- */
const TT_FICHAS = 3;               // fichas por jugador
const TT_DIAGONALES = false;       // ¿se puede mover en diagonal? (no)
const TT_MAX_MOVIDAS = 40;         // movimientos totales antes de declarar empate
const TT_PAUSA_COMPU_MS = 900;     // cuánto "piensa" la compu antes de jugar
const TT_PROFUNDIDAD = { facil: 1, medio: 3, dificil: 6 };   // cuántas jugadas mira la compu hacia adelante
const TT_PROB_AZAR_FACIL = 0.35;   // en fácil, a veces juega cualquier cosa

const TT_CELDA = 100;              // distancia entre centros de casillas
const TT_BALDOSA = 88;             // lado de cada casilla
const TT_ALTO_BALDOSA = 12;
const TT_ANILLO_R = 24;            // radio del círculo verde (anillo)
const TT_ANILLO_TUBO = 8;          // grosor del anillo (radio del tubo)
const TT_CRUZ_LARGO = 68;          // largo de cada barra de la cruz roja
const TT_CRUZ_GROSOR = 15;         // ancho de las barras de la cruz
const TT_ALTO_FICHA = 2 * TT_ANILLO_TUBO;   // alto de ambas fichas (la cruz usa el mismo)

const TT_LINEAS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],      // filas
  [0, 3, 6], [1, 4, 7], [2, 5, 8],      // columnas
  [0, 4, 8], [2, 4, 6]                  // diagonales
];

/* ---------- 2. LÓGICA DEL JUEGO (no usa p5, se puede probar sola) ---------- */
function ttOtro(p) { return p === 1 ? 2 : 1; }

function ttNuevoEstado() {
  return {
    tab: [0, 0, 0, 0, 0, 0, 0, 0, 0],   // 0 = vacía, 1 = jugador 1, 2 = jugador 2
    turno: 1,
    colocadas: [0, 0, 0],               // cuántas fichas puso cada jugador (índices 1 y 2)
    movidas: 0                          // cuántos movimientos (no colocaciones) van
  };
}

// 'colocar' mientras al jugador de turno le queden fichas por poner
function ttFase(e) {
  return e.colocadas[e.turno] < TT_FICHAS ? 'colocar' : 'mover';
}

// Casillas contiguas a la casilla i
function ttVecinos(i) {
  const f = Math.floor(i / 3), c = i % 3, res = [];
  for (let df = -1; df <= 1; df++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (df === 0 && dc === 0) continue;
      if (!TT_DIAGONALES && df !== 0 && dc !== 0) continue;
      const nf = f + df, nc = c + dc;
      if (nf >= 0 && nf < 3 && nc >= 0 && nc < 3) res.push(nf * 3 + nc);
    }
  }
  return res;
}

// Todas las jugadas legales del jugador de turno
function ttMovimientos(e) {
  const movs = [];
  if (ttFase(e) === 'colocar') {
    for (let i = 0; i < 9; i++) if (e.tab[i] === 0) movs.push({ tipo: 'poner', a: i });
  } else {
    for (let i = 0; i < 9; i++) {
      if (e.tab[i] !== e.turno) continue;
      for (const n of ttVecinos(i)) if (e.tab[n] === 0) movs.push({ tipo: 'mover', de: i, a: n });
    }
  }
  return movs;
}

// Devuelve un estado NUEVO (no modifica el que recibe)
function ttAplicar(e, m) {
  const n = { tab: e.tab.slice(), turno: ttOtro(e.turno), colocadas: e.colocadas.slice(), movidas: e.movidas };
  if (m.tipo === 'poner') {
    n.tab[m.a] = e.turno;
    n.colocadas[e.turno]++;
  } else {
    n.tab[m.de] = 0;
    n.tab[m.a] = e.turno;
    n.movidas++;
  }
  return n;
}

function ttBuscarLinea(tab, jugador) {
  for (const L of TT_LINEAS) {
    if (tab[L[0]] === jugador && tab[L[1]] === jugador && tab[L[2]] === jugador) return L;
  }
  return null;
}

function ttGanador(tab) {
  for (const L of TT_LINEAS) {
    if (tab[L[0]] !== 0 && tab[L[0]] === tab[L[1]] && tab[L[1]] === tab[L[2]]) return tab[L[0]];
  }
  return 0;
}

// ¿Terminó la partida? { fin, ganador (0 = empate), motivo }
function ttResultado(e) {
  const g = ttGanador(e.tab);
  if (g) return { fin: true, ganador: g, motivo: 'linea' };
  if (e.movidas >= TT_MAX_MOVIDAS) return { fin: true, ganador: 0, motivo: 'empate' };
  if (ttMovimientos(e).length === 0) return { fin: true, ganador: ttOtro(e.turno), motivo: 'bloqueo' };
  return { fin: false };
}

/* ---------- 3. LA COMPU (minimax con poda alfa-beta) ----------
   Mira 'prof' jugadas hacia adelante. Gana más puntos el que gana antes. */
function ttEvaluar(e) {
  // Valor desde el punto de vista del jugador que tiene el turno
  const yo = e.turno, el = ttOtro(yo);
  let v = 0;
  for (const L of TT_LINEAS) {
    let mios = 0, suyos = 0;
    for (const i of L) { if (e.tab[i] === yo) mios++; else if (e.tab[i] === el) suyos++; }
    if (mios === 2 && suyos === 0) v += 5;
    if (suyos === 2 && mios === 0) v -= 5;
  }
  if (e.tab[4] === yo) v += 2; else if (e.tab[4] === el) v -= 2;
  return v;
}

function ttNegamax(e, prof, alfa, beta) {
  const r = ttResultado(e);
  if (r.fin) {
    if (r.ganador === 0) return 0;
    // Si la partida terminó, el que tiene el turno ahora es el que perdió
    return (r.ganador === e.turno ? 1 : -1) * (1000 + prof);
  }
  if (prof === 0) return ttEvaluar(e);
  let mejor = -Infinity;
  for (const m of ttMovimientos(e)) {
    const v = -ttNegamax(ttAplicar(e, m), prof - 1, -beta, -alfa);
    if (v > mejor) mejor = v;
    if (mejor > alfa) alfa = mejor;
    if (alfa >= beta) break;
  }
  return mejor;
}

function ttElegirJugada(e, dificultad) {
  const movs = ttMovimientos(e);
  if (movs.length === 0) return null;
  if (dificultad === 'facil' && Math.random() < TT_PROB_AZAR_FACIL) {
    return movs[Math.floor(Math.random() * movs.length)];
  }
  const prof = TT_PROFUNDIDAD[dificultad] || 3;
  let mejorV = -Infinity;
  let candidatas = [];
  for (const m of movs) {
    const v = -ttNegamax(ttAplicar(e, m), prof - 1, -Infinity, Infinity);
    if (v > mejorV) { mejorV = v; candidatas = [m]; }
    else if (v === mejorV) candidatas.push(m);
  }
  return candidatas[Math.floor(Math.random() * candidatas.length)];   // entre las mejores, al azar
}

/* ---------- 4. ESTADO DE LA PARTIDA (parte visual y de interfaz) ---------- */
let ttActivo = false;                 // ¿está este minijuego en pantalla?
let ttE = null;                       // estado lógico actual
let ttConfig = { oponente: 'medio', giratorio: false };
let ttSeleccion = -1;                 // casilla de la ficha elegida para mover
let ttTerminada = false;
let ttLineaGanadora = null;
let ttMensajeFinal = '';
let ttMarcador = { 1: 0, 2: 0, empates: 0 };
let ttQuienEmpieza = 1;
let ttFichas = [];                    // fichas dibujadas: { owner, cell, x, y, z, reposo }
let ttTemporizador = null;
let ttRotX = -0.95, ttRotY = 0, ttRotYObj = 0;   // vista (ttRotYObj = hacia dónde está girando)

const ttX = i => (i % 3 - 1) * TT_CELDA;
const ttZ = i => (Math.floor(i / 3) - 1) * TT_CELDA;

function ttEsTurnoCompu() {
  return ttConfig.oponente !== 'amigo' && ttE.turno === 2 && !ttTerminada;
}

/* ---------- 5. FLUJO ---------- */
function ttEmpezarPartida() {
  clearTimeout(ttTemporizador);
  ttE = ttNuevoEstado();
  ttE.turno = ttQuienEmpieza;
  ttQuienEmpieza = ttOtro(ttQuienEmpieza);     // la próxima partida empieza el otro
  ttSeleccion = -1;
  ttTerminada = false;
  ttLineaGanadora = null;
  ttMensajeFinal = '';
  ttFichas = [];
  ttRotY = 0;
  ttRotYObj = 0;
  ttActivo = true;
  ttActualizarHUD();
  if (ttEsTurnoCompu()) ttTemporizador = setTimeout(ttJugadaCompu, TT_PAUSA_COMPU_MS);
}

// Aplica una jugada (de una persona o de la compu) al estado y al dibujo
function ttJugar(m) {
  const jugador = ttE.turno;
  if (m.tipo === 'poner') {
    const reposo = -(TT_ALTO_BALDOSA / 2 + TT_ALTO_FICHA / 2);
    ttFichas.push({ owner: jugador, cell: m.a, x: ttX(m.a), z: ttZ(m.a), y: reposo - 170, reposo: reposo });
  } else {
    const f = ttFichas.find(fi => fi.cell === m.de);
    if (f) f.cell = m.a;
  }
  ttE = ttAplicar(ttE, m);
  ttSeleccion = -1;

  const r = ttResultado(ttE);
  if (r.fin) { ttTerminar(r); return; }
  if (ttConfig.giratorio) ttRotYObj += random([-1, 1]) * HALF_PI;    // el tablero gira 90°
  ttActualizarHUD();
  if (ttEsTurnoCompu()) ttTemporizador = setTimeout(ttJugadaCompu, TT_PAUSA_COMPU_MS);
}

function ttJugadaCompu() {
  if (!ttActivo || ttTerminada || !ttEsTurnoCompu()) return;
  const m = ttElegirJugada(ttE, ttConfig.oponente);
  if (m) ttJugar(m);
}

// Una persona tocó la casilla i
function ttClickCasilla(i) {
  if (!ttActivo || ttTerminada || ttEsTurnoCompu()) return;

  if (ttFase(ttE) === 'colocar') {
    if (ttE.tab[i] === 0) ttJugar({ tipo: 'poner', a: i });
    else ttMensaje('Esa casilla está ocupada. Elegí una vacía.');
    return;
  }

  // Fase de mover
  if (ttE.tab[i] === ttE.turno) {                       // eligió (o cambió) su ficha
    ttSeleccion = (ttSeleccion === i) ? -1 : i;
    ttActualizarHUD();
    if (ttSeleccion >= 0 && !ttVecinos(i).some(n => ttE.tab[n] === 0)) {
      ttMensaje('Esa ficha no tiene casillas libres al lado. Probá con otra.');
    }
    return;
  }
  if (ttSeleccion < 0) { ttMensaje('Primero tocá una de tus fichas.'); return; }
  if (ttE.tab[i] === 0 && ttVecinos(ttSeleccion).includes(i)) {
    ttJugar({ tipo: 'mover', de: ttSeleccion, a: i });
  } else {
    ttMensaje('Solo podés moverte a una casilla vacía que esté al lado, sin diagonales (las celestes).');
  }
}

function ttTerminar(r) {
  ttTerminada = true;
  ttSeleccion = -1;
  const amigo = ttConfig.oponente === 'amigo';
  if (r.ganador === 0) {
    ttMarcador.empates++;
    ttMensajeFinal = '¡Empate! Nadie logró 3 en línea.';
  } else {
    ttMarcador[r.ganador]++;
    if (r.motivo === 'linea') ttLineaGanadora = ttBuscarLinea(ttE.tab, r.ganador);
    const como = (r.motivo === 'linea') ? 'con 3 en línea' : 'porque el rival no puede mover';
    if (amigo) ttMensajeFinal = '¡Ganó el jugador ' + r.ganador + ' ' + como + '!';
    else if (r.ganador === 1) ttMensajeFinal = '¡Ganaste ' + como + '!';
    else ttMensajeFinal = 'Ganó la compu ' + como + '. ¡Revancha!';
  }
  ttActualizarHUD();
}

/* ---------- 6. INTERFAZ (HTML) ---------- */
function ttNombre(p) {
  const amigo = ttConfig.oponente === 'amigo';
  if (p === 1) return amigo ? 'Jugador 1 (círculos verdes)' : 'Vos (círculos verdes)';
  return amigo ? 'Jugador 2 (cruces rojas)' : 'La compu (cruces rojas)';
}

function ttMensaje(texto) {
  document.getElementById('tt-mensaje').textContent = texto;
}

function ttActualizarHUD() {
  const amigo = ttConfig.oponente === 'amigo';
  document.getElementById('tt-turno').textContent =
    ttTerminada ? 'Fin de la partida' : 'Turno: ' + ttNombre(ttE.turno);
  document.getElementById('tt-marcador').textContent =
    (amigo ? 'J1: ' : 'Vos: ') + ttMarcador[1] + '  ·  ' + (amigo ? 'J2: ' : 'Compu: ') + ttMarcador[2] +
    '  ·  Empates: ' + ttMarcador.empates;

  let texto;
  if (ttTerminada) texto = ttMensajeFinal;
  else if (ttEsTurnoCompu()) texto = 'La compu está pensando...';
  else if (ttFase(ttE) === 'colocar') {
    texto = 'Colocá una ficha en una casilla vacía (te quedan ' + (TT_FICHAS - ttE.colocadas[ttE.turno]) + ')';
  } else {
    texto = ttSeleccion < 0 ? 'Ahora hay que mover: elegí una de tus fichas'
                            : 'Tocá una casilla celeste (vacía y al lado, sin diagonales)';
  }
  ttMensaje(texto);
}

function ttMostrarConfig() {
  document.getElementById('menu').classList.add('oculto');
  document.getElementById('tt-config').classList.remove('oculto');
}

function ttIniciar() {
  document.getElementById('tt-config').classList.add('oculto');
  document.getElementById('hud-tateti').classList.remove('oculto');
  ttMarcador = { 1: 0, 2: 0, empates: 0 };
  ttQuienEmpieza = 1;
  ttEmpezarPartida();
}

function ttSalir() {
  ttActivo = false;
  clearTimeout(ttTemporizador);
  document.getElementById('hud-tateti').classList.add('oculto');
  document.getElementById('tt-config').classList.add('oculto');
}

function ttConectarBotones() {
  const $ = id => document.getElementById(id);
  $('btn-jugar-tateti').onclick = ttMostrarConfig;
  document.querySelectorAll('#tt-oponentes .btn').forEach(b => {
    b.onclick = () => {
      ttConfig.oponente = b.dataset.op;
      document.querySelectorAll('#tt-oponentes .btn').forEach(x => x.classList.toggle('activo', x === b));
    };
  });
  $('tt-giratorio').onchange = ev => { ttConfig.giratorio = ev.target.checked; };
  $('tt-jugar').onclick = ttIniciar;
  $('tt-volver').onclick = mostrarMenu;
  $('tt-nueva').onclick = ttEmpezarPartida;
  $('tt-salir').onclick = mostrarMenu;
}

/* ---------- 7. DIBUJO 3D ---------- */
function ttDibujar() {
  background(10, 12, 20);
  ttActualizarFichas();

  ambientLight(120);
  directionalLight(200, 200, 200, 0.2, 1, -0.4);
  directionalLight(90, 100, 140, 0.3, 0.3, -1);

  ttDibujarEscena(window, false);
}

// Suaviza el movimiento de las fichas y de la cámara
function ttActualizarFichas() {
  const k = 1 - Math.exp(-deltaTime / 80);
  ttRotY += (ttRotYObj - ttRotY) * k;
  for (const f of ttFichas) {
    f.x += (ttX(f.cell) - f.x) * k;
    f.z += (ttZ(f.cell) - f.z) * k;
    const elevacion = (f.cell === ttSeleccion && !ttTerminada) ? 26 + 4 * Math.sin(millis() / 150) : 0;
    f.y += ((f.reposo - elevacion) - f.y) * k;
  }
}

function ttColorBaldosa(i) {
  const base = (i % 2 === 0) ? [46, 58, 100] : [38, 48, 86];
  if (ttTerminada) return (ttLineaGanadora && ttLineaGanadora.includes(i)) ? [150, 125, 40] : base;
  const pulso = 0.5 + 0.5 * Math.sin(millis() / 220);
  if (ttSeleccion >= 0 && ttE.tab[i] === 0 && ttVecinos(ttSeleccion).includes(i)) {
    return [40, 120 + 60 * pulso, 170 + 60 * pulso];         // destinos posibles: celeste
  }
  if (i === ttSeleccion) return [125, 100, 190];
  if (!ttEsTurnoCompu() && ttFase(ttE) === 'colocar' && ttE.tab[i] === 0) return [56, 76, 128];
  return base;
}

function ttColorFicha(f) {
  if (ttTerminada && ttLineaGanadora && ttLineaGanadora.includes(f.cell)) return [255, 215, 0];
  return f.owner === 1 ? [46, 204, 113] : [235, 64, 52];     // verde / rojo
}

/* Dibuja la escena en 'g' (el lienzo principal o el buffer de picking).
   Si 'picking' es true, cada casilla (y la ficha que tiene encima) se pinta con
   un color único = su número, para saber dónde tocó el jugador. */
function ttDibujarEscena(g, picking) {
  g.push();
  g.scale(min(width, height) / 560);
  g.rotateX(ttRotX);
  g.rotateY(ttRotY);
  g.noStroke();

  if (!picking) {                                   // base oscura debajo del tablero
    g.push();
    g.translate(0, TT_ALTO_BALDOSA / 2 + 6, 0);
    g.fill(18, 24, 44);
    g.box(3 * TT_CELDA + 30, 12, 3 * TT_CELDA + 30);
    g.pop();
  }

  for (let i = 0; i < 9; i++) {
    g.push();
    g.translate(ttX(i), 0, ttZ(i));
    if (picking) g.fill((i + 1) * 20, 0, 0);
    else { const c = ttColorBaldosa(i); g.fill(c[0], c[1], c[2]); }
    g.box(TT_BALDOSA, TT_ALTO_BALDOSA, TT_BALDOSA);
    g.pop();
  }

  for (const f of ttFichas) {
    g.push();
    g.translate(f.x, f.y, f.z);
    if (picking) g.fill((f.cell + 1) * 20, 0, 0);
    else { const c = ttColorFicha(f); g.fill(c[0], c[1], c[2]); }
    if (f.owner === 1) {                              // círculo: anillo acostado sobre el tablero
      g.rotateX(HALF_PI);
      g.torus(TT_ANILLO_R, TT_ANILLO_TUBO, 32, 16);
    } else {                                          // cruz: dos barras cruzadas en X
      g.rotateY(QUARTER_PI);
      g.box(TT_CRUZ_LARGO, TT_ALTO_FICHA, TT_CRUZ_GROSOR);
      g.rotateY(HALF_PI);
      g.box(TT_CRUZ_LARGO, TT_ALTO_FICHA, TT_CRUZ_GROSOR);
    }
    g.pop();
  }
  g.pop();
}

/* ---------- 8. MOUSE / TÁCTIL: arrastrar para girar, tocar para jugar ---------- */
let ttArrastrando = false;
let ttSeMovio = false;
let ttInicioX = 0, ttInicioY = 0;

function ttMousePressed(evento) {
  if (evento && evento.target && evento.target.tagName !== 'CANVAS') return;
  ttArrastrando = true;
  ttSeMovio = false;
  ttInicioX = mouseX;
  ttInicioY = mouseY;
}

function ttMouseDragged() {
  if (!ttArrastrando) return;
  if (dist(mouseX, mouseY, ttInicioX, ttInicioY) > 6) ttSeMovio = true;
  const d = (mouseX - pmouseX) * 0.01;
  ttRotY += d;
  ttRotYObj += d;
  ttRotX = constrain(ttRotX - (mouseY - pmouseY) * 0.01, -1.45, -0.3);
}

function ttMouseReleased() {
  if (!ttArrastrando) return;
  ttArrastrando = false;
  if (ttSeMovio) return;                 // fue un arrastre, no un toque
  const i = ttCasillaEn(mouseX, mouseY);
  if (i >= 0) ttClickCasilla(i);
}

// Color picking: dibujamos el tablero oculto con un color por casilla y leemos el píxel
function ttCasillaEn(x, y) {
  bufferPicking.background(0);
  ttDibujarEscena(bufferPicking, true);
  const px = bufferPicking.get(x, y);
  const id = Math.round(px[0] / 20);
  return (id >= 1 && id <= 9) ? id - 1 : -1;
}
