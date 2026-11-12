import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ---------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------
const SUPABASE_URL = 'https://sjwaxmjywopoolirhllq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nCD_v96qPwEqNAPIKkCYMw_PEX7Ilpb';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
});

const CATS = [
  { id: 'comida', label: 'Comida' },
  { id: 'cena', label: 'Cena' },
  { id: 'otros', label: 'Otros' },
  { id: 'todo', label: 'Todo' }
];
const CAT_LABEL = { comida: 'Comida', cena: 'Cena', otros: 'Otros' };

// ---------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------
const state = {
  session: null,
  invitado: false,
  admin: false,
  recetas: loadCache(),
  cargado: false,
  offline: false,
  filtro: localStorage.getItem('filtro') || 'todo',
  busqueda: '',
  invitados: []
};

const app = document.getElementById('app');

// ---------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const lines = (s) => String(s ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
const myEmail = () => (state.session?.user?.email || '').toLowerCase();
const myId = () => state.session?.user?.id;
const canEdit = (r) => state.admin || (r.autor && r.autor === myId());

function loadCache() {
  try { return JSON.parse(localStorage.getItem('recetas_cache') || '[]'); } catch { return []; }
}
function saveCache() {
  try { localStorage.setItem('recetas_cache', JSON.stringify(state.recetas)); } catch { /* sin espacio */ }
}

let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

function confirmar({ titulo, texto, ok = 'Aceptar', peligro = false }) {
  return new Promise((resolve) => {
    const m = document.getElementById('modal');
    m.innerHTML = `
      <div class="dialog" role="dialog" aria-modal="true">
        <h3>${esc(titulo)}</h3>
        <p>${esc(texto)}</p>
        <div class="actions" style="margin-top:0">
          <button class="btn" data-r="0">Cancelar</button>
          <button class="btn ${peligro ? 'danger' : 'primary'}" data-r="1">${esc(ok)}</button>
        </div>
      </div>`;
    m.hidden = false;
    const close = (v) => { m.hidden = true; m.innerHTML = ''; resolve(v); };
    m.onclick = (e) => {
      if (e.target === m) return close(false);
      const b = e.target.closest('button[data-r]');
      if (b) close(b.dataset.r === '1');
    };
  });
}

const ICON = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  google: '<svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>'
};

const logo = '<span class="recre">Recre</span>Recetas';

// ---------------------------------------------------------------------
// Datos
// ---------------------------------------------------------------------
async function comprobarAcceso() {
  const [inv, adm] = await Promise.all([sb.rpc('es_invitado'), sb.rpc('es_admin')]);
  if (inv.error) throw inv.error;
  state.invitado = !!inv.data;
  state.admin = !!adm.data;
}

async function cargarRecetas() {
  const { data, error } = await sb.from('recetas').select('*').order('titulo', { ascending: true });
  if (error) {
    state.offline = !navigator.onLine;
    if (!state.offline) toast('No se pudieron cargar las recetas');
    return;
  }
  state.offline = false;
  state.recetas = data;
  state.cargado = true;
  saveCache();
}

async function cargarInvitados() {
  const { data, error } = await sb.from('invitados').select('*').order('creado', { ascending: true });
  if (error) { toast('No se pudo cargar la lista de invitados'); return; }
  state.invitados = data;
}

// ---------------------------------------------------------------------
// Vistas
// ---------------------------------------------------------------------
function vistaLogin() {
  app.innerHTML = `
    <div class="center">
      <div class="hero">
        <img src="icons/icon-192.png" alt="">
        <h1>${logo}</h1>
        <p>El recetario de los amigos. Entra con tu cuenta de Google.</p>
        <button class="google-btn" id="login">${ICON.google}Entrar con Google</button>
      </div>
    </div>`;
  document.getElementById('login').onclick = async () => {
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: 'select_account' } }
    });
    if (error) toast('Error al iniciar sesión: ' + error.message);
  };
}

