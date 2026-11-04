import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, collection, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, writeBatch, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// App secundário: cria novos administradores sem desconectar quem está usando o painel.
const appCadastro = initializeApp(firebaseConfig, 'cadastro-admin');
const authCadastro = getAuth(appCadastro);

/* ================= Utilidades ================= */
const $ = s => document.querySelector(s);
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const digits = s => String(s || '').replace(/\D/g, '');
const fmtCpf = d => d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : d;
const toDate = v => v && typeof v.toDate === 'function' ? v.toDate() : (v ? new Date(v) : null);
const fmtDt = v => { const d = toDate(v); return d && !isNaN(d) ? d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''; };
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const maskCpf = v => digits(v).slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
const userKey = s => norm(s).replace(/[^a-z0-9._-]/g, '');
const emailDe = usuario => userKey(usuario) + '@admin.cestadenatal.local';

// O documento do colaborador é identificado por um código gerado a partir de CPF + nome.
// Assim, só quem sabe os dois consegue consultar — a lista completa fica restrita ao RH.
async function chave(cpf, nome) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(digits(cpf) + '|' + norm(nome)));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function note(box, cls, text) {
  box.innerHTML = '';
  if (!text) return null;
  const d = el('div', 'note ' + cls, text); box.appendChild(d); return d;
}
function chunks(arr, n) { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; }

/* ================= Rotas ================= */
function route() {
  const adm = location.hash === '#admin';
  $('#v-col').hidden = adm; $('#v-adm').hidden = !adm;
  window.scrollTo(0, 0);
  if (adm) openAdmin();
}
window.addEventListener('hashchange', route);

/* ================= Colaborador ================= */
$('#cpf').addEventListener('input', e => { e.target.value = maskCpf(e.target.value); });
$('#nome').addEventListener('keydown', e => { if (e.key === 'Enter') $('#cpf').focus(); });
$('#cpf').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btnCheck').click(); });

function ticket(nome, done, msgText) {
  const res = $('#res'); res.innerHTML = '';
  const t = el('div', 'ticket' + (done ? ' done' : ''));
  const top = el('div', 't-top');
  top.appendChild(el('div', 't-label', 'Vale-cesta de Natal ' + new Date().getFullYear()));
  top.appendChild(el('div', 't-name', nome));
  t.appendChild(top);
  if (done) t.appendChild(el('div', 'stamp', 'Retirada'));
  t.appendChild(el('div', 't-cut'));
  const body = el('div', 't-body');
  body.appendChild(el('p', null, msgText));
  t.appendChild(body); res.appendChild(t);
  return body;
}
function resetCol() {
  $('#nome').value = ''; $('#cpf').value = ''; $('#res').innerHTML = '';
  $('#btnCheck').hidden = false; $('#nome').focus();
}
function newSearchBtn(parent) {
  const b = el('button', 'link', 'Fazer nova consulta'); b.style.marginTop = '10px';
  b.onclick = resetCol; parent.appendChild(b);
}

$('#btnCheck').addEventListener('click', async () => {
  const res = $('#res'), btn = $('#btnCheck'), nome = $('#nome').value, cpf = digits($('#cpf').value);
  if (!nome.trim() || cpf.length !== 11) return void note(res, 'warn', 'Preencha o nome completo e um CPF com 11 dígitos.');
  btn.disabled = true; btn.textContent = 'Consultando…'; res.innerHTML = '';
  try {
    const ref = doc(db, 'colaboradores', await chave(cpf, nome));
    const snap = await getDoc(ref);
    if (!snap.exists())
      return void note(res, 'err', 'Não encontramos esse nome com esse CPF. Confira os dados e tente de novo, ou procure o RH.');
    const d = snap.data();
    if (d.retirou) {
      newSearchBtn(ticket(d.nome, true, 'A retirada da sua cesta já foi registrada' + (d.retiradoEm ? ' em ' + fmtDt(d.retiradoEm) : '') + '.'));
      return;
    }
    const body = ticket(d.nome, false, 'Você está autorizado(a) a retirar sua cesta. Confirme no momento em que receber.');
    const c = el('button', 'block', 'Confirmar retirada');
    c.onclick = async () => {
      c.disabled = true; c.textContent = 'Registrando…';
      try {
        await updateDoc(ref, { retirou: true, retiradoEm: serverTimestamp() });
        $('#btnCheck').hidden = true;
        newSearchBtn(ticket(d.nome, true, 'Retirada registrada em ' + fmtDt(new Date()) + '. Boas festas!'));
      } catch (e) {
        // A regra do banco recusa se a cesta já tiver sido retirada.
        try {
          const again = await getDoc(ref);
          if (again.exists() && again.data().retirou) {
            newSearchBtn(ticket(d.nome, true, 'A retirada da sua cesta já foi registrada' + (again.data().retiradoEm ? ' em ' + fmtDt(again.data().retiradoEm) : '') + '.'));
            return;
          }
        } catch (e2) {}
        c.disabled = false; c.textContent = 'Confirmar retirada';
        note(body.appendChild(el('div')), 'err', 'Não foi possível registrar agora. Tente novamente.');
      }
    };
    body.appendChild(c);
  } catch (e) {
    console.error(e);
    note(res, 'err', 'Erro na consulta. Verifique a internet e tente novamente.');
  } finally { btn.disabled = false; btn.textContent = 'Consultar'; }
});

