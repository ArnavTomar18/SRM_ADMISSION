const API_BASE = "http://localhost:5000/api";

function normalizePath(path, method = "GET") {
  if (!path) return path;

  const route = path.trim();
  let match = route.match(/^\/student\/(\d+)$/);
  if (match && method === "GET") return `/student/${match[1]}`;

  match = route.match(/^\/student\/(\d+)\/allocation$/);
  if (match && method === "GET") return `/allocation/${match[1]}`;

  match = route.match(/^\/student\/(\d+)\/payments$/);
  if (match && method === "GET") return `/payment/${match[1]}`;

  match = route.match(/^\/student\/(\d+)\/preferences$/);
  if (match && method === "GET") return `/counselling/${match[1]}`;

  match = route.match(/^\/student\/(\d+)\/preferences$/);
  if (match && method === "POST") return "/counselling";

  match = route.match(/^\/student\/(\d+)\/allocate$/);
  if (match && method === "POST") return "/allocateSeat";

  match = route.match(/^\/student\/(\d+)\/payments$/);
  if (match && method === "POST") return "/payment";

  return route;
}

function unwrapResponse(response) {
  if (response && typeof response === "object" && "token" in response) {
    return {
      ...(response.data && typeof response.data === "object" ? response.data : {}),
      token: response.token
    };
  }

  if (response && typeof response === "object" && "data" in response) {
    return response.data;
  }

  return response;
}

function getToken() {
  return localStorage.getItem("token");
}

function getStudent() {
  const raw = localStorage.getItem("student");
  return raw ? JSON.parse(raw) : null;
}

function getStudentId(student = getStudent()) {
  return student?.id || student?.Std_ID || null;
}

function normalizeStudent(rawStudent = {}) {
  return {
    id: rawStudent.id || rawStudent.Std_ID || null,
    Std_ID: rawStudent.Std_ID || rawStudent.id || null,
    fullName: rawStudent.fullName || rawStudent.Name || rawStudent.full_name || "",
    Name: rawStudent.Name || rawStudent.fullName || rawStudent.full_name || "",
    email: rawStudent.email || rawStudent.Email || "",
    Email: rawStudent.Email || rawStudent.email || ""
  };
}

function saveSession(data) {
  const rawStudent =
    data?.student ||
    data?.data ||
    (data && (data.id || data.Std_ID || data.Name || data.Email) ? data : {});
  const student = normalizeStudent(rawStudent);

  if (data?.token) {
    localStorage.setItem("token", data.token);
  }

  localStorage.setItem("student", JSON.stringify(student));
}

function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("student");
  localStorage.removeItem("session");
}

function logout() {
  clearSession();
  window.location.href = "login.html";
}

