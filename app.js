import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-analytics.js";
import { getDatabase, ref, push, set, onValue, remove, get } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAcxIUrzYhARbZGNuPR7HuuG-UFMjltr0w",
  authDomain: "origi-a3b35.firebaseapp.com",
  projectId: "origi-a3b35",
  storageBucket: "origi-a3b35.firebasestorage.app",
  messagingSenderId: "626317721697",
  appId: "1:626317721697:web:1929b661333b92fec4aa20",
  measurementId: "G-SPM3CRWNYC",
  databaseURL: "https://origi-a3b35-default-rtdb.europe-west1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);
const auth = getAuth(app);
let currentUser = "";

// ===== LOGIN =====
const loginBtn = document.getElementById("loginBtn");
loginBtn.addEventListener("click", () => {
  const email = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  if(!email || !password) return alert("Vyplň email i heslo!");

  signInWithEmailAndPassword(auth, email, password)
    .then(userCredential => {
      currentUser = userCredential.user.email;
      document.getElementById("loginWrap").style.display = "none";
      document.getElementById("appContent").style.display = "flex";
      initLevelSections();
      initMap();
      initCalculator();
    })
    .catch(error => alert("Chyba při přihlášení: " + error.message));
});


// Automatické přihlášení
onAuthStateChanged(auth, user => {
  if(user){
    currentUser = user.email;
    document.getElementById("loginWrap").style.display = "none";
    document.getElementById("appContent").style.display = "flex";
    initLevelSections();
    initMap();
    initCalculator();
  }
});

// ===== KALKULÁTOR =====
const ITEMS = [
  { key: "ornament", name: "Ornament", count: 3 },
  { key: "oxid_titancity", name: "Oxid titančitý", count: 3 },
  { key: "roh_cerveneho_draka", name: "Roh červeného draka", count: 3 },
  { key: "symbol_hydry", name: "Symbol Hydry", count: 3 },
  { key: "hlava_hydry", name: "Hlava Hydry", count: 3 },
  { key: "draci_kridla", name: "Dračí křídla", count: 3 },
  { key: "ostre_trny", name: "Ostré trny", count: 3 },
  { key: "cerne_bavivo", name: "Černé bavivo", count: 3 },
  { key: "design_hada", name: "Design hada", count: 3 },
  { key: "insignie_chen", name: "Insignie Chen", count: 3 },
  { key: "balathorovo_oko", name: "Balathorovo oko", count: 3 },
  { key: "supiny_bileho_draka", name: "Šupiny bílého draka", count: 3 },
  { key: "hlava_bileho_draka", name: "Hlava bílého draka", count: 3 },
  { key: "insignie_jia", name: "Insignie Jia", count: 3 },
  { key: "balathorovo_kridlo", name: "Balathorovo křídlo", count: 3 },
  { key: "hedvabi_hada", name: "Hedvábí hada", count: 3 },
  { key: "duse_zeme", name: "Duše Země", count: 1 }
];
function initCalculator(){
  const tbody = document.querySelector("#calcTable tbody");
  const grandTotalEl = document.getElementById("grandTotal");
  const lastUpdateEl = document.getElementById("lastUpdate"); // element pro timestamp
  const pricesRef = ref(db, "prices");

  tbody.innerHTML = "";

  // Vytvoření řádků
  ITEMS.forEach(item => {
    const tr = document.createElement("tr");
    tr.className = "calc-item-row";
    tr.dataset.key = item.key;
    tr.innerHTML = `
      <td class="item-name">${item.name}</td>
      <td><div class="count-badge">${item.count}</div></td>
      <td><input type="text" class="price-input" placeholder="0" data-key="${item.key}"></td>
      <td><div class="item-total" id="total_${item.key}">0</div></td>
    `;
    tbody.appendChild(tr);

    // Event listener pro zadání ceny
    const input = tr.querySelector(".price-input");
    input.addEventListener("keydown", e => {
      if(e.key === "Enter"){
        const raw = input.value.trim().replace(",", ".");
        const val = parseFloat(raw);
        if(Number.isFinite(val) && val >= 0){
          // uloží cenu a zároveň aktualizuje timestamp
          const now = new Date();
          const timestamp = now.toLocaleString('cs-CZ', { dateStyle:'short', timeStyle:'short' });
          
          // aktualizace ceny a timestampu v jedné operaci
          set(ref(db, `prices/${item.key}`), val)
            .then(() => set(ref(db, "prices/lastUpdate"), timestamp))
            .then(() => {
              if(lastUpdateEl) lastUpdateEl.textContent = "Naposledy aktualizováno: " + timestamp;
            })
            .catch(err => console.error("Chyba při ukládání ceny nebo timestampu:", err));
        } else alert("Zadej platnou cenu!");
      }
    });
  });

  // Posloucháme ceny z DB a aktualizujeme kalkulátor
  onValue(pricesRef, snapshot => {
    const data = snapshot.val() || {};
    let grand = 0;
    ITEMS.forEach(item => {
      const price = Number(data[item.key]) || 0;
      const total = price * item.count;
      const input = document.querySelector(`.price-input[data-key="${item.key}"]`);
      const totalEl = document.getElementById(`total_${item.key}`);
      if(input) input.value = price ? formatNumber(price) : "";
      if(totalEl) totalEl.textContent = formatNumber(total);
      grand += total;
    });
    grandTotalEl.textContent = formatNumber(grand);

    // Zobrazení poslední aktualizace z Firebase
    if(lastUpdateEl && data.lastUpdate) lastUpdateEl.textContent = "Naposledy aktualizováno: " + data.lastUpdate;
  });
}

