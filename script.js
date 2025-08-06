const API_BASE = "https://crypto-backend-t3bz.onrender.com";

// ---------- Helpers ----------
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

function fetchWithTimeout(resource, options = {}, timeout = 10000) {
  return Promise.race([
    fetch(resource, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), timeout)
    ),
  ]);
}

// ---------- DOM ready ----------
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const investmentForm = document.getElementById("investmentForm");

  // ---- LOGIN ----
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
        });
        const data = await safeJson(res);
        if (res.ok) {
          if (data.token) localStorage.setItem("token", data.token);
          if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
          showMsg("loginMsg", "Login successful. Redirecting...", false);
          setTimeout(() => (window.location.href = "dashboard.html"), 700);
        } else {
          showMsg("loginMsg", data.msg || `Login failed (${res.status})`);
        }
      } catch (err) {
        console.error("Login error:", err);
        showMsg("loginMsg", err.message === "Request timeout" ? "Request timed out" : "Server error");
      } finally {
        setLoading(submitBtn, false);
      }
    });
  }

  // ---- REGISTER ----
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      showMsg("registerMsg", "");
      const email = (document.getElementById("regEmail")?.value || "").trim();
      const password = (document.getElementById("regPassword")?.value || "").trim();
      const submitBtn = registerForm.querySelector('button[type="submit"]');

      if (!email || !password) return showMsg("registerMsg", "Email and password are required.");
      if (!isValidEmail(email)) return showMsg("registerMsg", "Please enter a valid email.");
      if (password.length < 6) return showMsg("registerMsg", "Password must be at least 6 characters.");

      setLoading(submitBtn, true);
      try {
        const res = await fetchWithTimeout(`${API_BASE}/api/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await safeJson(res);
        if (res.ok) {
          if (data.token) localStorage.setItem("token", data.token);
          if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
          showMsg("registerMsg", "Registration successful. Redirecting...", false);
          setTimeout(() => (window.location.href = "dashboard.html"), 700);
        } else {
          showMsg("registerMsg", data.msg || `Registration failed (${res.status})`);
        }
      } catch (err) {
        console.error("Register error:", err);
        showMsg("registerMsg", err.message === "Request timeout" ? "Request timed out" : "Server error");
      } finally {
        setLoading(submitBtn, false);
      }
    });
  }

  // ---- DASHBOARD DATA & INVEST ----
  if (window.location.pathname.includes("dashboard.html")) {
    const token = localStorage.getItem("token");
    if (!token) return (window.location.href = "login.html");

    (async () => {
      try {
        const res = await fetchWithTimeout(`${API_BASE}/user`, {
          headers: { "x-auth-token": token },
        });
        const data = await safeJson(res);

        if (!res.ok || !data.email) {
          // token invalid or expired; redirect to login
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          return (window.location.href = "login.html");
        }

        // populate dashboard
        const balanceEl = document.getElementById("balance");
        if (balanceEl && typeof data.balance === "number") {
          balanceEl.textContent = `$${data.balance.toFixed(2)}`;
        }
        const list = document.getElementById("investmentList");
        if (list && Array.isArray(data.investments)) {
          list.innerHTML = "";
          data.investments.forEach((inv) => {
            const li = document.createElement("li");
            // guard against undefined fields
            const plan = inv.plan || "Unknown plan";
            const amount = typeof inv.amount === "number" ? inv.amount : inv.amount || "N/A";
            const roi = typeof inv.roi === "number" ? inv.roi : inv.roi || "N/A";
            li.textContent = `${plan}: $${amount} ➜ ROI: $${roi}`;
            list.appendChild(li);
          });
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        // on error, force login to be safe
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "login.html";
      }
    })();

    // investment form handling
    if (investmentForm) {
      investmentForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const plan = (document.getElementById("plan")?.value || "").trim();
        const amountVal = document.getElementById("amount")?.value;
        const amount = parseFloat(amountVal);
        const msgEl = document.getElementById("investMsg");
        const submitBtn = investmentForm.querySelector('button[type="submit"]');

        if (!plan) return showMsg("investMsg", "Please select an investment plan.");
        if (!amountVal || Number.isNaN(amount) || amount <= 0) return showMsg("investMsg", "Enter a valid amount.");

        setLoading(submitBtn, true);
        try {
          const res = await fetchWithTimeout(`${API_BASE}/user/invest`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-auth-token": token,
            },
            body: JSON.stringify({ plan, amount }),
          }, 15000);
          const data = await safeJson(res);
          if (res.ok) {
            showMsg("investMsg", "Investment successful!", false);
            setTimeout(() => window.location.reload(), 1000);
          } else {
            showMsg("investMsg", data.msg || `Error: ${res.status}`);
          }
        } catch (err) {
          console.error("Investment error:", err);
          showMsg("investMsg", err.message === "Request timeout" ? "Request timed out" : "Server error");
        } finally {
          setLoading(submitBtn, false);
        }
      });
    }
  }

  // Wallet connect button bind (if present)
  const connectBtn = document.getElementById("connectWalletBtn");
  if (connectBtn) connectBtn.addEventListener("click", connectWallet);
});

// ---------- Logout ----------
function logout() {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

// ---------- MetaMask wallet ----------
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
