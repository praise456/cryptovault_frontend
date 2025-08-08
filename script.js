const API_BASE = "https://crypto-backend-t3bz.onrender.com";

/* ---------- Helpers ---------- */
function showMsg(id, text, isError = true) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? "red" : "green";
}

function setLoading(button, loading = true, text = "Please wait...") {
  if (!button) return;
  if (loading) {
    button.dataset.origText = button.dataset.origText || button.textContent;
    button.disabled = true;
    button.textContent = text;
  } else {
    button.disabled = false;
    button.textContent = button.dataset.origText || button.textContent;
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return { ok: res.ok, msg: res.statusText || "Unexpected server response" };
  }
}

async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const { signal } = controller;
  const fetchOptions = { ...options, signal };

  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, fetchOptions);
    clearTimeout(timer);

    if (!res.ok) {
      let bodyText = null;
      try { bodyText = await res.text(); } catch (_) {}
      const err = new Error(`HTTP error: ${res.status}`);
      err.type = 'http';
      err.status = res.status;
      err.responseText = bodyText;
      throw err;
    }

    return res;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      const e = new Error('Request timeout');
      e.type = 'timeout';
      throw e;
    }
    const e = new Error(err.message || 'Network or CORS error');
    e.type = 'network';
    throw e;
  }
}