// Pomocná funkce pro formátování čísel
function formatNumber(n){
  if(typeof n !== "number") n = Number(n) || 0;
  return n.toLocaleString('cs-CZ', { maximumFractionDigits: 2, minimumFractionDigits: (n % 1 === 0 ? 0 : 2) });
}

// ===== Úkolníček =====
function initLevelSections(){
 const levels = ["level0_75","level75_90","level90_105","level105","level120"];
  levels.forEach(lvl=>{
    const section = document.getElementById(lvl);
    const input = section.querySelector(".taskInput");
    const btn = section.querySelector(".addBtn");
    const list = section.querySelector(".tasks");
    const totalEl = section.querySelector(".total");
    const doneEl = section.querySelector(".done");

    btn.addEventListener("click", ()=>{
      if(!currentUser) return alert("Přihlaš se pro přidání úkolu!");
      const title = input.value.trim();
      if(!title) return;
      const taskRef = push(ref(db,"tasks"));
      set(taskRef,{title,level:lvl,author:currentUser});
      input.value="";
    });

    onValue(ref(db,"tasks"), snapshot=>{
      list.innerHTML="";
      let total=0, doneCount=0;
      snapshot.forEach(child=>{
        const task = child.val();
        if(task.level!==lvl) return;
        const li = document.createElement("li");
        const userDone = task.doneUsers||{};
        const safeUser = currentUser ? currentUser.replace(/\./g,"_") : "";
        const isDone = userDone[safeUser]||false;
        const doneUsersList = Object.keys(userDone).map(u=>u.replace(/_/g,"."));
        const doneCountNum = doneUsersList.length;

        li.className = "task" + (isDone?" done":"");
        li.innerHTML = `<div style="display:flex;gap:10px;align-items:center;">
          <div class="chk ${isDone?"checked":""}">${isDone?"✓":""}</div>
          <div class="title">${task.title}<br><small>Autor: ${task.author}</small></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="done-badge tooltip-container">${doneCountNum}<span class="tooltip">${doneCountNum>0?doneUsersList.join(', '):'Nikdo zatím ne'}</span></div>
          <button class="del-btn">✖</button>
        </div>`;

        const chk = li.querySelector(".chk");
        chk.addEventListener("click", () => {
          if(!currentUser) return;
          const userDoneRef = ref(db, `tasks/${child.key}/doneUsers/${safeUser}`);
          get(userDoneRef).then(snapshot => {
            if(snapshot.exists()) remove(userDoneRef);
            else set(userDoneRef, true);
          }).catch(err => console.error("Chyba při odfajfkování:", err));
        });

        li.querySelector(".del-btn").addEventListener("click", ()=> {
          if(!currentUser) return;
          remove(ref(db,"tasks/"+child.key));
        });
        list.appendChild(li);
        total++; doneCount+=doneCountNum;
      });
      totalEl.textContent="Úkolů: "+total;
      doneEl.textContent="Splněno: "+doneCount;
    });
  });
}

