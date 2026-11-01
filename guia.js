/* =====================================================================
   BRAIN CHALLENGE 3D  -  Guía para resolver el cubo Rubik (estilo libre)
   Materia: Informática Educativa 2

   Qué hace este archivo:
   - Muestra un panel con el método "capa por capa" en 7 pasos, explicado en
     español y con los algoritmos dibujados como botoncitos de colores.
   - Cada algoritmo tiene un botón "Hacerlo" que lo ejecuta sobre el cubo.
   - Un selector permite elegir qué cara se toma como "frente", porque en este
     juego las caras no se pueden reubicar: el mismo algoritmo se "traduce".

   Los algoritmos están en notación de letras (U D F B R L, ' = antihorario,
   2 = dos veces). Todos fueron probados con simulaciones sobre el modelo del cubo.
   ===================================================================== */

const GUIA_ALG = {
  esquina:   "R U R' U'",                      // paso 2 (se repite 1 a 5 veces)
  derecha:   "U R U' R' U' F' U F",            // paso 3: arista del medio hacia la derecha
  izquierda: "U' L' U L U F U' F'",            // paso 3: arista del medio hacia la izquierda
  cruzLinea: "F R U R' U' F'",                 // paso 4
  cruzL:     "F U R U' R' F'",                 // paso 4
  sune:      "R U R' U R U2 R'",               // paso 5
  esquinas:  "R' F R' B2 R F' R' B2 R2",       // paso 6
  aristas:   "R U' R U R U R U' R' U' R2"      // paso 7
};

let guiaMarco = 'Verde';        // cara que hace de "frente" en los pasos 2, 3, 6 y 7
let guiaAbierta = false;
let guiaAlgoritmos = [];        // { el (contenedor de botoncitos), texto, fijo }

const GUIA_COLOR_CSS = nombre => 'rgb(' + RB_CARAS.find(c => c.nombre === nombre).color.join(',') + ')';

// Dibuja un algoritmo como una fila de "chips": ↻ Roja, ↺ Blanca, ↻ Azul ×2 ...
function guiaPintarChips(contenedor, texto, marco) {
  contenedor.textContent = '';
  for (const t of texto.trim().split(/\s+/)) {
    const letra = t[0];
    const nombre = letra === 'U' ? 'Blanca' : letra === 'D' ? 'Amarilla' : RB_MARCOS[marco][letra];
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.style.borderColor = GUIA_COLOR_CSS(nombre);
    chip.textContent = (t.includes("'") ? '↺ ' : '↻ ') + nombre + (t.includes('2') ? ' ×2' : '');
    contenedor.appendChild(chip);
  }
}

// Bloque de un algoritmo: título + chips + botón "Hacerlo". 'fijo' = siempre con la Verde de frente.
function guiaBloqueAlg(titulo, texto, fijo) {
  const caja = document.createElement('div');
  caja.className = 'alg';
  const cab = document.createElement('div');
  cab.className = 'alg-cab';
  const t = document.createElement('strong');
  t.textContent = titulo;
  const hacer = document.createElement('button');
  hacer.className = 'btn secundario rb-ayuda';
  hacer.textContent = '▶ Hacerlo';
  hacer.onclick = () => rbJugarAlgoritmo(texto, fijo ? 'Verde' : guiaMarco);
  cab.append(t, hacer);
  const chips = document.createElement('div');
  chips.className = 'chips';
  caja.append(cab, chips);
  const reg = { el: chips, texto: texto, fijo: !!fijo };
  guiaAlgoritmos.push(reg);
  guiaPintarChips(chips, texto, reg.fijo ? 'Verde' : guiaMarco);
  return caja;
}

function guiaP(html) {
  const p = document.createElement('p');
  p.innerHTML = html;
  return p;
}

function guiaPaso(numero, titulo, elementos) {
  const d = document.createElement('details');
  const s = document.createElement('summary');
  s.innerHTML = '<span class="num">' + numero + '</span> ' + titulo;
  d.appendChild(s);
  for (const e of elementos) d.appendChild(e);
  return d;
}

