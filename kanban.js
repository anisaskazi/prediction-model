// ------- State & constants -------
const COLS = ["backlog", "progress", "review", "done"];
const STORAGE_KEY = "kanban_board_v1";
const THEME_KEY = "kanban_theme";
let state = loadState();

// ------- DOM -------
const dropzones = Object.fromEntries(COLS.map(c => [c, document.getElementById(`col-${c}`)]));
const searchInput = document.getElementById("search");
const tagFilter = document.getElementById("tagFilter");
const newTaskBtn = document.getElementById("newTaskBtn");
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");
const themeBtn = document.getElementById("themeBtn");

// Dialog fields
const dlg = document.getElementById("taskDialog");
const form = document.getElementById("taskForm");
const dialogTitle = document.getElementById("dialogTitle");
const titleEl = document.getElementById("title");
const descEl = document.getElementById("desc");
const priorityEl = document.getElementById("priority");
const dueEl = document.getElementById("due");
const tagsEl = document.getElementById("tags");
const taskIdEl = document.getElementById("taskId");
const taskColEl = document.getElementById("taskCol");
const deleteBtn = document.getElementById("deleteBtn");
const closeDialog = document.getElementById("closeDialog");

// ------- Utilities -------
function uid(){ return Math.random().toString(36).slice(2,10); }
function loadState(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { tasks: [] }; }
  catch{ return { tasks: [] }; }
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function setTheme(mode){ document.documentElement.classList.toggle("light", mode === "light"); localStorage.setItem(THEME_KEY, mode); }
function getTheme(){ return localStorage.getItem(THEME_KEY) || "dark"; }
function parseTags(str){ return (str||"").split(",").map(t=>t.trim()).filter(Boolean); }
function formatDate(d){ if(!d) return ""; return new Date(d).toLocaleDateString(); }

function allTags(){
  const set = new Set();
  state.tasks.forEach(t=>t.tags.forEach(x=>set.add(x)));
  return Array.from(set).sort();
}