function vistaNoInvitado() {
  app.innerHTML = `
    <div class="center">
      <div class="hero">
        <img src="icons/icon-192.png" alt="">
        <h1>${logo}</h1>
        <p>La cuenta <strong>${esc(myEmail())}</strong> todavía no está invitada. Pide a quien te pasó el enlace que te añada y vuelve a entrar.</p>
        <button class="btn primary" id="retry" style="flex:none">Ya me han invitado</button><br>
        <button class="linklike" id="logout">Entrar con otra cuenta</button>
      </div>
    </div>`;
  document.getElementById('retry').onclick = () => arrancar();
  document.getElementById('logout').onclick = salir;
}

function vistaError(msg) {
  app.innerHTML = `
    <div class="center">
      <div class="hero">
        <h1>${logo}</h1>
        <p>${esc(msg)}</p>
        <button class="btn primary" id="retry" style="flex:none">Reintentar</button><br>
        <button class="linklike" id="logout">Cerrar sesión</button>
      </div>
    </div>`;
  document.getElementById('retry').onclick = () => arrancar();
  document.getElementById('logout').onclick = salir;
}

function listaHTML() {
  const q = norm(state.busqueda);
  const lista = state.recetas
    .filter((r) => state.filtro === 'todo' || r.categoria === state.filtro)
    .filter((r) => !q || norm(r.titulo).includes(q) || (r.ingredientes || []).some((i) => norm(i).includes(q)));
  if (lista.length) return lista.map(tarjeta).join('');
  if (q) return '<p class="empty">Nada coincide con la búsqueda.</p>';
  return `<p class="empty">${state.cargado || state.recetas.length ? 'No hay recetas aquí todavía.' : 'Cargando…'}</p>`;
}

function vistaLista() {
  app.innerHTML = `
    <header class="top">
      <h1>${logo}</h1>
      <button class="icon-btn" id="menu-btn" aria-label="Menú">${ICON.menu}</button>
    </header>
    ${state.offline ? '<div class="offline">Sin conexión: estás viendo la última copia guardada.</div>' : ''}
    <nav class="tabs" aria-label="Categorías">
      ${CATS.map((c) => `<button class="tab" data-cat="${c.id}" aria-pressed="${state.filtro === c.id}">${c.label}</button>`).join('')}
    </nav>
    <input class="search" id="search" type="search" placeholder="Buscar receta o ingrediente" value="${esc(state.busqueda)}" autocomplete="off">
    <section class="list" id="list">${listaHTML()}</section>
    <button class="fab" id="nueva">${ICON.plus}Nueva</button>`;

  const list = document.getElementById('list');
  app.querySelectorAll('.tab').forEach((b) => b.onclick = () => {
    state.filtro = b.dataset.cat;
    localStorage.setItem('filtro', state.filtro);
    app.querySelectorAll('.tab').forEach((x) => x.setAttribute('aria-pressed', x === b));
    list.innerHTML = listaHTML();
  });
  const s = document.getElementById('search');
  s.oninput = () => { state.busqueda = s.value; list.innerHTML = listaHTML(); };
  document.getElementById('nueva').onclick = () => ir('#/nueva');
  document.getElementById('menu-btn').onclick = abrirMenu;
}

function tarjeta(r) {
  return `
    <a class="card" href="#/receta/${r.id}">
      <h3>${esc(r.titulo)}</h3>
      <div class="meta">
        ${state.filtro === 'todo' ? `<span class="chip ${r.categoria}">${CAT_LABEL[r.categoria]}</span>` : ''}
        <span>${r.raciones} ${r.raciones === 1 ? 'ración' : 'raciones'}</span>
        ${r.autor_nombre ? `<span>· ${esc(r.autor_nombre)}</span>` : ''}
      </div>
    </a>`;
}

function abrirMenu(e) {
  e.stopPropagation();
  cerrarMenu();
  const m = document.createElement('div');
  m.className = 'menu';
  m.id = 'menu';
  m.innerHTML = `
    <div class="who">${esc(myEmail())}${state.admin ? ' · admin' : ''}</div>
    ${state.admin ? '<button data-a="invitados">Gestionar invitados</button>' : ''}
    <button data-a="compartir">Compartir enlace</button>
    <button data-a="recargar">Recargar recetas</button>
    <button data-a="salir">Cerrar sesión</button>`;
  document.body.appendChild(m);
  m.onclick = async (ev) => {
    const a = ev.target.closest('button')?.dataset.a;
    cerrarMenu();
    if (a === 'invitados') ir('#/invitados');
    if (a === 'salir') salir();
    if (a === 'recargar') { await cargarRecetas(); render(); toast('Recetas actualizadas'); }
    if (a === 'compartir') compartir();
  };
  setTimeout(() => document.addEventListener('click', cerrarMenu, { once: true }), 0);
}
function cerrarMenu() { document.getElementById('menu')?.remove(); }