/* ---------- DOM ready ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const investmentForm = document.getElementById("investmentForm");

  // ---------- LOGIN ----------
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      showMsg("loginMsg", "");
      const email = (document.getElementById("email")?.value || "").trim();
      const password = (document.getElementById("password")?.value || "").trim();
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      if (!email || !password) return showMsg("loginMsg", "Email and password are required.");
      if (!isValidEmail(email)) return showMsg("loginMsg", "Please enter a valid email.");
      if (password.length < 6) return showMsg("loginMsg", "Password must be at least 6 characters.");

      setLoading(submitBtn, true);
      try {
        const res = await fetchWithTimeout(`${API_BASE}/api/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }, 15000);
        const data = await safeJson(res);

        if (data.token) localStorage.setItem("token", data.token);
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
        showMsg("loginMsg", "Login successful. Redirecting...", false);
        setTimeout(() => (window.location.href = "dashboard.html"), 300);
      } catch (err) {
        console.error("Login error:", err);
        if (err.type === 'timeout') showMsg("loginMsg", "Request timed out. Try again.");
        else if (err.type === 'network') showMsg("loginMsg", " Check Internet Connection");
        else if (err.type === 'http') {
          let bodyMsg = 'Login failed';
          try {
            const parsed = JSON.parse(err.responseText || '{}');
            if (parsed.msg) bodyMsg = parsed.msg;
            else if (Array.isArray(parsed.errors)) bodyMsg = parsed.errors.join('; ');
          } catch (_) {}
          showMsg("loginMsg", `${bodyMsg} (${err.status})`);
        } else showMsg("loginMsg", "Server error");
      } finally {
        setLoading(submitBtn, false);
      }
    });
  }

  // ---------- REGISTER ----------
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      showMsg("registerMsg", "");
      const name = (document.getElementById("regName")?.value || "").trim();
      const email = (document.getElementById("regEmail")?.value || "").trim();
      const password = (document.getElementById("regPassword")?.value || "").trim();
      const submitBtn = registerForm.querySelector('button[type="submit"]');

      if (!name || !email || !password) return showMsg("registerMsg", "All fields are required.");
      if (!isValidEmail(email)) return showMsg("registerMsg", "Please enter a valid email.");
      if (password.length < 6) return showMsg("registerMsg", "Password must be at least 6 characters.");

      setLoading(submitBtn, true);
      try {
        const res = await fetchWithTimeout(`${API_BASE}/api/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        }, 20000);

        const data = await safeJson(res);

        if (data.token) localStorage.setItem("token", data.token);
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
        showMsg("registerMsg", "Registration successful. Redirecting...", false);
        setTimeout(() => (window.location.href = "dashboard.html"), 300);
      } catch (err) {
        console.error("Register error:", err);
        if (err.type === 'timeout') showMsg("registerMsg", "Request timed out. Try again.");
        else if (err.type === 'network') showMsg("registerMsg", "Check Internet Connection");
        else if (err.type === 'http') {
          let bodyMsg = 'Registration failed';
          try {
            const parsed = JSON.parse(err.responseText || '{}');
            if (parsed.msg) bodyMsg = parsed.msg;
            else if (Array.isArray(parsed.errors)) bodyMsg = parsed.errors.join('; ');
          } catch (_) {}
          showMsg("registerMsg", `${bodyMsg} (${err.status})`);
        } else showMsg("registerMsg", "Server error");
      } finally {
        setLoading(submitBtn, false);
      }
    });
  }

  // ---------- DASHBOARD & INVEST ----------
  if (window.location.pathname.includes("dashboard.html")) {
    const nameEl = document.getElementById("userName");
    const token = localStorage.getItem("token");

    if (!token) return (window.location.href = "login.html");

    // ✅ Show name instantly from localStorage
    const localUser = JSON.parse(localStorage.getItem("user") || "{}");
    if (localUser.name && nameEl) {
      nameEl.textContent = localUser.name;
    }

    // ✅ Then fetch latest from backend
    (async () => {
      try {
        const res = await fetchWithTimeout(`${API_BASE}/user`, {
          headers: { "x-auth-token": token },
        }, 15000);

        const data = await safeJson(res);

        if (!data || !data.email) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          return (window.location.href = "login.html");
        }

        if (nameEl) nameEl.textContent = data.name || "User";
        localStorage.setItem("user", JSON.stringify(data));

        const balanceEl = document.getElementById("balance");
        if (balanceEl && typeof data.balance === "number") {
          balanceEl.textContent = `$${data.balance.toFixed(2)}`;
        }

        const list = document.getElementById("investmentList");
        if (list && Array.isArray(data.investments)) {
          list.innerHTML = "";
          data.investments.forEach(inv => {
            const li = document.createElement("li");
            li.textContent = `${inv.plan || "Unknown"}: $${inv.amount || 0} ➜ ROI: $${inv.roi || 0}`;
            list.appendChild(li);
          });
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "login.html";
      }
    })();
  }

  // ---------- INVEST ----------
  if (investmentForm) {
    investmentForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const plan = (document.getElementById("plan")?.value || "").trim();
      const amountVal = document.getElementById("amount")?.value;
      const amount = parseFloat(amountVal);
      if (!plan) return showMsg("investMsg", "Please select an investment plan.");
      if (!amountVal || Number.isNaN(amount) || amount <= 0) return showMsg("investMsg", "Enter a valid amount.");

      const token = localStorage.getItem("token");
      const submitBtn = investmentForm.querySelector('button[type="submit"]');
      setLoading(submitBtn, true);
      try {
        const res = await fetchWithTimeout(`${API_BASE}/user/invest`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": token,
          },
          body: JSON.stringify({ plan, amount }),
        }, 20000);
        const data = await safeJson(res);

        showMsg("investMsg", "Investment successful!", false);
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        console.error("Investment error:", err);
        if (err.type === 'timeout') showMsg("investMsg", "Request timed out. Try again.");
        else if (err.type === 'network') showMsg("investMsg", "Network or CORS error. Check console.");
        else if (err.type === 'http') {
          let bodyMsg = 'Error occurred';
          try {
            const parsed = JSON.parse(err.responseText || '{}');
            bodyMsg = parsed.msg || (Array.isArray(parsed.errors) ? parsed.errors.join('; ') : bodyMsg);
          } catch (_) {}
          showMsg("investMsg", `${bodyMsg} (${err.status})`);
        } else showMsg("investMsg", "Server error");
      } finally {
        setLoading(submitBtn, false);
      }
    });
  }

  // ---------- Wallet Connect ----------
  const connectBtn = document.getElementById("connectWalletBtn");
  if (connectBtn) connectBtn.addEventListener("click", connectWallet);
});

/* ---------- Logout ---------- */
function logout() {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

/* ---------- MetaMask wallet ---------- */
async function connectWallet() {
  if (typeof window.ethereum === "undefined") {
    alert("MetaMask not detected. Please install MetaMask.");
    return;
  }
  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const wallet = accounts && accounts[0];
    if (wallet) {
      const el = document.getElementById("walletAddress");
      if (el) el.textContent = wallet;
    } else {
      alert("No wallet account returned.");
    }
  } catch (err) {
    console.error("Wallet connect failed:", err);
    alert("Wallet connection failed.");
  }
}
