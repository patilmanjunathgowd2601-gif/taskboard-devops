const API_BASE = "http://localhost:5000/api";

const taskForm = document.getElementById("task-form");
const titleInput = document.getElementById("title");
const descInput = document.getElementById("description");
const taskList = document.getElementById("task-list");
const apiStatus = document.getElementById("api-status");

async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    apiStatus.textContent = res.ok ? "API online" : "API unreachable";
  } catch (err) {
    apiStatus.textContent = "API unreachable";
  }
}

async function loadTasks() {
  const res = await fetch(`${API_BASE}/tasks`);
  const tasks = await res.json();
  taskList.innerHTML = "";
  tasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = "task-item";
    li.innerHTML = `<span>${task.title}</span>`;
    const btn = document.createElement("button");
    btn.textContent = "Delete";
    btn.addEventListener("click", () => deleteTask(task._id));
    li.appendChild(btn);
    taskList.appendChild(li);
  });
}

async function deleteTask(id) {
  await fetch(`${API_BASE}/tasks/${id}`, { method: "DELETE" });
  loadTasks();
}

taskForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  await fetch(`${API_BASE}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: titleInput.value, description: descInput.value }),
  });
  titleInput.value = "";
  descInput.value = "";
  loadTasks();
});

checkHealth();
loadTasks();