/* ================= Login de administradores ================= */
let adminUser = null;       // { uid, usuario }
let criandoPrimeiro = false;
let rows = [], admins = [], unsubCol = null, unsubAdm = null;
const selected = new Set();
let authReady = false;

async function adminDoUsuario(user) {
  if (!user) return null;
  try {
    const s = await getDoc(doc(db, 'admins', user.uid));
    return s.exists() ? { uid: user.uid, usuario: s.data().usuario } : null;
  } catch (e) { return null; }
}

onAuthStateChanged(auth, async user => {
  if (criandoPrimeiro) return;
  adminUser = await adminDoUsuario(user);
  if (user && !adminUser) await signOut(auth);
  authReady = true;
  if (location.hash === '#admin') openAdmin();
});

async function openAdmin() {
  if (!authReady) return; // onAuthStateChanged chama de novo quando estiver pronto
  $('#admBlock').hidden = true;
  if (adminUser) return showPanel();
  stopListeners();
  $('#admMain').hidden = true;
  let precisaPrimeiro = false;
  try { precisaPrimeiro = !(await getDoc(doc(db, 'config', 'setup'))).exists(); }
  catch (e) {
    $('#loginPanel').hidden = true; $('#admBlock').hidden = false;
    note($('#admBlock'), 'err', 'Não foi possível conectar ao banco de dados. Verifique a internet e recarregue a página.');
    return;
  }
  drawLogin(precisaPrimeiro);
}

function validNew(usuario, senha, senha2) {
  if (userKey(usuario).length < 3) return 'O nome de usuário precisa ter pelo menos 3 letras ou números.';
  if (senha.length < 6) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (senha !== senha2) return 'As senhas não conferem.';
  return '';
}
function authErro(e) {
  const c = e && e.code || '';
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email', 'auth/invalid-login-credentials'].includes(c)) return 'Usuário ou senha incorretos.';
  if (c === 'auth/too-many-requests') return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.';
  if (c === 'auth/email-already-in-use') return 'Já existe um usuário com esse nome. Escolha outro.';
  if (c === 'auth/weak-password') return 'A senha precisa ter pelo menos 6 caracteres.';
  if (c === 'auth/operation-not-allowed') return 'O login por e-mail e senha não está ativado no Firebase (Authentication → Método de login).';
  if (c === 'auth/network-request-failed') return 'Sem conexão. Verifique a internet.';
  return 'Não foi possível concluir agora. Tente novamente.';
}