async function apiFetch(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${normalizePath(path, method)}`, {
      ...options,
      headers
    });
  } catch (_error) {
    throw new Error("Cannot reach backend server at http://localhost:5000. Start the backend and try again.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

async function apiRequest(method, path, body, includeAuth = false) {
  const headers = {};
  if (includeAuth && getToken()) {
    headers.Authorization = `Bearer ${getToken()}`;
  }

  const normalizedPath = normalizePath(path, method);
  let normalizedBody = body;

  if (normalizedPath === "/counselling" && body && Array.isArray(body.choices)) {
    const studentIdMatch = path.match(/^\/student\/(\d+)\/preferences$/);
    const studentId = studentIdMatch ? Number(studentIdMatch[1]) : getStudentId();
    const choices = [...body.choices].sort((a, b) => a.preference_rank - b.preference_rank);

    for (const choice of choices) {
      await apiFetch("/counselling", {
        method: "POST",
        headers,
        body: JSON.stringify({
          studentId,
          campusId: choice.campus_id,
          programId: choice.program_id,
          preferenceOrder: choice.preference_rank
        })
      });
    }

    return choices;
  }

  if (normalizedPath === "/allocateSeat") {
    const studentIdMatch = path.match(/^\/student\/(\d+)\/allocate$/);
    const studentId = studentIdMatch ? Number(studentIdMatch[1]) : getStudentId();
    normalizedBody = { ...(body || {}), studentId };
  }

  if (normalizedPath === "/payment") {
    const studentIdMatch = path.match(/^\/student\/(\d+)\/payments$/);
    const studentId = studentIdMatch ? Number(studentIdMatch[1]) : getStudentId();
    normalizedBody = {
      studentId,
      amount: body?.amount ?? 25000,
      payment_method: body?.payment_method || body?.method || "UPI"
    };
  }

  const response = await apiFetch(path, {
    method,
    headers,
    ...(normalizedBody !== null && normalizedBody !== undefined
      ? { body: JSON.stringify(normalizedBody) }
      : {})
  });

  return unwrapResponse(response);
}

function bindStatus(id) {
  return function setStatus(message, payload) {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = payload ? `${message}\n\n${JSON.stringify(payload, null, 2)}` : message;
  };
}

async function populateSelect(endpoint, selectId, formatter) {
  const select = document.getElementById(selectId);
  if (!select) return;

  const rows = unwrapResponse(await apiFetch(endpoint, { method: "GET" })) || [];
  rows.forEach((row) => {
    const option = document.createElement("option");
    option.value = row.id;
    option.textContent = formatter(row);
    select.appendChild(option);
  });
}

function showAlert(id, type, message) {
  const element = document.getElementById(id);
  if (!element) return;

  element.classList.remove("hidden");
  element.style.display = "block";
  element.style.padding = "12px 14px";
  element.style.marginBottom = "16px";
  element.style.borderRadius = "12px";
  element.style.fontFamily = '"Trebuchet MS", Verdana, sans-serif';
  element.style.background = type === "success" ? "#dcfce7" : "#fee2e2";
  element.style.color = type === "success" ? "#166534" : "#991b1b";
  element.style.border = `1px solid ${type === "success" ? "#86efac" : "#fecaca"}`;
  element.textContent = message;
}

function clearAlert(id) {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = "";
  element.classList.add("hidden");
  element.removeAttribute("style");
}

function setLoading(button, isLoading, loadingText = "Loading...") {
  if (!button) return;

  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.textContent = loadingText;
    return;
  }

  button.disabled = false;
  button.textContent = button.dataset.originalText || button.textContent;
}

const Auth = {
  save(_key, data) {
    saveSession(data);
  },
  clear() {
    clearSession();
  },
  student() {
    return getStudent();
  },
  requireAuth() {
    if (!getToken()) {
      window.location.href = "login.html";
    }
  }
};

function renderAuthNav() {
  const navArea = document.getElementById("nav-auth-area");
  if (!navArea) return;

  const student = getStudent();

  if (student && getToken()) {
    const displayName = student.fullName || student.Name || "Student";

    navArea.innerHTML = `
      <a href="dashboard.html" style="color:#cbd5e1;font-size:.9rem;text-decoration:none;">
        ${displayName}
      </a>
      <button type="button" class="btn-nav-outline" id="logout-btn">Logout</button>
    `;

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", logout);
    }
    return;
  }

  navArea.innerHTML = `
    <a href="login.html" class="btn-nav-outline">Login</a>
    <a href="register.html" class="btn-nav-fill">Apply Now</a>
  `;
}

function renderSidebarUser() {
  const student = getStudent();
  const avatar = document.getElementById("sidebar-avatar");
  const nameEl = document.getElementById("sidebar-name");
  const idEl = document.getElementById("sidebar-id");

  if (!avatar || !nameEl || !idEl) return;

  if (!student) {
    avatar.textContent = "S";
    nameEl.textContent = "Student";
    idEl.textContent = "ID: -";
    return;
  }

  const displayName = student.fullName || student.Name || "Student";

  avatar.textContent = displayName.charAt(0).toUpperCase();

  // Create clickable link
  const link = document.createElement("a");
  link.href = "dashboard.html";
  link.textContent = displayName;
  link.style.color = "#cbd5e1";
  link.style.textDecoration = "none";

  nameEl.innerHTML = "";
  nameEl.appendChild(link);

  idEl.textContent = `ID: ${getStudentId(student) || "-"}`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatCurrency(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return value || "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(amount);
}

function badgeHtml(status) {
  const raw = String(status || "Pending");
  const normalized = raw.toUpperCase();
  let badgeClass = "badge-info";

  if (["SUCCESS", "CONFIRMED", "ALLOCATED"].includes(normalized)) {
    badgeClass = "badge-success";
  } else if (["FAILED", "REJECTED", "ERROR"].includes(normalized)) {
    badgeClass = "badge-danger";
  } else if (normalized === "PENDING") {
    badgeClass = "badge-warning";
  } else if (normalized === "NOT ALLOCATED") {
    badgeClass = "badge-muted";
  }

  return `<span class="badge ${badgeClass}">${raw}</span>`;
}

document.addEventListener("DOMContentLoaded", () => {
  renderAuthNav();
  renderSidebarUser();
});
