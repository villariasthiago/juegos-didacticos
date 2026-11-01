/* =====================================================================
   BRAIN CHALLENGE 3D  -  Minijuego 2: Cubo Rubik 3D  ("Deshacé la mezcla")
   Materia: Informática Educativa 2
   Tecnología: p5.js (modo WEBGL)

   Cómo funciona el cubo por dentro:
   - Hay 26 cubitos (el del centro no existe). Cada uno guarda:
       pos -> en qué lugar de la grilla está: [x, y, z] con valores -1, 0 o 1
       R   -> su orientación (matriz 3x3 de rotación, con números enteros)
   - Girar una cara = tomar los 9 cubitos de esa capa y multiplicarlos por una
     matriz de giro de 90°. Así el cubo nunca se "desarma" ni acumula errores.
   - Los colores no cambian de lugar: viajan pegados a cada cubito.
   - Convención de p5.js: el eje Y apunta hacia ABAJO, así que "arriba" es y = -1.
   ===================================================================== */

/* ---------- 1. CONFIGURACIÓN (acá se ajusta todo) ---------- */
const RB_SEP = 70;                 // distancia entre centros de cubitos
const RB_TAM = 66;                 // tamaño del cuerpo negro de cada cubito
const RB_PEGATINA = 56;            // lado de cada pegatina de color
const RB_GROSOR = 3;               // cuánto sobresale la pegatina
const RB_MS_GIRO_JUGADOR = 260;    // duración de un giro hecho por el jugador
const RB_MS_GIRO_MEZCLA = 380;     // duración de cada giro cuando se mezcla
const RB_MS_GIRO_RAPIDO = 150;     // giros rápidos del botón "Mezclar" (estilo libre)
const RB_MOVS_MEZCLA_LIBRE = 20;   // cuántos giros hace "Mezclar" en estilo libre
const RB_MOVS_NIVEL_1 = 1;         // movimientos de mezcla en el nivel 1 (suma 1 por nivel)
const RB_MOVS_MAXIMO = 12;         // tope de movimientos de mezcla

/* Las 6 caras: eje (0=x, 1=y, 2=z), signo (de qué lado está) y color real del Rubik */
const RB_CARAS = [
  { nombre: 'Blanca',   eje: 1, signo: -1, color: [245, 245, 245] },  // arriba
  { nombre: 'Amarilla', eje: 1, signo: +1, color: [255, 213, 0] },    // abajo
  { nombre: 'Verde',    eje: 2, signo: +1, color: [0, 155, 72] },     // frente
  { nombre: 'Azul',     eje: 2, signo: -1, color: [0, 70, 173] },     // atrás
  { nombre: 'Roja',     eje: 0, signo: +1, color: [200, 30, 40] },    // derecha
  { nombre: 'Naranja',  eje: 0, signo: -1, color: [255, 110, 0] }     // izquierda
];

/* ---------- 2. MATEMÁTICA DE GIROS ---------- */
function rbIdentidad() { return [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; }

// Matriz de rotación alrededor de un eje. c = coseno, s = seno del ángulo.
function rbMatEje(eje, c, s) {
  if (eje === 0) return [[1, 0, 0], [0, c, -s], [0, s, c]];
  if (eje === 1) return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
  return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
}

function rbMul(A, B) {
  const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++) C[i][j] += A[i][k] * B[k][j];
  return C;
}

function rbMulVec(A, v) {
  return [0, 1, 2].map(i => A[i][0] * v[0] + A[i][1] * v[1] + A[i][2] * v[2]);
}

/* ---------- 3. MODELO DEL CUBO ---------- */
let rbCubitos = [];   // cada uno: { pos:[x,y,z], R:[[..],[..],[..]], pegatinas:[{eje,signo,color}] }

function rbCrearCubo() {
  rbCubitos = [];
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        if (x === 0 && y === 0 && z === 0) continue;
        const pos = [x, y, z];
        // Tiene una pegatina por cada cara exterior en la que está apoyado
        const pegatinas = RB_CARAS.filter(cara => pos[cara.eje] === cara.signo);
        rbCubitos.push({ pos: pos, R: rbIdentidad(), pegatinas: pegatinas });
      }
    }
  }
}