function drawLogin(primeiro) {
  const p = $('#loginPanel'); p.hidden = false;
  p.innerHTML = primeiro
    ? '<h2>Criar o primeiro administrador</h2><p class="hint">Ainda não há administradores. Crie o seu acesso para proteger esta área.</p>' +
      '<label for="lgUser">Nome de usuário</label><input id="lgUser" type="text" autocomplete="username" autocapitalize="none" spellcheck="false">' +
      '<label for="lgPass">Senha</label><input id="lgPass" type="password" autocomplete="new-password" placeholder="Mínimo de 6 caracteres">' +
      '<label for="lgPass2">Confirmar senha</label><input id="lgPass2" type="password" autocomplete="new-password">' +
      '<button id="lgBtn" class="block">Criar e entrar</button><div id="lgMsg" aria-live="polite"></div>'
    : '<h2>Entrar</h2><p class="hint">Acesso restrito à equipe do RH.</p>' +
      '<label for="lgUser">Nome de usuário</label><input id="lgUser" type="text" autocomplete="username" autocapitalize="none" spellcheck="false">' +
      '<label for="lgPass">Senha</label><input id="lgPass" type="password" autocomplete="current-password">' +
      '<button id="lgBtn" class="block">Entrar</button><div id="lgMsg" aria-live="polite"></div>';

  const go = async () => {
    const out = $('#lgMsg'), btn = $('#lgBtn'), u = $('#lgUser').value, s = $('#lgPass').value;
    btn.disabled = true;
    try {
      if (primeiro) {
        const erro = validNew(u, s, $('#lgPass2').value);
        if (erro) return void note(out, 'warn', erro);
        criandoPrimeiro = true;
        const cred = await createUserWithEmailAndPassword(auth, emailDe(u), s);
        try {
          const b = writeBatch(db);
          b.set(doc(db, 'admins', cred.user.uid), { usuario: userKey(u), criadoEm: serverTimestamp(), criadoPor: '' });
          b.set(doc(db, 'config', 'setup'), { criadoEm: serverTimestamp() });
          await b.commit();
        } catch (e) {
          await cred.user.delete().catch(() => {});
          criandoPrimeiro = false;
          drawLogin(false);
          note($('#lgMsg'), 'warn', 'Um administrador já foi criado. Entre com usuário e senha.');
          return;
        }
        criandoPrimeiro = false;
        adminUser = { uid: cred.user.uid, usuario: userKey(u) };
      } else {
        if (!userKey(u)) return void note(out, 'warn', 'Informe o nome de usuário.');
        const cred = await signInWithEmailAndPassword(auth, emailDe(u), s);
        adminUser = await adminDoUsuario(cred.user);
        if (!adminUser) { await signOut(auth); return void note(out, 'err', 'Esse usuário não tem mais acesso ao painel.'); }
      }
      p.innerHTML = ''; showPanel();
    } catch (e) {
      criandoPrimeiro = false;
      console.error(e);
      note(out, 'err', authErro(e));
    } finally { if (btn.isConnected) btn.disabled = false; }
  };
  $('#lgBtn').onclick = go;
  p.querySelectorAll('input').forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') go(); }));
  $('#lgUser').focus();
}

function semPermissao(e) {
  if (e && e.code === 'permission-denied') logout('Seu acesso de administrador foi removido.');
}

function showPanel() {
  $('#loginPanel').hidden = true; $('#admMain').hidden = false;
  $('#signedUser').textContent = adminUser.usuario;
  $('#avatar').textContent = adminUser.usuario.charAt(0).toUpperCase();
  if (!unsubAdm) unsubAdm = onSnapshot(collection(db, 'admins'),
    s => { admins = s.docs.map(d => ({ uid: d.id, ...d.data() })); drawAdmins(); },
    e => { semPermissao(e); note($('#admMsg'), 'err', 'Não foi possível carregar os administradores.'); });
  if (!unsubCol) unsubCol = onSnapshot(collection(db, 'colaboradores'),
    s => { rows = s.docs.map(d => ({ id: d.id, ...d.data() })); drawAdmin(); },
    e => { semPermissao(e); note($('#impMsg'), 'err', 'Não foi possível carregar a base.'); });
}
function stopListeners() {
  if (unsubCol) { unsubCol(); unsubCol = null; }
  if (unsubAdm) { unsubAdm(); unsubAdm = null; }
  rows = []; admins = []; selected.clear();
}
async function logout(aviso) {
  stopListeners(); adminUser = null; setTab('col');
  $('#admMain').hidden = true;
  await signOut(auth).catch(() => {});
  if (location.hash === '#admin') { await openAdmin(); if (aviso && $('#lgMsg')) note($('#lgMsg'), 'warn', aviso); }
}
$('#btnLogout').addEventListener('click', () => logout());

function setTab(which) {
  const isCol = which === 'col';
  $('#tabCol').setAttribute('aria-selected', isCol); $('#tabAdm').setAttribute('aria-selected', !isCol);
  $('#colabPanel').hidden = !isCol; $('#admPanel').hidden = isCol;
}
$('#tabCol').onclick = () => setTab('col');
$('#tabAdm').onclick = () => setTab('adm');

