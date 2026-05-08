//config de firebase

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, setDoc, doc} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

const firebaseConfig = {
      apiKey: "AIzaSyAD_GREG5WctQgYELILmwAQvz8hk7bujnw",
      authDomain: "velocirapptore.firebaseapp.com",
      projectId: "velocirapptore",
      storageBucket: "velocirapptore.firebasestorage.app",
      messagingSenderId: "138735528236",
      appId: "1:138735528236:web:0f71c7115f76acc6eb6489",
      measurementId: "G-BNC5Q0Y2G7"
    };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const messaging = getMessaging(app);


var miembros = new Set();
var gastos = [];

const docRef = doc(db, "grupos", "principal");

const local = JSON.parse(localStorage.getItem("pendiente") || "null");
if (local && !navigator.onLine) {
  miembros = new Set(local.miembros || []);
  gastos.push(...(local.gastos || []));
}


function guardar() {
  const estado = { miembros: [...miembros], gastos };
  localStorage.setItem("pendiente", JSON.stringify(estado));
  if (navigator.onLine) {
    sincronizar();
  }
}

function sincronizar() {
  const pendiente = localStorage.getItem("pendiente");
  if (!pendiente) return;
  setDoc(docRef, JSON.parse(pendiente)).then(() => {
    localStorage.removeItem("pendiente");
  });
}

window.addEventListener("online", sincronizar);


onSnapshot(docRef, (snap) => {
  if (snap.exists()) {
    miembros = new Set(snap.data().miembros || []);
    gastos.length = 0;
    gastos.push(...(snap.data().gastos || []));
  }
  render();
});



//Aca abajo es solo lógica básica de app web


function renderMiembros() {
  const lista = document.getElementById("lista-miembros");
  lista.innerHTML = [...miembros].map(m => `<li>${m}</li>`).join("");
}

function anadirMiembro(){
  let input = document.getElementById("nuevo_miembro");
  if (input.value != ""){
    miembros.add(input.value);
    input.value = "";
    guardar();
    renderMiembros();
  }
}

function renderGastos() {
  const lista = document.getElementById("lista-gastos");
  if (gastos.length === 0) {
    lista.innerHTML = `<li style="color:#aaa">Sin gastos aún</li>`;
    return;
  }
  lista.innerHTML = gastos.map(g =>
    `<li><span class="gasto-pagador">${g.pagador}</span> pagó ${g.descripcion}<span class="gasto-monto">$${g.monto.toLocaleString()}</span></li>`
  ).join("");
}

function calcularBalances() {
  const totales = {};
  miembros.forEach(m => totales[m] = 0);

  gastos.forEach(g => {
    const deudores = g.deudores || [...miembros];
    const parte = g.monto / deudores.length;
    deudores.forEach(m => {
      if (m === g.pagador) {
        totales[m] += g.monto - parte;
      } else {
        totales[m] -= parte;
      }
    });
    if (!deudores.includes(g.pagador)) {
      totales[g.pagador] += g.monto;
    }
  });

  return totales;
}

function calcularTransacciones() {
  const totales = calcularBalances();
  const deudores = Object.entries(totales).filter(([, v]) => v < 0).map(([n, v]) => ({ n, v }));
  const acreedores = Object.entries(totales).filter(([, v]) => v > 0).map(([n, v]) => ({ n, v }));
  const transacciones = [];

  let i = 0, j = 0;
  while (i < deudores.length && j < acreedores.length) {
    const monto = Math.min(-deudores[i].v, acreedores[j].v);
    transacciones.push({ de: deudores[i].n, a: acreedores[j].n, monto });
    deudores[i].v += monto;
    acreedores[j].v -= monto;
    if (Math.abs(deudores[i].v) < 0.01) i++;
    if (Math.abs(acreedores[j].v) < 0.01) j++;
  }
  return transacciones;
}

function renderBalances() {
  const lista = document.getElementById("lista-balances");
  if (gastos.length === 0) {
    lista.innerHTML = `<li style="color:#aaa">Sin gastos aún</li>`;
    return;
  }
  const transacciones = calcularTransacciones();
  if (transacciones.length === 0) {
    lista.innerHTML = `<li style="color:#aaa">Todo está saldado</li>`;
    return;
  }
  lista.innerHTML = transacciones.map(t =>
    `<li><span class="balance-negativo">${t.de}</span> le debe <span class="balance-positivo">$${t.monto.toFixed(0)}</span> a <span class="balance-positivo">${t.a}</span></li>`
  ).join("");
}

function render() {
  renderMiembros();
  renderGastos();
  renderBalances();
}

const modal = document.getElementById("modal");

function abrirModal() {
  const pagadorSel = document.getElementById("input-pagador");
  const listaDeudores = document.getElementById("lista-deudores");
  const miembrosArr = [...miembros];

  pagadorSel.innerHTML = miembrosArr.map(m => `<option value="${m}">${m}</option>`).join("");

  listaDeudores.innerHTML = miembrosArr.map(m =>
    `<label style="display:flex;flex-direction:row;align-items:center;gap:0.5rem;font-size:0.9rem;cursor:pointer;">
      <input type="checkbox" value="${m}" style="width:16px;height:16px;cursor:pointer;"> ${m}
    </label>`
  ).join("");

  document.getElementById("input-desc").value = "";
  document.getElementById("input-monto").value = "";
  modal.classList.remove("hidden");
}

document.getElementById("btn-anadir-miembro").addEventListener("click", anadirMiembro);
document.getElementById("btn-abrir-form").addEventListener("click", abrirModal);

document.getElementById("btn-cancelar").addEventListener("click", () => {
  modal.classList.add("hidden");
});

document.getElementById("btn-todos").addEventListener("click", () => {
  document.querySelectorAll("#lista-deudores input[type=checkbox]").forEach(cb => cb.checked = true);
});

document.getElementById("btn-guardar").addEventListener("click", () => {
  const desc = document.getElementById("input-desc").value.trim();
  const monto = parseFloat(document.getElementById("input-monto").value);
  const pagador = document.getElementById("input-pagador").value;
  const deudores = [...document.querySelectorAll("#lista-deudores input[type=checkbox]:checked")].map(cb => cb.value);

  if (!desc || isNaN(monto) || monto <= 0 || !pagador || deudores.length === 0) return;

  gastos.push({ descripcion: desc, monto, pagador, deudores });
  guardar();
  modal.classList.add("hidden");
  render();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").then(async () => {
    const registration = await navigator.serviceWorker.ready;
    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") return;
    const token = await getToken(messaging, {
      vapidKey: "BEFHONc27484-HwXrJJYFp_2C4ukckItDCdob-Rp6kNHKWPp6UNjXNizjctvdHP8ZH-mhFaQa4aNy8RirLiM9CI",
      serviceWorkerRegistration: registration
    });
    if (token) {
      await setDoc(doc(db, "tokens", token), { token });
    }
  });
}
