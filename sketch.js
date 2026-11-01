/* =====================================================================
   BRAIN CHALLENGE 3D  -  Prototipo 1: Grilla de memoria en cubo giratorio
   Materia: Informática Educativa 2
   Tecnología: p5.js (modo WEBGL)
   ===================================================================== */

/* ---------- 1. CONFIGURACIÓN GENERAL ---------- */
const TAM_CUBITO = 36;      // tamaño de cada cubito (más chico = se tapan menos entre sí)
const SEPARACION = 80;      // distancia entre centros de cubitos
const VIDAS_INICIALES = 3;

/* ---------- 1b. DIFICULTAD (acá se ajusta todo) ---------- */
const CUBITOS_NIVEL_1 = 3;          // cuántos hay que recordar en el nivel 1 (suma 1 por nivel)
const CUBITOS_MAXIMO = 10;
const MEMORIZAR_INICIAL_MS = 6000;  // tiempo para memorizar en el nivel 1
const MEMORIZAR_MINIMO_MS = 3000;   // el tiempo nunca baja de esto
const MEMORIZAR_BAJA_POR_NIVEL = 250;
const VELOCIDAD_GIRO_LENTO = 0.0006; // giro suave mientras memorizás (para ver todos los lados)
const NIVEL_DONDE_EMPIEZA_GIRO = 3; // antes de este nivel el cubo NO gira (solo memoria)
const GIRO_INICIAL = 0.5;           // radianes del primer giro (0.5 = unos 30°)
const GIRO_EXTRA_POR_NIVEL = 0.25;  // cuánto crece el giro en cada nivel (máx. 180°)

/* ---------- 2. COLORES ---------- */
let COL;                    // se crea en setup() porque usa color() de p5
function crearColores() {
  COL = {
    apagado:  color(54, 66, 108),
    memoria:  color(0, 229, 255),    // cubitos a memorizar
    elegido:  color(255, 152, 0),    // cubitos que marcó el jugador
    acierto:  color(46, 204, 113),   // elegido y era correcto
    error:    color(231, 76, 60),    // elegido pero NO era
    omitido:  color(241, 196, 15)    // era correcto y no lo elegió
  };
}

/* ---------- 3. ESTADO DEL JUEGO ---------- */
// Estados posibles: 'menu' | 'memorizar' | 'girando' | 'responder' | 'resultado'
let estado = 'menu';
let juego = nuevoJuego();
let temporizador = null;    // para poder cancelar esperas si se sale al menú

function nuevoJuego() {
  return {
    nivel: 1,
    vidas: VIDAS_INICIALES,
    puntos: 0,
    objetivos: new Set(),   // ids de los cubitos a recordar
    elegidos: new Set()     // ids de los cubitos que marcó el jugador
  };
}

/* ---------- 4. GEOMETRÍA: el cubo de 3x3x3 (sin el centro) ---------- */
const cubitos = [];         // cada uno: { id, x, y, z }
function construirCubitos() {
  let id = 1;
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      for (let k = -1; k <= 1; k++) {
        if (i === 0 && j === 0 && k === 0) continue; // el del centro quedaría oculto
        cubitos.push({ id: id++, x: i * SEPARACION, y: j * SEPARACION, z: k * SEPARACION });
      }
    }
  }
}

/* ---------- 5. ROTACIÓN (vista del cubo) ---------- */
let rotX = -0.5, rotY = 0.6;
let animacion = null;       // animación de giro automático

function iniciarGiro(duracionMs, deltaX, deltaY, alTerminar) {
  animacion = {
    t0: millis(), dur: duracionMs,
    x0: rotX, y0: rotY,
    x1: rotX + deltaX, y1: rotY + deltaY,
    alTerminar: alTerminar
  };
}

function actualizarGiro() {
  if (!animacion) return;
  let t = (millis() - animacion.t0) / animacion.dur;
  if (t >= 1) {
    rotX = animacion.x1;
    rotY = animacion.y1;
    const cb = animacion.alTerminar;
    animacion = null;
    if (cb) cb();
    return;
  }
  const suave = t * t * (3 - 2 * t);          // arranca y frena suave
  rotX = lerp(animacion.x0, animacion.x1, suave);
  rotY = lerp(animacion.y0, animacion.y1, suave);
}

/* ---------- 6. p5.js: setup / draw ---------- */
let bufferPicking;          // lienzo oculto para detectar clics (color picking)

function setup() {
  const lienzo = createCanvas(windowWidth, windowHeight, WEBGL);
  lienzo.parent('lienzo');
  pixelDensity(1);          // evita desfasajes entre pantalla y buffer

  bufferPicking = createGraphics(windowWidth, windowHeight, WEBGL);
  bufferPicking.pixelDensity(1);
  bufferPicking.setAttributes('antialias', false); // colores exactos, sin mezcla en bordes
  bufferPicking.noStroke();

  crearColores();
  construirCubitos();
  conectarBotones();
  mostrarMenu();
}