/* ================= Administradores ================= */
function drawAdmins() {
  const tb = $('#tbAdm'); tb.innerHTML = '';
  admins.slice().sort((a, b) => String(a.usuario).localeCompare(String(b.usuario))).forEach(a => {
    const tr = el('tr');
    tr.appendChild(el('td', null, a.usuario + (a.uid === adminUser?.uid ? ' (você)' : '')));
    tr.appendChild(el('td', null, fmtDt(a.criadoEm)));
    const td = el('td'); td.style.textAlign = 'right';
    if (a.uid !== adminUser?.uid) {
      const b = el('button', 'ghost small', 'Remover');
      b.onclick = async () => {
        if (!confirm('Remover o administrador “' + a.usuario + '”? Ele não conseguirá mais entrar no painel.')) return;
        b.disabled = true;
        try { await deleteDoc(doc(db, 'admins', a.uid)); note($('#admMsg'), 'ok', 'Administrador “' + a.usuario + '” removido.'); }
        catch (e) { b.disabled = false; note($('#admMsg'), 'err', 'Não foi possível remover agora. Tente novamente.'); }
      };
      td.appendChild(b);
    }
    tr.appendChild(td); tb.appendChild(tr);
  });
}

function resetAddForm() { ['#naUser', '#naPass', '#naPass2'].forEach(s => $(s).value = ''); }
$('#btnAddAdm').onclick = () => { const f = $('#addAdmForm'); f.hidden = !f.hidden; note($('#admMsg')); if (!f.hidden) $('#naUser').focus(); };
$('#btnCancelAdm').onclick = () => { resetAddForm(); $('#addAdmForm').hidden = true; note($('#admMsg')); };
$('#btnSaveAdm').onclick = async () => {
  const out = $('#admMsg'), u = $('#naUser').value, s = $('#naPass').value;
  const erro = validNew(u, s, $('#naPass2').value);
  if (erro) return void note(out, 'warn', erro);
  const btn = $('#btnSaveAdm'); btn.disabled = true;
  try {
    const id = userKey(u);
    const cred = await createUserWithEmailAndPassword(authCadastro, emailDe(id), s);
    await setDoc(doc(db, 'admins', cred.user.uid), { usuario: id, criadoEm: serverTimestamp(), criadoPor: adminUser.usuario });
    await signOut(authCadastro).catch(() => {});
    resetAddForm(); $('#addAdmForm').hidden = true;
    note(out, 'ok', 'Administrador “' + id + '” adicionado. Ele já pode entrar com esse usuário e senha.');
  } catch (e) { console.error(e); note(out, 'err', authErro(e)); }
  finally { btn.disabled = false; }
};

/* ================= Colaboradores: listagem ================= */
const LIMITE = 300;
function filtered() {
  const q = norm($('#q').value), qd = digits($('#q').value);
  return rows.filter(r => !q || norm(r.nome).includes(q) || (qd && String(r.cpf).includes(qd)))
    .sort((a, b) => norm(a.nome).localeCompare(norm(b.nome)));
}