async function compartir() {
  const url = location.origin + location.pathname;
  const texto = 'Únete a RecreRecetas, el recetario de los amigos';
  try {
    if (navigator.share) await navigator.share({ title: 'RecreRecetas', text: texto, url });
    else { await navigator.clipboard.writeText(url); toast('Enlace copiado'); }
  } catch { /* cancelado */ }
}

function vistaDetalle(id) {
  const r = state.recetas.find((x) => x.id === id);
  if (!r) { app.innerHTML = '<p class="empty">Receta no encontrada.</p>'; return; }
  app.innerHTML = `
    <header class="top">
      <button class="icon-btn" id="back" aria-label="Volver">${ICON.back}</button>
      <h2></h2>
    </header>
    <article class="detail">
      <h1>${esc(r.titulo)}</h1>
      <div class="meta">
        <span class="chip ${r.categoria}">${CAT_LABEL[r.categoria]}</span>
        <span>${r.raciones} ${r.raciones === 1 ? 'ración' : 'raciones'}</span>
        ${r.autor_nombre ? `<span>· ${esc(r.autor_nombre)}</span>` : ''}
      </div>
      <div class="section">
        <h4>Ingredientes</h4>
        <ul class="ingredients">
          ${(r.ingredientes || []).map((i) => `<li><label><input type="checkbox"><span>${esc(i)}</span></label></li>`).join('')}
        </ul>
      </div>
      ${(r.instrucciones || []).length ? `
      <div class="section">
        <h4>Preparación</h4>
        <ol class="steps">${r.instrucciones.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>
      </div>` : ''}
      ${r.notas ? `<div class="section"><h4>Notas</h4><p class="notes">${esc(r.notas)}</p></div>` : ''}
      ${canEdit(r) || state.admin ? `
      <div class="actions">
        ${canEdit(r) ? '<button class="btn" id="editar">Editar</button>' : ''}
        ${state.admin ? '<button class="btn danger" id="borrar">Borrar</button>' : ''}
      </div>` : ''}
    </article>`;
  document.getElementById('back').onclick = volver;
  document.getElementById('editar')?.addEventListener('click', () => ir(`#/editar/${r.id}`));
  document.getElementById('borrar')?.addEventListener('click', async () => {
    const ok = await confirmar({ titulo: '¿Borrar receta?', texto: `"${r.titulo}" se borrará para todos.`, ok: 'Borrar', peligro: true });
    if (!ok) return;
    const { error } = await sb.from('recetas').delete().eq('id', r.id);
    if (error) return toast('No se pudo borrar: ' + error.message);
    state.recetas = state.recetas.filter((x) => x.id !== r.id);
    saveCache();
    toast('Receta borrada');
    ir('#/', true);
  });
}

function vistaForm(id) {
  const r = id ? state.recetas.find((x) => x.id === id) : null;
  if (id && (!r || !canEdit(r))) { ir('#/', true); return; }
  const cat = r?.categoria || (state.filtro !== 'todo' ? state.filtro : 'comida');

  app.innerHTML = `
    <header class="top">
      <button class="icon-btn" id="back" aria-label="Volver">${ICON.back}</button>
      <h2>${r ? 'Editar receta' : 'Nueva receta'}</h2>
    </header>
    <form id="form" autocomplete="off">
      <div class="field">
        <span>Categoría</span>
        <div class="seg">
          ${CATS.filter((c) => c.id !== 'todo').map((c) => `<button type="button" class="tab" data-cat="${c.id}" aria-pressed="${cat === c.id}">${c.label}</button>`).join('')}
        </div>
      </div>
      <label class="field"><span>Nombre</span>
        <input name="titulo" required maxlength="120" value="${esc(r?.titulo)}" placeholder="Ej.: Tortilla de patatas">
      </label>
      <div class="field"><span>Raciones</span>
        <div class="stepper">
          <button type="button" data-d="-1" aria-label="Menos">−</button>
          <input name="raciones" type="number" inputmode="numeric" min="1" max="50" value="${r?.raciones ?? 2}">
          <button type="button" data-d="1" aria-label="Más">+</button>
        </div>
      </div>
      <label class="field"><span>Ingredientes <small>(uno por línea)</small></span>
        <textarea name="ingredientes" placeholder="300 g de col blanca&#10;2 huevos">${esc((r?.ingredientes || []).join('\n'))}</textarea>
      </label>
      <label class="field"><span>Preparación <small>(un paso por línea)</small></span>
        <textarea name="instrucciones" placeholder="Picar la col fina&#10;Mezclar con los huevos">${esc((r?.instrucciones || []).join('\n'))}</textarea>
      </label>
      <label class="field"><span>Notas <small>(opcional)</small></span>
        <textarea name="notas" style="min-height:80px" placeholder="Variantes, kcal, trucos…">${esc(r?.notas)}</textarea>
      </label>
      <div class="actions">
        <button type="button" class="btn" id="cancel">Cancelar</button>
        <button type="submit" class="btn primary" id="save">Guardar</button>
      </div>
    </form>`;

  let categoria = cat;
  const f = document.getElementById('form');
  f.querySelectorAll('.seg .tab').forEach((b) => b.onclick = () => {
    categoria = b.dataset.cat;
    f.querySelectorAll('.seg .tab').forEach((x) => x.setAttribute('aria-pressed', x === b));
  });
  f.querySelectorAll('.stepper button').forEach((b) => b.onclick = () => {
    const inp = f.raciones;
    inp.value = Math.min(50, Math.max(1, (parseInt(inp.value, 10) || 1) + parseInt(b.dataset.d, 10)));
  });
  document.getElementById('back').onclick = volver;
  document.getElementById('cancel').onclick = volver;

  f.onsubmit = async (e) => {
    e.preventDefault();
    const datos = {
      categoria,
      titulo: f.titulo.value.trim(),
      raciones: Math.min(50, Math.max(1, parseInt(f.raciones.value, 10) || 1)),
      ingredientes: lines(f.ingredientes.value),
      instrucciones: lines(f.instrucciones.value),
      notas: f.notas.value.trim() || null
    };
    if (!datos.titulo) return toast('Ponle un nombre a la receta');
    if (!datos.ingredientes.length) return toast('Añade al menos un ingrediente');

    const btn = document.getElementById('save');
    btn.disabled = true; btn.textContent = 'Guardando…';
    const res = r
      ? await sb.from('recetas').update(datos).eq('id', r.id).select().single()
      : await sb.from('recetas').insert(datos).select().single();
    if (res.error) {
      btn.disabled = false; btn.textContent = 'Guardar';
      return toast('No se pudo guardar: ' + res.error.message);
    }
    state.recetas = r
      ? state.recetas.map((x) => (x.id === r.id ? res.data : x))
      : [...state.recetas, res.data].sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
    saveCache();
    toast('Receta guardada');
    ir(`#/receta/${res.data.id}`, true);
  };
}

async function vistaInvitados() {
  if (!state.admin) { ir('#/', true); return; }
  const pintar = () => {
    app.innerHTML = `
      <header class="top">
        <button class="icon-btn" id="back" aria-label="Volver">${ICON.back}</button>
        <h2>Invitados</h2>
      </header>
      <div class="section">
        <h4>Invitar a alguien</h4>
        <form id="add" class="add-row">
          <div class="field" style="flex:1;margin:0"><input name="email" type="email" required placeholder="correo@gmail.com" inputmode="email"></div>
          <button class="btn primary" style="flex:none">Añadir</button>
        </form>
        <label class="check"><input type="checkbox" id="es-admin"> También puede borrar recetas (admin)</label>
      </div>
      <div class="section">
        <h4>Con acceso (${state.invitados.length})</h4>
        ${state.invitados.map((i) => `
          <div class="row">
            <div class="grow">${esc(i.email)} ${i.es_admin ? '<span class="badge">admin</span>' : ''}</div>
            ${i.email !== myEmail() ? `<button class="btn danger" style="flex:none;min-height:38px" data-del="${esc(i.email)}">Quitar</button>` : ''}
          </div>`).join('')}
      </div>
      <p class="empty" style="padding:8px 12px">Comparte el enlace de la app con quien invites. Debe entrar con la misma cuenta de Google que añadas aquí.</p>`;

    document.getElementById('back').onclick = volver;
    document.getElementById('add').onsubmit = async (e) => {
      e.preventDefault();
      const email = e.target.email.value.trim().toLowerCase();
      const es_admin = document.getElementById('es-admin').checked;
      const { error } = await sb.from('invitados').insert({ email, es_admin });
      if (error) return toast(error.code === '23505' ? 'Ese correo ya está invitado' : 'No se pudo añadir: ' + error.message);
      await cargarInvitados();
      pintar();
      toast('Invitado añadido');
    };
    app.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
      const email = b.dataset.del;
      const ok = await confirmar({ titulo: '¿Quitar acceso?', texto: `${email} dejará de ver las recetas. Las que haya creado se quedan.`, ok: 'Quitar', peligro: true });
      if (!ok) return;
      const { error } = await sb.from('invitados').delete().eq('email', email);
      if (error) return toast('No se pudo quitar: ' + error.message);
      await cargarInvitados();
      pintar();
    });
  };
  app.innerHTML = '<div class="center"><div class="spinner"></div></div>';
  await cargarInvitados();
  pintar();
}