function guiaConstruir() {
  const cuerpo = document.getElementById('rb-guia-cuerpo');
  cuerpo.textContent = '';
  guiaAlgoritmos = [];

  // ---- Antes de empezar
  const intro = guiaPaso('★', 'Antes de empezar', [
    guiaP('<strong>Los centros no se mueven.</strong> El color del centro de cada cara es "el color de esa cara". ' +
          'Vista inicial: Blanca arriba, Amarilla abajo, Verde al frente, Azul atrás, Roja a la derecha y Naranja a la izquierda.'),
    guiaP('<strong>↻</strong> = un cuarto de vuelta en sentido horario <em>mirando esa cara de frente</em>. ' +
          '<strong>↺</strong> = al revés. <strong>×2</strong> = dos veces. Arrastrá el cubo con el mouse (o el dedo) para mirarlo desde otro lado.'),
    guiaP('<strong>El método:</strong> se arma por capas, de abajo hacia arriba. Primero la capa Amarilla (pasos 1 y 2), ' +
          'después la del medio (paso 3) y al final la capa Blanca (pasos 4 a 7). Cada paso termina cuando se cumple su <em>meta</em>.'),
    guiaP('<strong>Pista y Resolver:</strong> el juego recuerda cómo mezclaste el cubo, así que sabe el camino de vuelta. ' +
          '"Pista" te marca el próximo giro y "Resolver" lo hace solo. Esta guía, en cambio, sirve para resolver <em>cualquier</em> cubo, ' +
          'incluso uno de verdad.'),
    guiaP('<small>Si leés libros o videos: U = Blanca, D = Amarilla, F = Verde, B = Azul, R = Roja, L = Naranja ' +
          '(la letra con apóstrofo es ↺ y con 2 es ×2).</small>')
  ]);
  intro.open = true;

  // ---- Paso 1
  const p1 = guiaPaso(1, 'Cruz amarilla (abajo)', [
    guiaP('<strong>Meta:</strong> las 4 aristas con amarillo (las piezas de dos colores) en la cara Amarilla, ' +
          'y el otro color de cada una igual al centro de su cara lateral.'),
    guiaP('Este paso se hace pensando, sin algoritmo. Para cada arista amarilla:'),
    guiaP('1) Llevala a la capa de arriba (Blanca), con el amarillo mirando <em>hacia arriba</em>.<br>' +
          '2) Girá la cara Blanca hasta que el otro color de la pieza quede justo sobre el centro de ese mismo color.<br>' +
          '3) Girá esa cara lateral <strong>×2</strong>: la arista baja a su lugar.'),
    guiaP('Las aristas que ya pusiste abajo no se rompen con ese ×2. Si una arista amarilla quedó de costado, ' +
          'sacala con un giro de su cara y volvé a intentar. Si te trabás, usá <strong>Pista</strong>.')
  ]);

  // ---- Paso 2
  const p2 = guiaPaso(2, 'Esquinas amarillas (completar la capa Amarilla)', [
    guiaP('<strong>Meta:</strong> toda la cara Amarilla amarilla, con una franja del color de cada centro en los costados.'),
    guiaP('1) Buscá una esquina con amarillo en la capa Blanca.<br>' +
          '2) Girá la Blanca hasta ponerla <em>justo arriba de su hueco</em>: el hueco queda entre los dos centros cuyos colores tiene la esquina.<br>' +
          '3) Elegí de frente la cara que deja ese hueco <strong>abajo a la derecha</strong> (Verde–Roja → frente Verde; Roja–Azul → frente Roja; ' +
          'Azul–Naranja → frente Azul; Naranja–Verde → frente Naranja).<br>' +
          '4) Repetí el algoritmo hasta que el amarillo mire hacia abajo (entre 1 y 5 veces). <strong>No pares a la mitad</strong>: al repetirlo, solo se mueve esa esquina y la capa de arriba.')
  ].concat([guiaBloqueAlg('Esquina (repetir)', GUIA_ALG.esquina)]));

  // ---- Paso 3
  const p3 = guiaPaso(3, 'Capa del medio', [
    guiaP('<strong>Meta:</strong> las 4 aristas del medio (sin blanco ni amarillo) en su lugar.'),
    guiaP('1) Buscá en la capa Blanca una arista que <em>no tenga blanco</em>.<br>' +
          '2) Girá la Blanca hasta que el color de su cara lateral coincida con el centro de esa cara, y elegila de frente.<br>' +
          '3) Mirá el color que tiene arriba: si es el de la cara de la <strong>derecha</strong> usá "Derecha"; si es el de la <strong>izquierda</strong>, "Izquierda".'),
    guiaBloqueAlg('Derecha', GUIA_ALG.derecha),
    guiaBloqueAlg('Izquierda', GUIA_ALG.izquierda),
    guiaP('Si arriba no quedan aristas sin blanco pero una del medio está mal puesta, aplicá uno de los algoritmos con ella en el lugar de la derecha: la saca hacia arriba y después la ubicás bien.')
  ]);

  // ---- Paso 4
  const p4 = guiaPaso(4, 'Cruz blanca arriba', [
    guiaP('<strong>Meta:</strong> las 4 aristas de la cara Blanca con el blanco hacia arriba (formando una cruz). ' +
          'Acá no importa que los colores de los costados coincidan. <em>Mirá siempre con la Verde de frente.</em>'),
    guiaP('Mirá la cara Blanca y contá cuántas aristas tienen blanco arriba:<br>' +
          '• <strong>Ninguna</strong> (solo el centro): aplicá "Línea" una vez y mirá de nuevo.<br>' +
          '• <strong>Una línea</strong> de dos: girá la Blanca para dejarla horizontal (izquierda–derecha) y aplicá "Línea".<br>' +
          '• <strong>Una L</strong> de dos: girá la Blanca para que la L apunte hacia atrás y a la izquierda, y aplicá "L".<br>' +
          '• <strong>Las 4</strong>: listo. Repetí hasta lograrlo (máximo 3 veces).'),
    guiaBloqueAlg('Línea', GUIA_ALG.cruzLinea, true),
    guiaBloqueAlg('L', GUIA_ALG.cruzL, true)
  ]);

  // ---- Paso 5
  const p5 = guiaPaso(5, 'Esquinas blancas hacia arriba (Sune)', [
    guiaP('<strong>Meta:</strong> toda la cara Blanca blanca. <em>Verde de frente.</em> Contá las esquinas con blanco hacia arriba y, con la Blanca, ' +
          'poné en el lugar <strong>adelante a la izquierda</strong>:<br>' +
          '• <strong>Si hay 1</strong> con blanco arriba: esa esquina.<br>' +
          '• <strong>Si hay 0</strong>: una esquina con el blanco mirando a la izquierda (hacia la Naranja).<br>' +
          '• <strong>Si hay 2</strong>: una esquina con el blanco mirando al frente (hacia la Verde).<br>' +
          'Después aplicá "Sune" y volvé a contar. Se repite hasta 3 veces. Mientras lo hacés las capas de abajo se desordenan un instante, pero vuelven solas.'),
    guiaBloqueAlg('Sune', GUIA_ALG.sune, true)
  ]);

  // ---- Paso 6
  const p6 = guiaPaso(6, 'Esquinas en su lugar', [
    guiaP('<strong>Meta:</strong> que las 4 esquinas de arriba estén en su lugar: una esquina está "bien" si sus colores coinciden con los centros que toca.'),
    guiaP('1) Girá la Blanca hasta tener la <strong>mayor cantidad</strong> de esquinas bien. Si son 4, pasá al paso 7.<br>' +
          '2) <strong>Si hay 1 bien:</strong> elegí de frente la cara que deja esa esquina adelante a la izquierda.<br>' +
          '3) <strong>Si hay 2 bien y son vecinas:</strong> elegí de frente la cara opuesta al lado donde están (las dos quedan atrás).<br>' +
          '4) Si no hay ninguna o las dos bien están en diagonal: cualquier frente sirve.<br>' +
          '5) Aplicá "Esquinas" y repetí desde el 1 (hace falta 1 o 2 veces).'),
    guiaBloqueAlg('Esquinas', GUIA_ALG.esquinas)
  ]);

  // ---- Paso 7
  const p7 = guiaPaso(7, 'Aristas finales', [
    guiaP('<strong>Meta:</strong> el cubo resuelto. Una arista está "bien" si sus dos colores coinciden con los centros que toca. No gires la Blanca: las esquinas ya quedaron alineadas.'),
    guiaP('• <strong>Las 4 bien:</strong> ¡terminaste!<br>' +
          '• <strong>Hay 1 bien:</strong> elegí de frente la cara opuesta a esa arista (así queda atrás).<br>' +
          '• <strong>Ninguna bien:</strong> cualquier frente sirve.<br>' +
          'Aplicá "Aristas" y mirá de nuevo (hace falta 1 a 3 veces).'),
    guiaBloqueAlg('Aristas', GUIA_ALG.aristas)
  ]);

  for (const d of [intro, p1, p2, p3, p4, p5, p6, p7]) cuerpo.appendChild(d);
}