/* Un movimiento es { eje, capa, giro }:
   - eje:  0, 1 o 2
   - capa: -1 o 1 (qué cara se gira)
   - giro: +1 o -1 (un cuarto de vuelta en un sentido o en el otro) */
function rbAplicarMov(mov) {
  const M = rbMatEje(mov.eje, 0, mov.giro);          // coseno 0, seno ±1 = 90° exactos
  for (const c of rbCubitos) {
    if (c.pos[mov.eje] === mov.capa) {
      c.pos = rbMulVec(M, c.pos).map(Math.round);
      c.R = rbMul(M, c.R).map(fila => fila.map(Math.round));
    }
  }
}

/* El cubo está resuelto si, mirando cada dirección, todas las pegatinas
   que apuntan hacia ahí tienen el mismo color. */
function rbEstaResuelto() {
  const colorPorDireccion = {};
  for (const c of rbCubitos) {
    for (const p of c.pegatinas) {
      const normal = [0, 0, 0];
      normal[p.eje] = p.signo;
      const dir = rbMulVec(c.R, normal).map(Math.round).join(',');
      const col = p.color.join('-');
      if (colorPorDireccion[dir] === undefined) colorPorDireccion[dir] = col;
      else if (colorPorDireccion[dir] !== col) return false;
    }
  }
  return true;
}

/* Genera 'k' movimientos de mezcla (sin repetir la misma cara seguida y
   asegurándose de que el cubo NO quede resuelto por casualidad). */
function rbGenerarMezcla(k) {
  let movs;
  do {
    movs = [];
    let ultima = -1;
    for (let i = 0; i < k; i++) {
      let idx;
      do { idx = floor(random(6)); } while (idx === ultima);
      ultima = idx;
      const cara = RB_CARAS[idx];
      movs.push({ eje: cara.eje, capa: cara.signo, giro: random([1, -1]) });
    }
    rbCrearCubo();
    for (const m of movs) rbAplicarMov(m);
  } while (rbEstaResuelto());
  rbCrearCubo();
  return movs;
}

/* ---------- 4. ESTADO DEL JUEGO ---------- */
let rbActivo = false;             // ¿está este minijuego en pantalla?
let rbEstado = 'inactivo';        // 'mezclando' | 'jugando' | 'resuelto'
let rbJuego = { nivel: 1, puntos: 0, movs: 0, mezcla: 0 };
let rbTemporizador = null;
let rbRotX = -0.5, rbRotY = -0.6; // vista del cubo (se arrastra con el mouse)
let rbAnim = null;                // giro en curso: { eje, capa, giro, t0, dur, ang }
let rbCola = [];                  // giros pendientes
let rbModo = 'desafio';           // 'desafio' (por niveles) | 'libre'
let rbHistorial = [];             // giros del jugador, para poder deshacer (estilo libre)
let rbRegistro = [];              // TODOS los giros desde que el cubo estaba resuelto (estilo libre):
                                  // con esto se puede calcular el camino de vuelta (Pista y Resolver)
let rbBotonesGiro = [];           // botones de cada cara: { anti, horario } (para resaltar la pista)
let rbTemporizadorPista = null;

/* ---------- 5. ANIMACIÓN ---------- */
function rbActualizar() {
  if (!rbAnim && rbCola.length > 0) {
    const m = rbCola.shift();
    rbAnim = { eje: m.eje, capa: m.capa, giro: m.giro, dur: m.dur, tipo: m.tipo, t0: millis(), ang: 0 };
  }
  if (!rbAnim) return;

  const t = (millis() - rbAnim.t0) / rbAnim.dur;
  if (t >= 1) {
    const terminado = rbAnim;
    rbAnim = null;
    rbAplicarMov(terminado);         // el giro pasa a ser definitivo en el modelo
    rbAlTerminarMov(terminado);
    return;
  }
  const suave = t * t * (3 - 2 * t);
  rbAnim.ang = rbAnim.giro * HALF_PI * suave;
}

