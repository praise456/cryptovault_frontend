const API_BASE = "http://localhost:5000/api";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const investmentForm = document.getElementById("investmentForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          window.location.href = "dashboard.html";
        } else {
          document.getElementById("loginMsg").textContent = data.msg || "Login failed";
        }
      } catch (err) {
        document.getElementById("loginMsg").textContent = "Server error";
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("regEmail").value;
      const password = document.getElementById("regPassword").value;

      try {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          window.location.href = "dashboard.html";
        } else {
          document.getElementById("registerMsg").textContent = data.msg || "Registration failed";
        }
      } catch (err) {
        document.getElementById("registerMsg").textContent = "Server error";
      }
    });
  }

  if (window.location.pathname.includes("dashboard.html")) {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "login.html";
    } else {
      fetch(`${API_BASE}/user`, {
        headers: {
          "x-auth-token": token,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.email) {
            document.getElementById("balance").textContent = `$${data.balance.toFixed(2)}`;
            const list = document.getElementById("investmentList");
            list.innerHTML = "";
            data.investments.forEach(inv => {
              const li = document.createElement("li");
              li.textContent = `${inv.plan}: $${inv.amount} ➜ ROI: $${inv.roi}`;
              list.appendChild(li);
            });
          } else {
            window.location.href = "login.html";
          }
        })
        .catch(() => {
          window.location.href = "login.html";
        });

      // Handle investment form submission
      if (investmentForm) {
        investmentForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          const plan = document.getElementById("plan").value;
          const amount = parseFloat(document.getElementById("amount").value);
          const msg = document.getElementById("investMsg");

          try {
            const res = await fetch(`${API_BASE}/user/invest`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-auth-token": token,
              },
              body: JSON.stringify({ plan, amount }),
            });
            const data = await res.json();
            if (res.ok) {
              msg.style.color = "lightgreen";
              msg.textContent = "Investment successful!";
              setTimeout(() => window.location.reload(), 1000);
            } else {
              msg.style.color = "red";
              msg.textContent = data.msg || "Error occurred";
            }
          } catch (err) {
            msg.textContent = "Server error";
          }
        });
      }
    }
  }
});

function logout() {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

// Connect to MetaMask
async function connectWallet() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const wallet = accounts[0];
      document.getElementById('walletAddress').textContent = wallet;
    } catch (err) {
      alert("Wallet connection failed");
    }
  } else {
    alert("MetaMask not detected. Please install the MetaMask extension.");
  }
}