function drawAdmin() {
  const ret = rows.filter(r => r.retirou).length, tot = rows.length, pct = tot ? Math.round(ret / tot * 100) : 0;
  $('#sTot').textContent = tot; $('#sRet').textContent = ret; $('#sPen').textContent = tot - ret; $('#sPct').textContent = pct + '%';
  $('#barFill').style.width = pct + '%'; $('#bar').setAttribute('aria-valuenow', pct);
  // Remove da seleção quem não existe mais
  const ids = new Set(rows.map(r => r.id)); [...selected].forEach(id => { if (!ids.has(id)) selected.delete(id); });

  const all = filtered(), list = all.slice(0, LIMITE);
  const tb = $('#tb'); tb.innerHTML = '';
  list.forEach(r => {
    const tr = el('tr');
    const checkTd = el('td'), check = el('input');
    check.type = 'checkbox'; check.className = 'rowSelect'; check.value = r.id;
    check.checked = selected.has(r.id); check.setAttribute('aria-label', 'Selecionar ' + r.nome);
    checkTd.appendChild(check); tr.appendChild(checkTd);
    const tdNome = el('td', null, r.nome);
    tdNome.appendChild(el('small', 'cpf-m', fmtCpf(String(r.cpf || ''))));
    tr.appendChild(tdNome);
    const tdCpf = el('td', 'col-cpf', fmtCpf(String(r.cpf || ''))); tdCpf.style.whiteSpace = 'nowrap'; tr.appendChild(tdCpf);
    const td = el('td');
    const tag = el('span', 'pill ' + (r.retirou ? 'ok' : 'warn'), r.retirou ? 'Retirada' : 'Pendente');
    if (r.retirou && r.retiradoEm) tag.title = 'Retirada em ' + fmtDt(r.retiradoEm);
    td.appendChild(tag); tr.appendChild(td);
    const tdEd = el('td'); tdEd.style.textAlign = 'right';
    const ed = el('button', 'ghost small', 'Editar'); ed.onclick = () => openEditor(r);
    tdEd.appendChild(ed); tr.appendChild(tdEd);
    tb.appendChild(tr);
  });
  $('#empty').hidden = list.length > 0;
  $('#more').hidden = all.length <= LIMITE;
  $('#more').textContent = 'Mostrando ' + LIMITE + ' de ' + all.length + '. Use a busca para encontrar os demais.';
  const vis = list.map(r => r.id), selVis = vis.filter(id => selected.has(id)).length;
  $('#selectAll').checked = vis.length > 0 && selVis === vis.length;
  $('#selectAll').indeterminate = selVis > 0 && selVis < vis.length;
  $('#btnDelSelected').disabled = selected.size === 0;
  $('#btnDelSelected').textContent = 'Excluir selecionados (' + selected.size + ')';
}
$('#q').addEventListener('input', drawAdmin);
$('#tb').addEventListener('change', e => {
  if (!e.target.classList.contains('rowSelect')) return;
  if (e.target.checked) selected.add(e.target.value); else selected.delete(e.target.value);
  drawAdmin();
});
$('#selectAll').addEventListener('change', e => {
  filtered().slice(0, LIMITE).forEach(r => { if (e.target.checked) selected.add(r.id); else selected.delete(r.id); });
  drawAdmin();
});

$('#btnDelSelected').addEventListener('click', async () => {
  if (selected.size === 0) return;
  const ids = [...selected];
  if (!confirm('Excluir ' + ids.length + ' colaborador(es) selecionado(s)? Esta ação não poderá ser desfeita.')) return;
  const btn = $('#btnDelSelected'); btn.disabled = true; btn.textContent = 'Excluindo…';
  try {
    for (const part of chunks(ids, 400)) {
      const b = writeBatch(db); part.forEach(id => b.delete(doc(db, 'colaboradores', id))); await b.commit();
    }
    ids.forEach(id => selected.delete(id));
    note($('#impMsg'), 'ok', ids.length + ' colaborador(es) excluído(s).');
  } catch (e) {
    note($('#impMsg'), 'err', 'Não foi possível excluir todos. Verifique a conexão e tente novamente.');
  } finally { drawAdmin(); }
});

/* ================= Colaboradores: cadastro e edição ================= */
let editing = null;
const dlg = $('#dlg');
$('#eCpf').addEventListener('input', e => { e.target.value = maskCpf(e.target.value); });

function openEditor(r) {
  editing = r || null;
  $('#dlgTitle').textContent = r ? 'Editar colaborador' : 'Adicionar colaborador';
  $('#eNome').value = r ? r.nome : '';
  $('#eCpf').value = r ? fmtCpf(String(r.cpf || '')) : '';
  $('#eStatus').value = r && r.retirou ? 'retirada' : 'pendente';
  $('#btnDel').hidden = !r;
  note($('#dlgMsg'));
  dlg.showModal(); $('#eNome').focus();
}
$('#btnNew').onclick = () => openEditor(null);
$('#btnDlgCancel').onclick = () => dlg.close();

$('#dlgForm').addEventListener('submit', async e => {
  e.preventDefault();
  const out = $('#dlgMsg'), nome = $('#eNome').value.trim().replace(/\s+/g, ' '), cpf = digits($('#eCpf').value);
  const retirou = $('#eStatus').value === 'retirada';
  if (!nome) return void note(out, 'warn', 'Informe o nome completo.');
  if (cpf.length !== 11) return void note(out, 'warn', 'Informe um CPF com 11 dígitos.');
  const dup = rows.find(r => String(r.cpf) === cpf && r.id !== editing?.id);
  if (dup) return void note(out, 'warn', 'Já existe um colaborador com esse CPF: ' + dup.nome + '.');
  const btn = $('#btnDlgSave'); btn.disabled = true;
  try {
    const id = await chave(cpf, nome);
    const manterData = editing && editing.retirou && retirou && editing.retiradoEm;
    const data = { nome, cpf, retirou, retiradoEm: retirou ? (manterData ? editing.retiradoEm : serverTimestamp()) : null, atualizadoEm: serverTimestamp() };
    const b = writeBatch(db);
    b.set(doc(db, 'colaboradores', id), data);
    if (editing && editing.id !== id) b.delete(doc(db, 'colaboradores', editing.id));
    await b.commit();
    dlg.close();
    note($('#impMsg'), 'ok', (editing ? 'Dados de ' : 'Colaborador ') + nome + (editing ? ' atualizados.' : ' adicionado.'));
  } catch (e) { console.error(e); note(out, 'err', 'Não foi possível salvar agora. Tente novamente.'); }
  finally { btn.disabled = false; }
});