// Se llama cada vez que termina un giro. 'm.tipo' dice quién lo hizo:
// 'mezcla' (el juego), 'jugador' (un botón), 'deshacer', 'secuencia' (un algoritmo de la guía)
// o 'resolver' (el cubo se resuelve solo).
function rbAlTerminarMov(m) {
  const libre = (rbModo === 'libre');
  const ultimoDeLaCola = (rbCola.length === 0);

  if (m.tipo === 'mezcla') {
    if (libre) rbRegistro.push({ eje: m.eje, capa: m.capa, giro: m.giro });
    if (ultimoDeLaCola) {
      rbEstado = 'jugando';
      rbBloquearControles(false);
      rbMensaje(libre ? 'Cubo mezclado. ¡Resolvelo! (si te trabás: Guía o Pista)'
                      : 'Dejá cada cara de un solo color (↻ = sentido horario mirando esa cara)');
    }
  } else if (m.tipo === 'jugador' || m.tipo === 'secuencia') {
    rbJuego.movs++;
    if (libre) {
      rbHistorial.push({ eje: m.eje, capa: m.capa, giro: m.giro });
      rbRegistro.push({ eje: m.eje, capa: m.capa, giro: m.giro });
    }
    rbActualizarHUD();
    if (m.tipo === 'secuencia' && !ultimoDeLaCola) return;       // seguir con el resto del algoritmo
    if (m.tipo === 'secuencia') { rbEstado = 'jugando'; rbBloquearControles(false); }
    if (rbEstaResuelto()) {
      if (libre) { rbRegistro = []; rbHistorial = []; rbMensaje('¡Resuelto en ' + rbJuego.movs + ' movimientos!'); }
      else rbNivelResuelto();
    } else if (m.tipo === 'secuencia') {
      rbMensaje('Listo. Mirá cómo quedó el cubo y seguí con el paso siguiente.');
    }
  } else if (m.tipo === 'deshacer') {
    rbRegistro.pop();
    rbJuego.movs = max(0, rbJuego.movs - 1);
    rbActualizarHUD();
    rbMensaje('Movimiento deshecho');
  } else if (m.tipo === 'resolver') {
    if (ultimoDeLaCola) {
      rbRegistro = [];
      rbHistorial = [];
      rbEstado = 'jugando';
      rbBloquearControles(false);
      rbMensaje('¡Cubo resuelto! Ahora tocá "Mezclar" y probá resolverlo vos.');
    }
  }
}

/* ---------- 6. DIBUJO ---------- */
function rbDibujar() {
  background(10, 12, 20);
  rbActualizar();

  ambientLight(130);
  directionalLight(170, 170, 170, -0.4, 0.6, -1);
  directionalLight(70, 80, 110, 0.6, -0.3, -0.5);

  push();
  // más arriba para no tapar los botones; y a la izquierda si la guía está abierta (en pantallas anchas)
  const corrimiento = (typeof guiaAbierta !== 'undefined' && guiaAbierta && windowWidth > 800) ? -200 : 0;
  translate(corrimiento, -height * 0.07, 0);
  scale(min(width, height) / 640);
  rotateX(rbRotX);
  rotateY(rbRotY);
  for (const c of rbCubitos) rbDibujarCubito(c);
  pop();
}

function rbDibujarCubito(c) {
  let R = c.R;
  let p = c.pos;

  // Si este cubito está en la capa que está girando, le sumamos el giro parcial
  if (rbAnim && c.pos[rbAnim.eje] === rbAnim.capa) {
    const L = rbMatEje(rbAnim.eje, cos(rbAnim.ang), sin(rbAnim.ang));
    R = rbMul(L, R);
    p = rbMulVec(L, p);
  }

  push();
  // applyMatrix recibe la matriz por columnas: [ejeX, ejeY, ejeZ, posición]
  applyMatrix(R[0][0], R[1][0], R[2][0], 0,
              R[0][1], R[1][1], R[2][1], 0,
              R[0][2], R[1][2], R[2][2], 0,
              p[0] * RB_SEP, p[1] * RB_SEP, p[2] * RB_SEP, 1);
  noStroke();
  fill(15);
  box(RB_TAM);

  for (const peg of c.pegatinas) {
    const medidas = [RB_PEGATINA, RB_PEGATINA, RB_PEGATINA];
    medidas[peg.eje] = RB_GROSOR;
    const desplazo = [0, 0, 0];
    desplazo[peg.eje] = peg.signo * (RB_TAM / 2 + RB_GROSOR / 2);
    push();
    translate(desplazo[0], desplazo[1], desplazo[2]);
    fill(peg.color[0], peg.color[1], peg.color[2]);
    box(medidas[0], medidas[1], medidas[2]);
    pop();
  }
  pop();
}