function draw() {
  if (rbActivo) { rbDibujar(); return; }   // minijuego del cubo Rubik (rubik.js)
  if (ttActivo) { ttDibujar(); return; }   // minijuego Ta-Te-Ti (tateti.js)

  background(10, 12, 20);
  actualizarGiro();

  // En el menú el cubo gira solo, como decoración
  if (estado === 'menu') rotY += 0.004;

  // Mientras memorizás, el cubo gira despacio para que veas todos los lados
  // (se frena si estás arrastrándolo vos)
  if (estado === 'memorizar' && !arrastrando) rotY += VELOCIDAD_GIRO_LENTO * deltaTime;

  ambientLight(80);
  directionalLight(255, 255, 255, -0.4, 0.6, -1);
  directionalLight(110, 130, 255, 0.6, -0.3, -0.5);

  dibujarCubitos(window, false);
}

/* Dibuja los cubitos en 'g' (el lienzo principal o el buffer de picking).
   Si 'picking' es true, cada cubito se pinta con un color único = su id. */
function dibujarCubitos(g, picking) {
  g.push();
  g.scale(min(width, height) / 650);   // se adapta al tamaño de pantalla
  g.rotateX(rotX);
  g.rotateY(rotY);
  g.noStroke();

  for (const c of cubitos) {
    g.push();
    g.translate(c.x, c.y, c.z);
    if (picking) g.fill(c.id * 8, 0, 0);   // el id viaja en el canal rojo
    else g.fill(colorDelCubito(c.id));
    g.box(TAM_CUBITO);
    g.pop();
  }
  g.pop();
}

function colorDelCubito(id) {
  const esObjetivo = juego.objetivos.has(id);
  const esElegido = juego.elegidos.has(id);

  if (estado === 'memorizar' && esObjetivo) return COL.memoria;
  if (estado === 'responder' && esElegido) return COL.elegido;
  if (estado === 'resultado') {
    if (esObjetivo && esElegido) return COL.acierto;
    if (!esObjetivo && esElegido) return COL.error;
    if (esObjetivo && !esElegido) return COL.omitido;
  }
  return COL.apagado;
}

/* ---------- 7. FLUJO DE LA PARTIDA ---------- */
function empezarPartida() {
  juego = nuevoJuego();
  mostrarHUD();
  empezarRonda();
}

function empezarRonda() {
  // Cantidad de cubitos a recordar: nivel 1 = 3, nivel 2 = 4, ... (máx. 10)
  const cantidad = min(CUBITOS_NIVEL_1 - 1 + juego.nivel, CUBITOS_MAXIMO);
  const ids = cubitos.map(c => c.id);
  shuffle(ids, true);
  juego.objetivos = new Set(ids.slice(0, cantidad));
  juego.elegidos = new Set();

  estado = 'memorizar';
  actualizarHUD('¡Memorizá los cubitos iluminados! (podés arrastrar para verlos)');
  document.getElementById('btn-confirmar').classList.add('oculto');

  // Tiempo para memorizar: baja con el nivel, pero nunca menos del mínimo
  const tiempoMs = max(MEMORIZAR_MINIMO_MS,
                       MEMORIZAR_INICIAL_MS - (juego.nivel - 1) * MEMORIZAR_BAJA_POR_NIVEL);
  temporizador = setTimeout(empezarGiro, tiempoMs);
}

function empezarGiro() {
  // Niveles iniciales: el cubo NO gira, es memoria pura (andamiaje)
  const nivelGiro = juego.nivel - NIVEL_DONDE_EMPIEZA_GIRO + 1;
  if (nivelGiro <= 0) {
    estado = 'responder';
    actualizarHUD('Tocá los cubitos que recordás');
    document.getElementById('btn-confirmar').classList.remove('oculto');
    return;
  }

  estado = 'girando';
  actualizarHUD('Mirá cómo gira el cubo...');

  // Cuanto más nivel, más grande es el giro (rotación mental más exigente).
  // Primero solo gira de costado (eje Y); recién después también se inclina (eje X).
  const amplitud = min(PI, GIRO_INICIAL + GIRO_EXTRA_POR_NIVEL * (nivelGiro - 1));
  const giroY = random([-1, 1]) * random(amplitud * 0.6, amplitud);
  const giroX = nivelGiro >= 3 ? random(-1, 1) * amplitud * 0.5 : 0;

  iniciarGiro(1800, giroX, giroY, () => {
    estado = 'responder';
    actualizarHUD('Tocá los cubitos que recordás');
    document.getElementById('btn-confirmar').classList.remove('oculto');
  });
}

