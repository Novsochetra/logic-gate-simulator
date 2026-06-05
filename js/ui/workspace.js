import { workspaces, activeWorkspaceId, setWorkspaces, setActiveWorkspaceId } from "../state.js";
import { workspaceModal, workspacesBtn, closeWorkspaceBtn } from "../dom.js";
import { saveWorkspaceList } from "../history.js";
import { loadSerializedState, loadFromLocalStorage, serializeState } from "../serialization.js";
import { createWorkspace } from "../actions.js";
import { draw } from "../render.js";

export function initWorkspaces() {
  try {
    const s = localStorage.getItem("logicSimulatorWorkspaces");
    if (s) setWorkspaces(JSON.parse(s));
  } catch (e) {}
  const active = localStorage.getItem("logicSimulatorActiveWorkspaceId") || "default";
  setActiveWorkspaceId(active);
  if (workspaces.length === 0) {
    setWorkspaces([{ id: "default", name: "Default Workspace", data: localStorage.getItem("logicSimulatorAutoSave") || serializeState() }]);
    setActiveWorkspaceId("default");
    saveWorkspaceList();
  }
}

export function renderWorkspaceList() {
  const list = document.getElementById("workspaceList");
  if (!list) return;
  list.innerHTML = "";
  workspaces.forEach(ws => {
    const item = document.createElement("div");
    item.className = `workspace-item ${ws.id === activeWorkspaceId ? "active" : ""}`;
    const nc = document.createElement("div"); nc.className = "workspace-name-container";
    const ns = document.createElement("span"); ns.className = "workspace-name"; ns.textContent = ws.name;
    const st = document.createElement("span"); st.className = "workspace-status"; st.textContent = ws.id === activeWorkspaceId ? "Active Workspace" : "Inactive";
    nc.appendChild(ns); nc.appendChild(st); item.appendChild(nc);
    const ac = document.createElement("div"); ac.className = "workspace-actions";
    if (ws.id !== activeWorkspaceId) {
      const lb = document.createElement("button"); lb.className = "workspace-action-btn"; lb.textContent = "Load";
      lb.addEventListener("click", () => {
        setActiveWorkspaceId(ws.id);
        saveWorkspaceList();
        if (ws.data) loadSerializedState(ws.data);
        renderWorkspaceList();
        draw();
      });
      ac.appendChild(lb);
    }
    if (workspaces.length > 1) {
      const db = document.createElement("button"); db.className = "workspace-action-btn delete"; db.textContent = "Delete";
      db.addEventListener("click", () => {
        if (!confirm("Delete this workspace?")) return;
        const filtered = workspaces.filter(w => w.id !== ws.id);
        setWorkspaces(filtered);
        if (activeWorkspaceId === ws.id) {
          setActiveWorkspaceId(filtered[0]?.id || "default");
          const t = workspaces.find(w => w.id === activeWorkspaceId);
          if (t?.data) loadSerializedState(t.data);
        }
        saveWorkspaceList();
        renderWorkspaceList();
        draw();
      });
      ac.appendChild(db);
    }
    item.appendChild(ac);
    list.appendChild(item);
  });
}

export function loadInitialCircuit() {
  const currentWS = workspaces.find(w => w.id === activeWorkspaceId);
  if (currentWS?.data && currentWS.data !== "null") {
    loadSerializedState(currentWS.data);
  } else {
    loadFromLocalStorage();
  }
}

export function setupWorkspaceUI() {
  workspacesBtn?.addEventListener("click", () => { workspaceModal.classList.add("show"); renderWorkspaceList(); });
  closeWorkspaceBtn?.addEventListener("click", () => workspaceModal.classList.remove("show"));
  workspaceModal?.addEventListener("mousedown", e => { if (e.target === workspaceModal) workspaceModal.classList.remove("show"); });

  const saveWorkspaceBtn = document.getElementById("saveWorkspaceBtn");
  const newWorkspaceName = document.getElementById("newWorkspaceName");
  saveWorkspaceBtn?.addEventListener("click", createWorkspace);
  newWorkspaceName?.addEventListener("keydown", e => { if (e.key === "Enter") createWorkspace(); });
}