/* ---------- 7. FLUJO DEL JUEGO ---------- */
function rbIniciar(modo) {
  rbModo = (modo === 'libre') ? 'libre' : 'desafio';
  rbActivo = true;
  document.getElementById('menu').classList.add('oculto');
  document.getElementById('fin').classList.add('oculto');
  document.getElementById('hud').classList.add('oculto');
  document.getElementById('hud-rubik').classList.remove('oculto');

  // Mostrar solo los botones que corresponden a cada modo
  document.querySelectorAll('.rb-solo-desafio').forEach(el => el.classList.toggle('oculto', rbModo !== 'desafio'));
  document.querySelectorAll('.rb-solo-libre').forEach(el => el.classList.toggle('oculto', rbModo !== 'libre'));

  rbJuego = { nivel: 1, puntos: 0, movs: 0, mezcla: 0 };
  rbHistorial = [];
  rbRegistro = [];
  rbRotX = -0.5;
  rbRotY = -0.6;
  if (rbModo === 'libre') rbEmpezarLibre();
  else rbEmpezarNivel();
}

function rbSalir() {
  rbActivo = false;
  rbEstado = 'inactivo';
  clearTimeout(rbTemporizador);
  rbCola = [];
  rbAnim = null;
  rbLimpiarPista();
  if (typeof guiaCerrar === 'function') guiaCerrar();
  document.getElementById('hud-rubik').classList.add('oculto');
}

function rbEmpezarNivel() {
  clearTimeout(rbTemporizador);
  const k = min(RB_MOVS_NIVEL_1 - 1 + rbJuego.nivel, RB_MOVS_MAXIMO);
  rbJuego.mezcla = k;
  rbJuego.movs = 0;

  const mezcla = rbGenerarMezcla(k);       // deja el cubo resuelto y devuelve los movimientos
  rbAnim = null;
  rbCola = mezcla.map(m => ({ eje: m.eje, capa: m.capa, giro: m.giro, dur: RB_MS_GIRO_MEZCLA, tipo: 'mezcla' }));

  rbEstado = 'mezclando';
  rbBloquearControles(true);
  rbMensaje('Mirá bien cómo se mezcla el cubo...');
  rbActualizarHUD();
}

function rbGirarCara(idx, horario) {
  if (rbEstado !== 'jugando' || rbAnim || rbCola.length > 0) return;
  rbLimpiarPista();
  const cara = RB_CARAS[idx];
  // Visto desde afuera de la cara, el sentido horario equivale a "giro = signo de la cara"
  const giro = horario ? cara.signo : -cara.signo;
  rbCola.push({ eje: cara.eje, capa: cara.signo, giro: giro, dur: RB_MS_GIRO_JUGADOR, tipo: 'jugador' });
}

function rbNivelResuelto() {
  rbEstado = 'resuelto';
  rbBloquearControles(true);

  const extra = max(0, rbJuego.movs - rbJuego.mezcla);
  const puntos = max(20, 50 * rbJuego.mezcla - 10 * extra);
  rbJuego.puntos += puntos;

  const minimo = (extra === 0) ? ' ¡Con la menor cantidad de movimientos!' : '';
  rbMensaje('¡Resuelto! +' + puntos + ' puntos.' + minimo);
  rbActualizarHUD();

  rbTemporizador = setTimeout(() => {
    rbJuego.nivel++;
    rbEmpezarNivel();
  }, 2800);
}