function confirmarRespuesta() {
  if (estado !== 'responder') return;
  document.getElementById('btn-confirmar').classList.add('oculto');

  let aciertos = 0;
  for (const id of juego.elegidos) if (juego.objetivos.has(id)) aciertos++;
  const errores = juego.elegidos.size - aciertos;
  const perfecto = (aciertos === juego.objetivos.size && errores === 0);

  estado = 'resultado';
  if (perfecto) {
    juego.puntos += juego.objetivos.size * 10 + juego.nivel * 5;
    actualizarHUD('¡Perfecto! Pasás al nivel ' + (juego.nivel + 1));
  } else {
    juego.vidas--;
    actualizarHUD('Verde: acierto · Rojo: error · Amarillo: lo que faltó');
  }
  actualizarHUD(null);

  temporizador = setTimeout(() => {
    if (perfecto) juego.nivel++;
    if (juego.vidas <= 0) terminarPartida();
    else empezarRonda();
  }, 3000);
}

function terminarPartida() {
  estado = 'menu';
  document.getElementById('hud').classList.add('oculto');
  document.getElementById('fin-texto').textContent =
    'Llegaste al nivel ' + juego.nivel + ' con ' + juego.puntos + ' puntos.';
  document.getElementById('fin').classList.remove('oculto');
}

/* ---------- 8. INTERFAZ (HTML) ---------- */
function mostrarMenu() {
  rbSalir();                       // por si veníamos del cubo Rubik
  ttSalir();                       // por si veníamos del Ta-Te-Ti
  clearTimeout(temporizador);
  animacion = null;
  estado = 'menu';
  juego = nuevoJuego();
  document.getElementById('hud').classList.add('oculto');
  document.getElementById('fin').classList.add('oculto');
  document.getElementById('menu').classList.remove('oculto');
}

function mostrarHUD() {
  document.getElementById('menu').classList.add('oculto');
  document.getElementById('fin').classList.add('oculto');
  document.getElementById('hud').classList.remove('oculto');
}

// Si se pasa un texto, lo muestra en el mensaje. Siempre refresca nivel/vidas/puntos.
function actualizarHUD(texto) {
  if (texto) document.getElementById('mensaje').textContent = texto;
  document.getElementById('hud-nivel').textContent = 'Nivel ' + juego.nivel;
  document.getElementById('hud-vidas').textContent = '♥'.repeat(max(0, juego.vidas));
  document.getElementById('hud-puntos').textContent = juego.puntos + ' pts';
}

function conectarBotones() {
  const $ = id => document.getElementById(id);
  $('btn-jugar1').onclick = empezarPartida;
  $('btn-info').onclick = () => $('info').classList.remove('oculto');
  $('btn-cerrar-info').onclick = () => $('info').classList.add('oculto');
  $('btn-confirmar').onclick = confirmarRespuesta;
  $('btn-salir').onclick = mostrarMenu;
  $('btn-reintentar').onclick = empezarPartida;
  $('btn-menu').onclick = mostrarMenu;
  rbConectarBotones();             // botones del cubo Rubik (rubik.js)
  guiaIniciar();                   // panel de ayuda del Rubik (guia.js)
  ttConectarBotones();             // botones del Ta-Te-Ti (tateti.js)
}

/* ---------- 9. MOUSE / TÁCTIL: arrastrar para girar, clic para elegir ---------- */
let arrastrando = false;
let seMovio = false;
let inicioX = 0, inicioY = 0;

function mousePressed(evento) {
  if (rbActivo) { rbMousePressed(evento); return; }
  if (ttActivo) { ttMousePressed(evento); return; }
  // Ignorar clics sobre botones u otros elementos HTML
  if (evento && evento.target && evento.target.tagName !== 'CANVAS') return;
  arrastrando = true;
  seMovio = false;
  inicioX = mouseX;
  inicioY = mouseY;
}

function mouseDragged() {
  if (rbActivo) { rbMouseDragged(); return; }
  if (ttActivo) { ttMouseDragged(); return; }
  if (!arrastrando || estado === 'girando' || estado === 'menu') return;
  if (dist(mouseX, mouseY, inicioX, inicioY) > 6) seMovio = true;
  rotY += (mouseX - pmouseX) * 0.01;
  rotX -= (mouseY - pmouseY) * 0.01;
}

function mouseReleased() {
  if (rbActivo) { rbMouseReleased(); return; }
  if (ttActivo) { ttMouseReleased(); return; }
  if (!arrastrando) return;
  arrastrando = false;
  if (seMovio || estado !== 'responder') return;   // fue un arrastre, no un clic

  const id = idBajoElMouse();
  if (id < 1 || id > cubitos.length) return;
  if (juego.elegidos.has(id)) juego.elegidos.delete(id);
  else juego.elegidos.add(id);
}

/* Color picking: dibujamos la escena en el buffer oculto con un color único por
   cubito y leemos el color del píxel donde está el mouse. */
function idBajoElMouse() {
  bufferPicking.background(0);
  dibujarCubitos(bufferPicking, true);
  const px = bufferPicking.get(mouseX, mouseY);
  return round(px[0] / 8);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  bufferPicking.resizeCanvas(windowWidth, windowHeight);
}