// ---------------------------------------------------------------------
// Navegación (hash) y arranque
// ---------------------------------------------------------------------
function ir(hash, reemplazar = false) {
  if (reemplazar) { history.replaceState(null, '', hash); render(); }
  else location.hash = hash;
}
function volver() {
  if (history.length > 1 && sessionStorage.getItem('navegado')) history.back();
  else ir('#/', true);
}

function render() {
  cerrarMenu();
  window.scrollTo(0, 0);
  if (!state.session) return vistaLogin();
  if (!state.invitado) return vistaNoInvitado();
  const h = location.hash || '#/';
  let m;
  if ((m = h.match(/^#\/receta\/(.+)$/))) return vistaDetalle(m[1]);
  if ((m = h.match(/^#\/editar\/(.+)$/))) return vistaForm(m[1]);
  if (h === '#/nueva') return vistaForm(null);
  if (h === '#/invitados') return vistaInvitados();
  return vistaLista();
}

window.addEventListener('hashchange', () => { sessionStorage.setItem('navegado', '1'); render(); });

async function salir() {
  await sb.auth.signOut();
  state.session = null; state.invitado = false; state.admin = false;
  state.recetas = []; localStorage.removeItem('recetas_cache');
  history.replaceState(null, '', location.pathname);
  render();
}

let arrancando = null;
function arrancar() {
  if (!arrancando) arrancando = _arrancar().finally(() => { arrancando = null; });
  return arrancando;
}

async function _arrancar() {
  const { data } = await sb.auth.getSession();
  state.session = data.session;

  // Limpia el ?code= que deja el login de Google
  if (location.search.includes('code=')) history.replaceState(null, '', location.pathname + location.hash);

  if (!state.session) return render();

  // Con copia guardada, mostramos algo al instante mientras se comprueba
  if (state.recetas.length) { state.invitado = true; render(); }

  try {
    await comprobarAcceso();
  } catch (e) {
    if (!navigator.onLine && state.recetas.length) { state.offline = true; state.invitado = true; return render(); }
    return vistaError('No se pudo conectar con la base de datos. ' + (e.message || ''));
  }
  if (!state.invitado) return render();
  await cargarRecetas();
  render();
}

sb.auth.onAuthStateChange((evento, session) => {
  state.session = session;
  // setTimeout: no llamar a Supabase dentro del propio callback
  if (evento === 'SIGNED_IN' && !state.invitado) setTimeout(arrancar, 0);
});

window.addEventListener('online', () => { if (state.offline) arrancar(); });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

arrancar();
