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
  const addMapBtn = document.getElementById("addMapBtn"); // nové tlačítko

  const mapRef = ref(db,"sharedMap");
  const dotsRef = ref(db,"dots");

  // Načtení uložené mapy
  onValue(mapRef, snap=>{
    const url = snap.val();
    if(url) mapBox.innerHTML = `<img src="${url}" alt="Mapa">`;
    else mapBox.innerHTML = "Klikni pro přidání puntíku";
  });

  // Kliknutí na tlačítko "Přidat mapu" → otevře file input
  addMapBtn.addEventListener("click", () => {
    if(!currentUser) return alert("Přihlaš se pro nahrání mapy!");
    mapInput.click();
  });

  // Nahrání nové mapy → uloží do Firebase a nahradí starou
  mapInput.addEventListener("change", e=>{
    if(!currentUser) return alert("Přihlaš se pro nahrání mapy!");
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => set(mapRef, ev.target.result); // uloží dataURL
    reader.readAsDataURL(file);
  });

  // Přidání puntíku kliknutím na mapu
  mapBox.addEventListener("click", e=>{
    if(!currentUser) return alert("Přihlaš se!");
    const rect = mapBox.getBoundingClientRect();
    const x = ((e.clientX-rect.left)/rect.width).toFixed(3);
    const y = ((e.clientY-rect.top)/rect.height).toFixed(3);
    const dotRef = push(dotsRef);
    set(dotRef,{x,y,author:currentUser});
  });

  // Zobrazení puntíků z Firebase
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

  // Smazání všech puntíků
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
  const bannerEl = document.querySelector("#bossBanner .boss-body");
  const countdownEl = document.getElementById("bossCountdown");
  const tableEl = document.getElementById("bossTable");
  const tooltipIcon = document.querySelector("#bossBanner .tooltip-icon");

  const WARNING_TIME_MINUTES = 7; // méně než 7 minut => blikání
  let blinkState = true;

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
    "ČT: Bagjanamu": "Zakletý les vlevo uprostřed, DMG: XXX",
    "Naga Serpent": "Hadí chrám pravý horní roh, DMG: XXX"
  };

  // --- globální tooltip pro hover bossů ---
  let tooltipDiv = document.getElementById("bossInfoTooltip");
  if (!tooltipDiv) {
    tooltipDiv = document.createElement("div");
    tooltipDiv.id = "bossInfoTooltip";
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
      zIndex: "999999",
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

    let left = clientX + 12;
    let top = clientY + 12;
    tooltipDiv.style.left = left + "px";
    tooltipDiv.style.top = top + "px";

    requestAnimationFrame(() => {
      const rect = tooltipDiv.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (rect.right > vw - 12) left = Math.max(12, vw - rect.width - 12);
      if (rect.bottom > vh - 12) top = Math.max(12, vh - rect.height - 12);
      tooltipDiv.style.left = left + "px";
      tooltipDiv.style.top = top + "px";
    });
  }

  function hideTooltip() {
    tooltipDiv.style.opacity = "0";
    clearTimeout(tooltipDiv._hideTimeout);
    tooltipDiv._hideTimeout = setTimeout(() => { tooltipDiv.style.display = "none"; }, 120);
  }

  // --- spawn generation ---
  function generateSpawns() {
    const today = new Date();
    today.setHours(0,0,0,0);
    return bossConfig.map(b => {
      const times = [];
      let next = new Date(today);
      const endTime = today.getTime() + 24*60*60*1000;
      while(next.getTime() <= endTime){
        times.push(next.getTime());
        next = new Date(next.getTime() + b.cooldown*60*60*1000);
      }
      return { name: b.name, times };
    });
  }

  // --- spočítat kolik bosů se sejde ve stejný čas ---
  function getBossCounts(spawns) {
    const counts = {};
    spawns.forEach(b => {
      b.times.forEach(ts => {
        counts[ts] = (counts[ts] || 0) + 1;
      });
    });
    return counts; // {timestamp: number_of_bosses}
  }

  function updateBanner(spawnsData){
    const now = Date.now();
    const upcoming = [];
    spawnsData.forEach(b=>{
      const nextTimes = b.times.filter(ts=>ts>now);
      if(nextTimes.length) upcoming.push({name:b.name, nextTime:Math.min(...nextTimes)});
    });
    upcoming.sort((a,b)=>a.nextTime - b.nextTime);
    const nextTime = upcoming[0]?.nextTime || null;
    const nextBosses = upcoming.filter(b=>b.nextTime===nextTime).map(b=>b.name);

    // vykreslení tlačítek bossů
    bannerEl.innerHTML = nextBosses.map(name => 
      `<div class="boss-btn" data-boss="${name}">${name}</div>`
    ).join("");

    // countdown s barevnou změnou a blikáním
    if(nextTime){
      const diff = nextTime-now;
      const h = Math.floor(diff/1000/60/60);
      const m = Math.floor((diff/1000/60)%60);
      const s = Math.floor((diff/1000)%60);
      countdownEl.textContent = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;

      if(diff <= WARNING_TIME_MINUTES*60*1000) {
        countdownEl.style.color = blinkState ? "red" : "#fff";
      } else {
        countdownEl.style.color = "#fff";
      }
    } else {
      countdownEl.textContent = "00:00:00";
      countdownEl.style.color = "#fff";
    }

    blinkState = !blinkState; // přepnutí stavu pro blikání

    // --- hover tooltip pro každý boss ---
    bannerEl.querySelectorAll(".boss-btn").forEach(btn=>{
      const name = btn.dataset.boss;
      const info = bossInfo[name] || "Žádné informace";
      const moveHandler = e => showTooltipAt(info, e.clientX, e.clientY);
      const enterHandler = e => moveHandler(e);
      const leaveHandler = () => hideTooltip();

      btn.removeEventListener("mousemove", btn._moveHandler);
      btn.removeEventListener("mouseenter", btn._enterHandler);
      btn.removeEventListener("mouseleave", btn._leaveHandler);

      btn._moveHandler = moveHandler;
      btn._enterHandler = enterHandler;
      btn._leaveHandler = leaveHandler;

      btn.addEventListener("mousemove", moveHandler);
      btn.addEventListener("mouseenter", enterHandler);
      btn.addEventListener("mouseleave", leaveHandler);
    });

    // tabulka spawnů
    let html = "<table><tr><th>Boss</th><th>Spawn</th></tr>";
    const allSpawns = [];
    spawnsData.forEach(b=>{
      b.times.forEach(ts=>{
        if(ts>now && ts<=now+24*60*60*1000){
          allSpawns.push({name:b.name, time:ts});
        }
      });
    });

    // seřadit podle času
    allSpawns.sort((a,b)=>a.time - b.time);

    allSpawns.forEach(sp=>{
      const diff = sp.time-now;
      const h = Math.floor(diff/1000/60/60);
      const m = Math.floor((diff/1000/60)%60);
      const s = Math.floor((diff/1000)%60);
      html += `<tr><td>${sp.name}</td><td>${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}</td></tr>`;
    });
    html += "</table>";
    tableEl.innerHTML = html;

    // vypočítat kdy se sejde nejvíce bossů
    const counts = getBossCounts(spawnsData);
    const maxCount = Math.max(...Object.values(counts));
    const timesMax = Object.keys(counts).filter(k => counts[k] === maxCount)
      .map(ts => {
        const d = new Date(+ts);
        return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
      });

    console.log(`Nejvíce bossů (${maxCount}) se sejde v časech: ${timesMax.join(", ")}`);
  }

  const spawns = generateSpawns();
  updateBanner(spawns);
  setInterval(()=>updateBanner(spawns),1000);

  // klikací „?“
  tooltipIcon.addEventListener("click", e=>{
    e.stopPropagation();
    tableEl.classList.toggle("show");
  });
  document.addEventListener("click", ()=>tableEl.classList.remove("show"));
  tableEl.addEventListener("click", e=>e.stopPropagation());
}

initBossBanner();