$('#btnDel').onclick = async () => {
  if (!editing) return;
  if (!confirm('Excluir ' + editing.nome + '? Esta ação não poderá ser desfeita.')) return;
  try {
    await deleteDoc(doc(db, 'colaboradores', editing.id));
    dlg.close(); note($('#impMsg'), 'ok', editing.nome + ' excluído(a).');
  } catch (e) { note($('#dlgMsg'), 'err', 'Não foi possível excluir agora. Tente novamente.'); }
};

/* ================= Importar e exportar ================= */
$('#btnImp').onclick = () => $('#file').click();
$('#file').addEventListener('change', async e => {
  const f = e.target.files[0], out = $('#impMsg'); e.target.value = '';
  if (!f) return;
  if (typeof XLSX === 'undefined') return void note(out, 'err', 'O leitor de planilhas ainda está carregando. Tente de novo em alguns segundos.');
  try {
    const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false });
    const key = (o, w) => Object.keys(o).find(k => norm(k).includes(w));
    const porCpf = new Map(rows.map(r => [String(r.cpf), r]));
    const ops = []; let n = 0, skip = 0;
    const vistos = new Set();
    for (const r of data) {
      const kn = key(r, 'nome'), kc = key(r, 'cpf'), ks = key(r, 'status');
      const bruto = kc ? digits(r[kc]) : '';
      const nome = String(kn ? r[kn] : '').trim().replace(/\s+/g, ' ');
      if (!kn || !kc || !nome || bruto.length < 9 || bruto.length > 11) { skip++; continue; }
      const cpf = bruto.padStart(11, '0');
      if (vistos.has(cpf)) { skip++; continue; }
      vistos.add(cpf);
      const st = ks ? norm(r[ks]) : '';
      const retirou = /retirad/.test(st) && !/nao|pend/.test(st);
      const id = await chave(cpf, nome);
      const antigo = porCpf.get(cpf);
      const manterData = antigo && antigo.id === id && antigo.retirou && retirou && antigo.retiradoEm;
      ops.push({ t: 'set', id, data: { nome, cpf, retirou, retiradoEm: retirou ? (manterData ? antigo.retiradoEm : serverTimestamp()) : null, atualizadoEm: serverTimestamp() } });
      if (antigo && antigo.id !== id) ops.push({ t: 'del', id: antigo.id });
      n++;
    }
    let feitos = 0;
    for (const part of chunks(ops, 400)) {
      const b = writeBatch(db);
      part.forEach(o => o.t === 'set' ? b.set(doc(db, 'colaboradores', o.id), o.data) : b.delete(doc(db, 'colaboradores', o.id)));
      await b.commit();
      feitos += part.filter(o => o.t === 'set').length;
      note(out, 'warn', 'Importando… ' + feitos + ' de ' + n);
    }
    note(out, n ? 'ok' : 'err', n + ' colaboradores importados' + (skip ? ' (' + skip + ' linhas ignoradas)' : '') + '.');
  } catch (err) { console.error(err); note(out, 'err', 'Não foi possível ler a planilha. Use as colunas Nome, CPF e Status.'); }
});

$('#btnExp').onclick = () => {
  if (typeof XLSX === 'undefined') return void note($('#impMsg'), 'err', 'Exportação indisponível neste momento.');
  const ord = rows.slice().sort((a, b) => norm(a.nome).localeCompare(norm(b.nome)));
  const aoa = [['Nome', 'CPF', 'Status', 'Retirada em']].concat(ord.map(r => [r.nome, fmtCpf(String(r.cpf)), r.retirou ? 'Cesta retirada' : 'Pendente', fmtDt(r.retiradoEm)]));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Cestas');
  XLSX.writeFile(wb, 'cestas-natal.xlsx');
};

route();