// Selector de la cara que hace de frente (pasos 2, 3, 6 y 7)
function guiaConstruirSelector() {
  const sel = document.getElementById('rb-guia-marco');
  sel.textContent = '';
  for (const nombre of Object.keys(RB_MARCOS)) {
    const b = document.createElement('button');
    b.className = 'btn secundario' + (nombre === guiaMarco ? ' activo' : '');
    b.textContent = nombre;
    b.style.borderColor = GUIA_COLOR_CSS(nombre);
    b.onclick = () => {
      guiaMarco = nombre;
      sel.querySelectorAll('.btn').forEach(x => x.classList.toggle('activo', x === b));
      for (const a of guiaAlgoritmos) if (!a.fijo) guiaPintarChips(a.el, a.texto, guiaMarco);
    };
    sel.appendChild(b);
  }
}

function guiaAbrir() {
  guiaAbierta = true;
  document.getElementById('rb-guia').classList.remove('oculto');
  document.getElementById('hud-rubik').classList.add('con-guia');
}

function guiaCerrar() {
  guiaAbierta = false;
  document.getElementById('rb-guia').classList.add('oculto');
  document.getElementById('hud-rubik').classList.remove('con-guia');
}

function guiaAlternar() { guiaAbierta ? guiaCerrar() : guiaAbrir(); }

function guiaIniciar() {
  guiaConstruir();
  guiaConstruirSelector();
  document.getElementById('rb-guia-cerrar').onclick = guiaCerrar;
}