// ------- Rendering -------
function render(){
  // clear
  COLS.forEach(c => dropzones[c].innerHTML = "");

  // gather filters
  const q = (searchInput.value || "").toLowerCase();
  const tagQ = tagFilter.value;

  // empty marker
  const counters = { backlog:0, progress:0, review:0, done:0 };

  state.tasks.forEach(task => {
    if (q) {
      const hay = `${task.title} ${task.desc} ${task.tags.join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return;
    }
    if (tagQ && !task.tags.includes(tagQ)) return;

    counters[task.col]++;

    const tpl = document.getElementById("cardTpl");
    const node = tpl.content.firstElementChild.cloneNode(true);

    node.dataset.id = task.id;
    node.querySelector(".title").textContent = task.title;
    node.querySelector(".desc").textContent = task.desc || "";
    node.querySelector(".prio").style.background = task.priority === "high" ? "var(--red)" :
                                                  task.priority === "med" ? "var(--accent)" : "var(--green)";
    node.querySelector(".due").textContent = task.due ? "Due " + formatDate(task.due) : "";

    const tagsEl = node.querySelector(".tags");
    task.tags.forEach(t => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = t;
      tagsEl.appendChild(span);
    });

    // actions
    node.querySelector(".edit").addEventListener("click", () => openEdit(task));
    node.querySelector(".del").addEventListener("click", () => removeTask(task.id));

    // DnD hooks
    node.addEventListener("dragstart", handleDragStart);
    node.addEventListener("keydown", (e) => {
      if (e.key === "Enter") openEdit(task);
      if (e.key === "Delete") removeTask(task.id);
    });

    dropzones[task.col].appendChild(node);
  });

  // show empty hints
  COLS.forEach(c=>{
    if(counters[c]===0){
      const div=document.createElement("div");
      div.className="empty";
      div.textContent="Drop tasks here or create a new one.";
      dropzones[c].appendChild(div);
    }
  });

  // rebuild tag filter
  const tags = allTags();
  const cur = tagFilter.value;
  tagFilter.innerHTML = `<option value="">All tags</option>` + tags.map(t=>`<option ${t===cur?'selected':''} value="${t}">${t}</option>`).join("");
}

// ------- CRUD -------
function addTask(partial){
  const t = {
    id: uid(),
    title: partial.title,
    desc: partial.desc||"",
    priority: partial.priority||"med",
    due: partial.due||"",
    tags: parseTags(partial.tags),
    col: partial.col||"backlog",
    createdAt: Date.now()
  };
  state.tasks.unshift(t);
  saveState(); render();
}
function updateTask(id, patch){
  const t = state.tasks.find(x=>x.id===id);
  if(!t) return;
  Object.assign(t, patch, { tags: parseTags(patch.tags ?? t.tags.join(",")) });
  saveState(); render();
}
function removeTask(id){
  state.tasks = state.tasks.filter(t=>t.id!==id);
  saveState(); render();
}

// ------- Dialog open helpers -------
function openNew(column="backlog"){
  dialogTitle.textContent = "New Task";
  form.reset();
  deleteBtn.hidden = true;
  taskIdEl.value = "";
  taskColEl.value = column;
  dlg.showModal();
  titleEl.focus();
}
function openEdit(task){
  dialogTitle.textContent = "Edit Task";
  titleEl.value = task.title;
  descEl.value = task.desc || "";
  priorityEl.value = task.priority || "med";
  dueEl.value = task.due || "";
  tagsEl.value = task.tags.join(", ");
  taskIdEl.value = task.id;
  taskColEl.value = task.col;
  deleteBtn.hidden = false;
  dlg.showModal();
  titleEl.focus();
}

// ------- Drag & Drop -------
let dragId = null;
function handleDragStart(e){
  dragId = e.currentTarget.dataset.id;
  e.dataTransfer.setData("text/plain", dragId);
  e.dataTransfer.effectAllowed = "move";
}
document.querySelectorAll(".dropzone").forEach(zone=>{
  zone.addEventListener("dragover", (e)=>{ e.preventDefault(); zone.classList.add("dragover"); });
  zone.addEventListener("dragleave", ()=> zone.classList.remove("dragover"));
  zone.addEventListener("drop", (e)=>{
    e.preventDefault(); zone.classList.remove("dragover");
    const id = e.dataTransfer.getData("text/plain") || dragId;
    if(!id) return;
    updateTask(id, { col: zone.dataset.col });
  });
});

// ------- Events -------
newTaskBtn.addEventListener("click", ()=> openNew());
closeDialog.addEventListener("click", ()=> dlg.close());

form.addEventListener("submit", (e)=>{
  e.preventDefault();
  const payload = {
    title: titleEl.value.trim(),
    desc: descEl.value.trim(),
    priority: priorityEl.value,
    due: dueEl.value,
    tags: tagsEl.value,
    col: taskColEl.value || "backlog"
  };
  if(!payload.title) return;

  const id = taskIdEl.value;
  if(id) updateTask(id, payload); else addTask(payload);
  dlg.close();
});

deleteBtn.addEventListener("click", ()=>{
  if(taskIdEl.value) removeTask(taskIdEl.value);
  dlg.close();
});

searchInput.addEventListener("input", render);
tagFilter.addEventListener("change", render);

exportBtn.addEventListener("click", ()=>{
  const blob = new Blob([JSON.stringify(state, null, 2)], { type:"application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `kanban-export-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

importInput.addEventListener("change", async (e)=>{
  const file = e.target.files?.[0];
  if(!file) return;
  try{
    const txt = await file.text();
    const data = JSON.parse(txt);
    if(!data || !Array.isArray(data.tasks)) throw new Error("Invalid file format");
    state = data;
    saveState(); render();
  }catch(err){
    alert("Import failed: " + err.message);
  }finally{
    e.target.value = "";
  }
});

themeBtn.addEventListener("click", ()=>{
  const next = getTheme()==="dark" ? "light" : "dark";
  setTheme(next);
  themeBtn.textContent = next==="dark" ? "🌙" : "☀️";
});

// ------- Boot -------
(function init(){
  setTheme(getTheme());
  themeBtn.textContent = getTheme()==="dark" ? "🌙" : "☀️";

  // seed example tasks if empty
  if(state.tasks.length === 0){
    addTask({ title:"Welcome to your Kanban!", desc:"Drag me across columns.", priority:"med", tags:"intro,docs" });
    addTask({ title:"Build portfolio", desc:"Polish README + screenshots", priority:"high", tags:"portfolio", col:"progress" });
    addTask({ title:"Fix UI spacing", priority:"low", tags:"ui,css", col:"review" });
    addTask({ title:"Deploy to GitHub Pages", priority:"med", tags:"deploy,github", col:"done" });
  } else {
    render();
  }
})();