// ===== Mapa =====
function initMap(){
  const mapBox = document.getElementById("mapBox");
  const mapInput = document.getElementById("mapInput");
  const clearBtn = document.getElementById("clearDotsBtn");
  const logList = document.getElementById("dotLog");

  const mapRef = ref(db,"sharedMap");
  const dotsRef = ref(db,"dots");

  onValue(mapRef, snap=>{
    const url = snap.val();
    if(url) mapBox.innerHTML = `<img src="${url}" alt="Mapa">`;
    else mapBox.innerHTML = "Klikni pro přidání puntíku";
  });

  mapInput.addEventListener("change", e=>{
    if(!currentUser) return alert("Přihlaš se pro nahrání mapy!");
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => set(mapRef, ev.target.result);
    reader.readAsDataURL(file);
  });

  mapBox.addEventListener("click", e=>{
    if(!currentUser) return alert("Přihlaš se!");
    const rect = mapBox.getBoundingClientRect();
    const x = ((e.clientX-rect.left)/rect.width).toFixed(3);
    const y = ((e.clientY-rect.top)/rect.height).toFixed(3);
    const dotRef = push(dotsRef);
    set(dotRef,{x,y,author:currentUser});
  });

  onValue(dotsRef, snap=>{
    mapBox.querySelectorAll(".dot").forEach(d=>d.remove());
    logList.innerHTML = "";

    snap.forEach(child=>{
      const d = child.val();
      const dotEl = document.createElement("div");
      dotEl.className="dot";
      dotEl.style.left=(d.x*100)+"%";
      dotEl.style.top=(d.y*100)+"%";
      mapBox.appendChild(dotEl);

      const li = document.createElement("li");
      li.textContent = `${d.author} (${(d.x*100).toFixed(1)}%, ${(d.y*100).toFixed(1)}%)`;
      logList.appendChild(li);

      dotEl.addEventListener("click", ev=>{
        ev.stopPropagation();
        if(!currentUser) return;
        remove(ref(db,"dots/"+child.key));
      });
      li.addEventListener("click", ()=> {
        if(!currentUser) return;
        remove(ref(db,"dots/"+child.key));
      });
    });
  });

  clearBtn.addEventListener("click", ()=> {
    if(!currentUser) return;
    if(confirm("Opravdu smazat všechny puntíky?")) remove(dotsRef);
  });
}