/* ---------- 7b. ESTILO LIBRE ---------- */
// Arranca con el cubo resuelto y sin objetivo: se juega a gusto
function rbEmpezarLibre() {
  clearTimeout(rbTemporizador);
  rbCrearCubo();
  rbCola = [];
  rbAnim = null;
  rbHistorial = [];
  rbRegistro = [];
  rbLimpiarPista();
  rbJuego.movs = 0;
  rbJuego.mezcla = 0;
  rbEstado = 'jugando';
  rbBloquearControles(false);
  rbMensaje('Estilo libre: girá las caras como quieras, o apretá "Mezclar"');
  rbActualizarHUD();
}

// k giros al azar sobre el cubo tal como está ahora (sin repetir la misma cara seguida)
function rbMovsAleatorios(k) {
  const movs = [];
  let ultima = -1;
  for (let i = 0; i < k; i++) {
    let idx;
    do { idx = floor(random(6)); } while (idx === ultima);
    ultima = idx;
    const cara = RB_CARAS[idx];
    movs.push({ eje: cara.eje, capa: cara.signo, giro: random([1, -1]), dur: RB_MS_GIRO_RAPIDO, tipo: 'mezcla' });
  }
  return movs;
}

function rbMezclarLibre() {
  if (rbModo !== 'libre' || rbEstado !== 'jugando' || rbAnim || rbCola.length > 0) return;
  rbLimpiarPista();
  rbHistorial = [];
  rbJuego.movs = 0;
  rbCola = rbMovsAleatorios(RB_MOVS_MEZCLA_LIBRE);
  rbEstado = 'mezclando';
  rbBloquearControles(true);
  rbMensaje('Mezclando...');
  rbActualizarHUD();
}

// Deshace el último giro del jugador (solo estilo libre)
function rbDeshacer() {
  if (rbModo !== 'libre' || rbEstado !== 'jugando' || rbAnim || rbCola.length > 0) return;
  if (rbHistorial.length === 0) { rbMensaje('No hay movimientos tuyos para deshacer'); return; }
  rbLimpiarPista();
  const ultimo = rbHistorial.pop();
  rbCola.push({ eje: ultimo.eje, capa: ultimo.capa, giro: -ultimo.giro, dur: RB_MS_GIRO_JUGADOR, tipo: 'deshacer' });
}

function rbResetearLibre() {
  if (rbModo === 'libre') rbEmpezarLibre();
}

/* ---------- 7c. AYUDA: CAMINO DE VUELTA, PISTA, RESOLVER Y ALGORITMOS DE LA GUÍA ----------
   El juego recuerda TODOS los giros desde que el cubo estaba resuelto (rbRegistro).
   Para resolverlo alcanza con deshacerlos en orden inverso. Antes se "simplifica":
   dos giros seguidos de la misma cara se juntan (↻ + ↻ = media vuelta, ↻ + ↺ = nada)
   y las caras opuestas no se estorban entre sí, así que también se pueden juntar. */
function rbSimplificar(movs) {
  const pila = [];                                  // { eje, capa, q } con q = cuartos de vuelta (1, 2 o 3)
  for (const m of movs) {
    let hallado = -1;
    for (let i = pila.length - 1; i >= 0 && pila[i].eje === m.eje; i--) {
      if (pila[i].capa === m.capa) { hallado = i; break; }
    }
    if (hallado >= 0) {
      pila[hallado].q = (((pila[hallado].q + m.giro) % 4) + 4) % 4;
      if (pila[hallado].q === 0) pila.splice(hallado, 1);
    } else {
      pila.push({ eje: m.eje, capa: m.capa, q: ((m.giro % 4) + 4) % 4 });
    }
  }
  const salida = [];
  for (const p of pila) {
    if (p.q === 3) salida.push({ eje: p.eje, capa: p.capa, giro: -1 });
    else for (let k = 0; k < p.q; k++) salida.push({ eje: p.eje, capa: p.capa, giro: 1 });
  }
  return salida;
}

// Lista de giros (de a cuarto de vuelta) que dejan el cubo resuelto desde el estado actual
function rbSolucion() {
  const inverso = rbRegistro.slice().reverse().map(m => ({ eje: m.eje, capa: m.capa, giro: -m.giro }));
  return rbSimplificar(inverso);
}

