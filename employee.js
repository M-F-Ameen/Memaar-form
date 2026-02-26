// Employee Dashboard JavaScript
document.addEventListener("DOMContentLoaded", function () {
  // Authentication elements
  const loginModal = document.getElementById("loginModal");
  const employeeContent = document.getElementById("employeeContent");
  const loginForm = document.getElementById("loginForm");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginError = document.getElementById("loginError");

  let userRole = null;

  // Check authentication on load
  checkAuth();

  async function checkAuth() {
    try {
      const response = await fetch("/api/admin/check", {
        credentials: "include",
      });
      const data = await response.json();
      if (data.authenticated && data.role === "employee") {
        userRole = data.role;
        showEmployeeContent();
      } else {
        // If not employee or not authenticated, redirect to admin.html
        window.location.href = "admin.html";
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      window.location.href = "admin.html";
    }
  }

  function showLoginModal() {
    loginModal.style.display = "block";
    employeeContent.style.display = "none";
  }

  function showEmployeeContent() {
    loginModal.style.display = "none";
    employeeContent.style.display = "block";
    fetchEvaluations();
  }

  // Login form handler
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(loginForm);
    const password = formData.get("password");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (data.success && data.role === "employee") {
        userRole = data.role;
        showEmployeeContent();
      } else {
        loginError.textContent = "كلمة المرور غير صحيحة";
      }
    } catch (error) {
      console.error("Login error:", error);
      loginError.textContent = "حدث خطأ في تسجيل الدخول";
    }
  });

  // Logout button handler
  logoutBtn.addEventListener("click", async () => {
    try {
      const response = await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) {
        window.location.href = "admin.html";
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  });

  // Fetch data from backend
  let evaluations = [];
  let eventSource = null;

  // Function to fetch evaluations from server

  async function fetchEvaluations() {
    try {
      const response = await fetch("/api/evaluations", {
        credentials: "include",
      });
      evaluations = await response.json();
      populateTable(evaluations);
    } catch (error) {
      console.error("Error fetching evaluations:", error);
    }
  }

  // Set up Server-Sent Events for real-time notifications
  function setupEventSource() {
    if (eventSource) {
      eventSource.close();
    }
    eventSource = new EventSource("/api/notifications");

    eventSource.onmessage = function (event) {
      const data = JSON.parse(event.data);
      if (data.type === "new_evaluation") {
        // Fetch evaluations to update the table
        fetchEvaluations();
      }
    };

    eventSource.onerror = function (error) {
      console.error("EventSource error:", error);
      // Attempt to reconnect after a delay
      setTimeout(setupEventSource, 5000);
    };
  }

  setupEventSource();

  // Function to populate table
  function populateTable(evaluations) {
    const tableBody = document.getElementById("tableBody");
    tableBody.innerHTML = "";
    evaluations.forEach((eval) => {
      const row = document.createElement("tr");
      const date = new Date(eval.date).toLocaleDateString("ar-EG");
      row.innerHTML = `
        <td>${date}</td>
        <td>${eval.name || "-"}</td>
        <td>${eval.phone || "-"}</td>
        <td>${eval.q1}</td>
        <td>${eval.q2}</td>
        <td>${eval.q3}</td>
        <td>${eval.q4}</td>
        <td>${eval.comments || "-"}</td>
      `;
      tableBody.appendChild(row);
    });
  }
});