const logoutBtn = document.getElementById("logoutBtn");
logoutBtn.addEventListener("click", () => {
  signOut(auth).then(() => {
    currentUser = "";
    document.getElementById("appContent").style.display = "none";
    document.getElementById("loginWrap").style.display = "flex";
  }).catch(err => console.error("Chyba při odhlášení:", err));
});
function initBossBanner() {
  const bannerEl = document.querySelector("#bossBanner .boss-left");
  const countdownEl = document.getElementById("bossCountdown");
  const tableEl = document.getElementById("bossTable");
  const tooltipIcon = document.querySelector("#bossBanner .tooltip-icon");
  const bossesRef = ref(db, "bosses");

  const bossConfig = [
    { name: "Ledová čarodějnice", cooldown: 2 },
    { name: "Král Wubba", cooldown: 3 },
    { name: "Vládce En-Tai", cooldown: 4 },
    { name: "Hadí královna Nethis", cooldown: 6 },
    { name: "BO: Vládce En-Tai", cooldown: 4 },
    { name: "ČT: Bagjanamu", cooldown: 4 },
    { name: "Naga Serpent", cooldown: 6 }
  ];

  const bossInfo = {
    "Ledová čarodějnice": "Jeskyně vyhnanství, DMG: 100.000,-",
    "Král Wubba": "Beta Mapa levý horní roh, DMG: XXX",
    "Vládce En-Tai": "Zakletý les horní pravý roh, DMG: XXX",
    "Hadí královna Nethis": "Hadí chrám levý spodní roh, DMG: XXX",
    "BO: Vládce En-Tai": "Zakletý les spodní pravý roh, DMG: XXX",
    "ČT: Bagjanamu": "Zakletý les vlevo uprostřed, DMG: XXX ",
    "Naga Serpent": "Hadí chrám pravý horní roh, DMG: XXX"
  };

  // --- vytvoření globálního tooltipu (pokud ještě neexistuje) ---
  let tooltipDiv = document.getElementById("bossInfoTooltip");
  if (!tooltipDiv) {
    tooltipDiv = document.createElement("div");
    tooltipDiv.id = "bossInfoTooltip";
    // základní styly přímo v JS, aby tooltip vždy visel nad vším
    Object.assign(tooltipDiv.style, {
      position: "fixed",
      display: "none",
      pointerEvents: "none",
      background: "rgba(0,0,0,0.95)",
      color: "#fff",
      padding: "8px 12px",
      borderRadius: "8px",
      fontSize: "14px",
      whiteSpace: "nowrap",
      zIndex: "999999999",
      boxShadow: "0 6px 18px rgba(0,0,0,0.5)",
      transform: "translateY(0)",
      transition: "opacity 0.12s ease, transform 0.12s ease",
      opacity: "0"
    });
    document.body.appendChild(tooltipDiv);
  }

  function showTooltipAt(text, clientX, clientY) {
    tooltipDiv.textContent = text || "";
    tooltipDiv.style.display = "block";
    tooltipDiv.style.opacity = "1";

    // umístění s korekcí, aby tooltip nezmizel přes okraj
    const padding = 12;
    const left = clientX + 12;
    const top = clientY + 12;
    tooltipDiv.style.left = left + "px";
    tooltipDiv.style.top = top + "px";

    // měření a případné posunutí, aby tooltip zůstal v okně
    requestAnimationFrame(() => {
      const rect = tooltipDiv.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let finalLeft = rect.left;
      let finalTop = rect.top;

      if (rect.right > vw - padding) finalLeft = Math.max(padding, vw - rect.width - padding);
      if (rect.bottom > vh - padding) finalTop = Math.max(padding, vh - rect.height - padding);

      tooltipDiv.style.left = finalLeft + "px";
      tooltipDiv.style.top = finalTop + "px";
    });
  }

  function hideTooltip() {
    tooltipDiv.style.opacity = "0";
    // necháme malý delay pro plynulost a pak skryjeme display
    clearTimeout(tooltipDiv._hideTimeout);
    tooltipDiv._hideTimeout = setTimeout(() => {
      tooltipDiv.style.display = "none";
    }, 120);
  }

  // --- spawn generation ---
  function generateSpawns() {
    const today = new Date();
    today.setHours(0,0,0,0);
    const spawns = [];
    bossConfig.forEach(b => {
      const times = [];
      let next = new Date(today);
      const endTime = today.getTime() + 24*60*60*1000;
      while (next.getTime() <= endTime) {
        times.push(next.getTime());
        next = new Date(next.getTime() + b.cooldown * 60 * 60 * 1000);
      }
      spawns.push({ name: b.name, times });
    });
    return spawns;
  }

  // --- main update function (render banner + attach tooltip handlers) ---
  function updateBanner(spawnsData) {
    const now = Date.now();
    const upcomingBosses = [];

    spawnsData.forEach(b => {
      const nextTimes = b.times.filter(ts => ts > now);
      if (nextTimes.length > 0) {
        upcomingBosses.push({ name: b.name, nextTime: Math.min(...nextTimes) });
      }
    });

    upcomingBosses.sort((a,b) => a.nextTime - b.nextTime);
    const nextTime = upcomingBosses[0]?.nextTime || null;
    const nextBosses = upcomingBosses.filter(b => b.nextTime === nextTime).map(b => b.name);

    // Vykreslení banneru — vytvoříme <span> pro každý boss (bez nutnosti měnit HTML)
    if (nextBosses.length && nextTime) {
      bannerEl.innerHTML = "Nejbližší boss: " + nextBosses.map(name =>
        `<span class="boss-tooltip-trigger" data-boss="${escapeHtml(name)}" style="cursor:pointer;color:#facc15;font-weight:800;">${escapeHtml(name)}</span>`
      ).join(", ");

      const diff = nextTime - now;
      const hours = Math.floor(diff / 1000 / 60 / 60);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      countdownEl.textContent = `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;

      // Přidání eventů pro tooltip na nově vykreslené span prvky
      const triggers = bannerEl.querySelectorAll(".boss-tooltip-trigger");
      triggers.forEach(span => {
        // myš pohybuje tooltipem (aktualizujeme pozici), mouseenter zobrazí obsah
        const onMove = (e) => {
          const bossName = span.dataset.boss;
          const info = bossInfo[bossName] || "Žádné informace.";
          showTooltipAt(info, e.clientX, e.clientY);
        };
        const onEnter = (e) => {
          onMove(e);
        };
        const onLeave = () => {
          hideTooltip();
        };

        // remove potential duplicates (defensive)
        span.removeEventListener("mousemove", span._bossMoveHandler);
        span.removeEventListener("mouseenter", span._bossEnterHandler);
        span.removeEventListener("mouseleave", span._bossLeaveHandler);

        span._bossMoveHandler = onMove;
        span._bossEnterHandler = onEnter;
        span._bossLeaveHandler = onLeave;

        span.addEventListener("mousemove", onMove);
        span.addEventListener("mouseenter", onEnter);
        span.addEventListener("mouseleave", onLeave);
      });
    } else {
      bannerEl.innerHTML = "Nejbližší boss: -";
      countdownEl.textContent = "00:00:00";
    }

    // Tooltip tabulka všech spawnů (neměněno)
    const allSpawns = [];
    const endTime = now + 24*60*60*1000;
    spawnsData.forEach(b => {
      b.times.forEach(ts => {
        if (ts > now && ts <= endTime) allSpawns.push({ name: b.name, time: ts });
      });
    });
    allSpawns.sort((a,b) => a.time - b.time);

    let html = "<table><tr><th>Boss</th><th>Spawn</th></tr>";
    allSpawns.forEach(sp => {
      const diff = sp.time - now;
      const h = Math.floor(diff / 1000 / 60 / 60);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      html += `<tr><td>${escapeHtml(sp.name)}</td><td>${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}</td></tr>`;
    });
    html += "</table>";
    tableEl.innerHTML = html;
  }

  // --- helpers ---
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Inicializace spawns + uložíme do Firebase (stejně jako předtím)
  const spawns = generateSpawns();
  set(bossesRef, spawns);

  // Aktualizace každou sekundu
  const intervalId = setInterval(() => updateBanner(spawns), 1000);

  // Realtime listener (pokud někdo jiný změní, synchronizuje)
  onValue(bossesRef, snapshot => {
    const data = snapshot.val();
    if (data) updateBanner(data);
  });

  // tooltip icon (otevírání tabulky)
  if (tooltipIcon) {
    tooltipIcon.addEventListener("click", e => {
      e.stopPropagation();
      tableEl.classList.toggle("show");
    });
  }

  // zavření tooltip tabulky kliknutím mimo
  document.addEventListener("click", () => tableEl.classList.remove("show"));
  tableEl.addEventListener("click", e => e.stopPropagation());
}

// Inicializace
initBossBanner();