function rbIndiceCara(eje, capa) { return RB_CARAS.findIndex(c => c.eje === eje && c.signo === capa); }
function rbEsHorario(m) { return m.giro === RB_CARAS[rbIndiceCara(m.eje, m.capa)].signo; }

function rbLimpiarPista() {
  clearTimeout(rbTemporizadorPista);
  document.querySelectorAll('.rb-giro.pista').forEach(b => b.classList.remove('pista'));
}

function rbPuedeAyudar() {
  return rbModo === 'libre' && rbEstado === 'jugando' && !rbAnim && rbCola.length === 0;
}

// Pista: resalta el botón del próximo giro del camino de vuelta
function rbPista() {
  if (!rbPuedeAyudar()) return;
  rbLimpiarPista();
  const sol = rbSolucion();
  if (sol.length === 0) { rbMensaje('El cubo ya está resuelto. Tocá "Mezclar" para jugar.'); return; }
  const m = sol[0];
  const idx = rbIndiceCara(m.eje, m.capa);
  const horario = rbEsHorario(m);
  let veces = 1;
  while (veces < sol.length && sol[veces].eje === m.eje && sol[veces].capa === m.capa && sol[veces].giro === m.giro) veces++;
  const boton = horario ? rbBotonesGiro[idx].horario : rbBotonesGiro[idx].anti;
  boton.classList.add('pista');
  rbMensaje('Pista: ' + (horario ? '↻' : '↺') + ' en la cara ' + RB_CARAS[idx].nombre +
            (veces > 1 ? ' (' + veces + ' veces)' : '') + '  ·  Faltan ' + sol.length + ' giros');
  rbTemporizadorPista = setTimeout(rbLimpiarPista, 7000);
}

// Resolver: el cubo se resuelve solo, giro a giro
function rbResolver() {
  if (!rbPuedeAyudar()) return;
  rbLimpiarPista();
  const sol = rbSolucion();
  if (sol.length === 0) { rbMensaje('El cubo ya está resuelto. Tocá "Mezclar" para jugar.'); return; }
  rbCola = sol.map(m => ({ eje: m.eje, capa: m.capa, giro: m.giro, dur: RB_MS_GIRO_RAPIDO + 60, tipo: 'resolver' }));
  rbEstado = 'automatico';
  rbBloquearControles(true);
  rbMensaje('Resolviendo en ' + sol.length + ' giros... mirá cómo se ordena.');
}

/* Algoritmos de la guía: se escriben con letras (U D F B R L, ' = antihorario, 2 = dos veces).
   'marco' dice qué cara hace de FRENTE: así el mismo algoritmo sirve desde cualquier lado.
   U y D son siempre la Blanca (arriba) y la Amarilla (abajo). */
const RB_MARCOS = {
  Verde:   { F: 'Verde',   R: 'Roja',    B: 'Azul',    L: 'Naranja' },
  Roja:    { F: 'Roja',    R: 'Azul',    B: 'Naranja', L: 'Verde' },
  Azul:    { F: 'Azul',    R: 'Naranja', B: 'Verde',   L: 'Roja' },
  Naranja: { F: 'Naranja', R: 'Verde',   B: 'Roja',    L: 'Azul' }
};

// "R U' F2"  ->  lista de giros de cuarto de vuelta, con las caras traducidas al marco elegido
function rbAlgoritmoAMovs(texto, marco) {
  const movs = [];
  for (const t of texto.trim().split(/\s+/)) {
    const letra = t[0];
    const nombre = letra === 'U' ? 'Blanca' : letra === 'D' ? 'Amarilla' : RB_MARCOS[marco || 'Verde'][letra];
    const cara = RB_CARAS.find(c => c.nombre === nombre);
    const giro = t.includes("'") ? -cara.signo : cara.signo;
    movs.push({ eje: cara.eje, capa: cara.signo, giro: giro });
    if (t.includes('2')) movs.push({ eje: cara.eje, capa: cara.signo, giro: giro });
  }
  return movs;
}

// Ejecuta un algoritmo sobre el cubo (cuenta como movimientos del jugador y se puede deshacer)
function rbJugarAlgoritmo(texto, marco) {
  if (!rbPuedeAyudar()) return;
  rbLimpiarPista();
  rbCola = rbAlgoritmoAMovs(texto, marco).map(m => ({ eje: m.eje, capa: m.capa, giro: m.giro, dur: RB_MS_GIRO_JUGADOR, tipo: 'secuencia' }));
  rbEstado = 'automatico';
  rbBloquearControles(true);
  rbMensaje('Aplicando el algoritmo...');
}

/* ---------- 8. INTERFAZ ---------- */
function rbMensaje(texto) {
  document.getElementById('rb-mensaje').textContent = texto;
}

function rbActualizarHUD() {
  if (rbModo === 'libre') {
    document.getElementById('rb-nivel').textContent = 'Estilo libre';
    document.getElementById('rb-movs').textContent = 'Movimientos: ' + rbJuego.movs;
    document.getElementById('rb-puntos').textContent = '';
    return;
  }
  document.getElementById('rb-nivel').textContent = 'Nivel ' + rbJuego.nivel;
  document.getElementById('rb-movs').textContent =
    'Movimientos: ' + rbJuego.movs + ' (mezcla: ' + rbJuego.mezcla + ')';
  document.getElementById('rb-puntos').textContent = rbJuego.puntos + ' pts';
}

function rbBloquearControles(bloquear) {
  document.querySelectorAll('.rb-giro, .rb-ayuda').forEach(b => { b.disabled = bloquear; });
}

// Crea los 12 botones (2 por cada cara) y conecta los demás
function rbConectarBotones() {
  const contenedor = document.getElementById('rb-controles');
  RB_CARAS.forEach((cara, idx) => {
    const css = 'rgb(' + cara.color.join(',') + ')';

    const grupo = document.createElement('div');
    grupo.className = 'rb-grupo';
    grupo.style.borderColor = css;

    const anti = document.createElement('button');
    anti.className = 'btn rb-giro';
    anti.textContent = '↺';
    anti.title = 'Cara ' + cara.nombre + ': sentido antihorario';
    anti.onclick = () => rbGirarCara(idx, false);

    const etiqueta = document.createElement('span');
    etiqueta.className = 'rb-etiqueta';
    etiqueta.textContent = cara.nombre;
    etiqueta.style.color = css;

    const horario = document.createElement('button');
    horario.className = 'btn rb-giro';
    horario.textContent = '↻';
    horario.title = 'Cara ' + cara.nombre + ': sentido horario';
    horario.onclick = () => rbGirarCara(idx, true);

    grupo.append(anti, etiqueta, horario);
    contenedor.appendChild(grupo);
    rbBotonesGiro[idx] = { anti: anti, horario: horario };
  });

  document.getElementById('btn-jugar-rubik').onclick = () => rbIniciar('desafio');
  document.getElementById('btn-rubik-libre').onclick = () => rbIniciar('libre');
  document.getElementById('rb-reiniciar').onclick = rbEmpezarNivel;   // nueva mezcla del mismo nivel
  document.getElementById('rb-mezclar').onclick = rbMezclarLibre;
  document.getElementById('rb-deshacer').onclick = rbDeshacer;
  document.getElementById('rb-resetear').onclick = rbResetearLibre;
  document.getElementById('rb-pista').onclick = rbPista;
  document.getElementById('rb-resolver').onclick = rbResolver;
  document.getElementById('rb-guia-btn').onclick = () => guiaAlternar();
  document.getElementById('rb-salir').onclick = mostrarMenu;
}

/* ---------- 9. MOUSE / TÁCTIL: arrastrar para girar la vista ---------- */
let rbArrastrando = false;

function rbMousePressed(evento) {
  if (evento && evento.target && evento.target.tagName !== 'CANVAS') return;
  rbArrastrando = true;
}

function rbMouseDragged() {
  if (!rbArrastrando) return;
  rbRotY += (mouseX - pmouseX) * 0.01;
  rbRotX -= (mouseY - pmouseY) * 0.01;
  rbRotX = constrain(rbRotX, -1.45, 1.45);     // evita que el cubo "se dé vuelta"
}

function rbMouseReleased() {
  rbArrastrando = false;
}
