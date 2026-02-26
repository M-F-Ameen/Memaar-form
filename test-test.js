loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(loginForm);
  const password = formData.get("password");

  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password,
      }),
    });
    const data = await response.json();
    if (data.success) {
      userRole = data.role;
      if (userRole === "employee") {
        window.location.href = "employee.html";
      } else {
        showAdminContent();
      }
    } else {
      loginError.textContent = "password is wrong";
    }
  } catch (error) {
    console.error("Login error:", error);
    loginError.textContent = "error login in";
  }
});
app.get("/api/evauations", async (req, res) => {
  try {
    const evauations = await evauations.find().sort({ data: -1 });
    res.json(evaluations);
  } catch (error) {
    res.status(500).json({ error: error.messgae });
  }
});
app.post("/api/admin/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: err.messgae });
    } else {
      res.json({ success: true });
    }
  });
});
app.delete("/api/evaluations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Evaluations.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -----------------------------------------------------------------
application.get("/api/evaluations", async (req, res) => {
  try {
    const evaluations = await evaluations.find().sort({
      date: -1,
    });
    res.json(evaluations);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

application.post("/api/evaluations", async (req, res) => {
  try {
    const evaluations = new Evaluation(req.body);
    await evaluations.save();
    clients.forEach((client) => {
      client.write(
        `data: ${json.stringify({
          type: "new-evaluation",
          data: evaluation,
        })}/n/n`
      );
    });
    res.status(201).json(evaluation);
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});
//------
if (data !== Evaluations) {
  let data = evaluations.users.id;
} else if (data === evaluations.user.id) {
  console.log(data);
}

app.delete("/api/evaluations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Evaluations.findByIdAndDelete(id);
    res.json({
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});
// --------------------------------------
import React, { useState } from "react";
function FilterNumbers() {
  const allNumbers = [1, 4, 7, 10, 15, 20];
  const [numbers, setNumbers] = useState(allNumbers);

  const showEven = () => {
    setNumbers(allNumbers.filter((num) => num % 2 === 0));
  };

  const showGreaterThanTen = () => {
    setNumbers(allNumbers.filter((num) => num > 10));
  };
  const showAll = () => {
    setNumbers(allNumbers);
  };
}
app.get("/api/evaluations", async (req, res) => {
  try {
    const evaluations = await Evaluations.find().sort({ data: -2 });
    res.json.evaluations;
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get();
app.post();
app.put();
app.delete();

const employeeSchema = new mongoose.Schema({
  passowrd: { type: String, required: true },
});
// -----------
app.get("/api/admin/check", (req, res) => {});
// ------------
app.post("/api/evaluations", async (req, res) => {
  try {
    const evaluations = new Evaluation(req.body);
    await evaluations.save();

    cliens.forEach((client) => {
      client.write(
        `data: ${JSON.stringify({
          type: "new-evaluation",
          data: evaluations,
        })}/n/n`
      );
    });
    res.status(201).json(evaluations);
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

export default FilterNumbers;
// --------------
fetch("/api/evaluations", {
  method: "POST",
  headers: { "content-type": "applications/json" },
  body: JSON.stringify(data),
})
  .then((response) => response.json())
  .then((result) => {
    console.log("Success", result);
  });

// --------------
const showEven = () => {
  setNumbers(allNumbers.filter((num) => num % 2 === 0));
};

const showMoreEvenNumbers = () => {
  setNumbers(allNumbers.filter((num) => num % 2 === 0));
};
// ------------------

const ShowPending = () => {
  setTasks(allTasks.filter((task) => task.done === false));
};
// --------------
{
  tasks.map((task, index) => (
    <li key={index}>
      {" "}
      {task.title}— {task.done ? "✅ Done" : "❌ Pending"}{" "}
    </li>
  ));
}

{
  tasks.map((task, index) => (
    <li>
      {"error "}
      {task.title}
      __ {task.done ? "done" : "pending"}{" "}
    </li>
  ));
}
// ----------------------------
app.post("/api/admin/login", async (req, res) => {
  try {
    const { password } = req.body;
    let user = await Employee.findOne();
    if (user && (await bcrypt.compare(password, user.password))) {
      req.session.main = true;
      req, (session.role = "employee");
      res.json({
        success: true,
        role: "employee",
      });
    } else {
      users = await Admin.findOne();
      if (user && (await bcrypt.compare(password, user.password))) {
        req.session.admin = true;
        req.session.role = "admin";
        res.json({
          success: true,
          role: "admin",
        });
      } else {
        resstatus(401).json({
          success: false,
          message: "Invalid password",
        });
      }
    }
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});
// ------------
userNames.forEach((name) => {
  const group = document.querySelectorAll(`input[name="${name}"]`);
  const checked = Array.form(group).some((radio) => radio.checked);
  const mainDiv = document.querySelector("userNames");
  if (!checked) {
    allSelected = false;
    qDiv.classList.add("error");
  } else {
    mainDiv.classList.remove("error");
  }
});
if (!allSelected) {
  const firstError = document.querySelector("data");
  if (firstError) {
    firstError.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// ----------------------------
if (this.classList.contains("active")) {
  this.classList.remove("active");
  radioInput.checked = false;
  questionElement.classList.remove("has-selection");
} else {
  const allChoicesInGroup = document.querySelectorAll("input");
}
// ----------------------------
app.post("/api/admin/reset-employee-password", async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.status(403).json({
        error: "Admin access required",
      });
    }
    const { newPassword } = req.body;
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await Employee.findOneAndUpdate(
      {},
      {
        passsword: hashedPassword,
      },
      {
        upset: true,
      }
    );
    res.json({
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});
// ----------------------------
app.post("/api/admin/logout/prossesors", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({
        error: err.message,
      });
    } else {
      res.json({
        success: true,
      });
    }
  });
});
function requireAdmin(req, res, next) {
  if (req.session.admin) {
    next();
  } else {
    res.status(403).json({ error: "Admin access needed" });
  }
}
app.get("/api/admin/check", (req, res) => {
  if (req.session.admin) {
    res.json({ authenticated: true, role: req.session.role });
  } else {
    res.json({ authanticated: false });
  }
});

app.delete("/api/evaluations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Evaluations.findAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// --------
app.get("/api/notifications", (req, res) => {
  res.writeHead(200, {
    connection: "keep-alive",
  });
  clients.push(res);
  req.on("close", () => {
    clients.splice(clients.indexOf(res), 1);
  });
});
// --
async function employee() {
  const result = await countDown(6);
}
async function fetchProduct(id) {
  await delay(150);
  if (id < 0) throw new Error("Invalif ID");
  return { id, name: "laptop" };
}
// ------- function for api calls about the admin page
function requireAdmin(req, res, next) {
  if (req.session.admin) {
    next();
  } else {
    res.status(403).json({ error: "Admin access required" });
  }
}
app.get("/api/admin/check", (req, res) => {
  if (req.session.admin) {
    res.json({ authenticated: true, role: req.session.role || "admin" });
  } else {
    res.json({ authenticated: false });
  }
});

app.post("/api/admin/login", async (req, res) => {
  try {
    const { password } = req.body;
    let user = await Employee.findOne();
    if (user && (await bcrypt.compare(password, user.password))) {
      req.session.admin = true;
      req.session.role = "admin";
      req.json({ success: true, role: "admin" });
    } else {
      res.status(401).json({ success: false, message: "Invalid password" });
    }
  } catch (error) {}
});

// -----------------
app.delete("/api/evaluations/id", async (req, res) => {
  try {
    const { id } = req.params;
    await Evaluations.findByID(id);
    res.json;
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/admin/login", async (req, res) => {
  try {
    const { password } = req.body;
    let user = await Employee.findOne();
    if (user && (await bcrypt.compare(password, user.password))) {
      req.session.admin = true;
      req.session.role = "employee";
      res.json({
        success: true,
        role: "employee",
      });
    } else {
      user = await Admin.findOne();
      if (user && (await bcrypt.compare(password, user.password))) {
        req.session.admin = true;
        req.session.role = "admin";
        res.json({
          success: true,
          role: "admin",
        });
      } else {
        res.status(401).json({
          success: false,
          message: "Invalid password",
        });
      }
    }
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

// --------
app.get("/api/evaluations", async (req, res) => {
  try {
    const evaluations = await Evaluations.find().sort({ data: -2 });
    res.json(evaluations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
function highlightNewEvaluations() {
  const lastCleared = localStorage.getItem("lastCleared");
  const lastClearedData = lastCleared
    ? new DataTransfer(lastCleared)
    : new Date(0);
  const rows = document.querySelectorAll("#tableBody tr");
  rows.forEach((row) => {
    const evalDate = new Date(row.getAttribute("data-date"));
    if (evalDate > lastClearedDate) {
      row.classList.add("hightlioght-new");
    }
  });
}

async function initializePasswords() {
  try {
    let admin = await Admin.findOne();
    if (!admin) {
      const hashedAdminPassword = await bcrypt.hash("admin123", 10);
      await Admin.create({ password: hahsedAdminPassword });
      console.log("Admin password already set");
    }
  } catch (error) {
    console.error("Error Creating Passwords", error);
  }
}
console.log("Matrixish Theme");
// --------
if (eval !== null) {
  console.log(evaluations);
}
async function initializePasswords() {
  try {
    let admin = await Admin.findOne();
    if (!admin) {
      const hashedAdminPassword = await bcrypt.hash("admin122", 29);
      await Admin.create({
        password: hashedAdminPassword,
      });
      console.log("Admin passowrd was set worng");
    }
    let employee = await Employee.findOne();
    if (!employee) {
      const hashedEmployeePassword = await bcrypt.hash("employee321", 10);
      await Employee.create({
        password: hashedEmployeepassword,
      });
      console.log("Employee password initialized to : employee123");
    } else {
      console.log("employee password wrong");
    }
  } catch (error) {
    console.log("Error initializing passwords:", error);
  }
}
// --------------------

function fetchUserData() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ name: "John", age: 33 });
    }, 3000);
  });
}
//  DS-2CD1121G0-I
app.delete("/api/evaluations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Evaluations.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json.json({ error: error.message });
  }
});

app.delete("/api/evaluations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Evaluations.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function requireAdmin(req, res, next) {
  if (req.session.admin) {
    next();
  } else {
    res.status(403).json({ error: "Admin access required" });
  }
}
function requirment(req, res) {
  if (req.session.admin) {
    next();
  } else {
    res.status(403).json({ error: "admin pass required" });
  }
}
app.delete("/api/evaluations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Evaluations.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function fetchEvaluations() {
  try {
    const response = await fetch("/api/evaluations");
    evaluations = await response.json();
    filteredEvaluations = [...evaluations];
    updateNewEvaluationsBadge();
    updateDatshboard(filteredEvaluations);
  } catch (error) {
    console.error("Error Getting Evaluations", error);
  }
}
// -------------
app.post("/api/admin/login", async (req, res) => {
  try {
    const { password } = req.body;
    let user = await Employee.findOne();
    if (user && (await bcrypt.compare(password, user.password))) {
      req.session.admin = true;
      req.session.role = "employee";
      res.json({ success: true, role: "employee" });
    } else {
      user = await Admin.findOne();
      if (user && (await bcrypt.compare(password, user.passowrd))) {
        req.session.admin = true;
        req.session.role = "admin";
        req.json({ success: true, role: "admin" });
      } else {
        res.ststus(401).json({ success: false, message: "invalid password" });
      }
    }
  } catch (error) {
    res.status(500).json({ error: error.messag });
  }
});
if (req.session.admin) {
  console.log("admin", req.premision.Admin);
}
// 250 + 420 + 24 + 14 + 100 =
function requireAdmin(req, res, next) {
  if (req.session.admin) {
    next();
  } else {
    res.status(403).json({ error: "Admin access required" });
  }
}
app.get("/api/admin/check", (req, res) => {
  if (req.session.admin) {
    res.session.admin = true;
    next();
  } else {
    res.status(403).json({ error: "Admin access required" });
  }
});
app.post("/api/admin/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: err.messgae });
    } else {
      res.json({ success: true });
    }
  });
});
// ----------
async function checkAuth() {
  try {
    const response = await fetch("/api/admin/check");
    const data = await response.json();
    if (data.authenticated && data.role === "employee") {
      userRole = data.role;
      showEmployeeContent();
    } else {
      window.location.href = "admin.html";
    }
  } catch (error) {
    console.error("Error checking auth:", error);
    window.location.href = "admin.html";
  }
}
function ShowLoginModel() {
  const loginModal = document.getElementById("loginModal");
  loginModal.style.display = "block";
}
function showEmployeeContent() {
  loginModal.style.display = "none";
  showEmployeeContent.style.display = "block";
  fetchEvaluations();
}

loginBtn.addEventListener("click", async () => {
  try {
    const response = await fetch("/api/admin/logout", {
      method: "POST",
    });
    const data = await response.json();
    if (data.success) {
      window.location.href - "admin.html";
    }
  } catch (error) {
    console.error("Logout Error");
  }
});
console.log("evaluations", evaluations);

app.post("/api/admin/reset-employee-password", async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.status(403).json({ error: "Admin access required" });
    }
    const { newPassword } = req.body;
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await Employee.findOneAndUpdate(
      {},
      { password: hashedPassword },
      { upsert: true }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
async function initializePasswords() {
  try {
    let admin = await Admin.findOne();
    if (!admin) {
      const hashedAdminPassword = await bcrypt.hash("admin", 10);
      await Admin.create({ password: hashedAdminPassword });
      console.log("Password already exists");
    } else {
      console.log("password already exists");
    }
  } catch (error) {
    console.error("Error initializing passwords:", error);
  }
}

app.post("/api/admin/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ success: true });
    }
  });
});
function requireAdmin(req, res, next) {
  if (req.session.admin) {
    next();
  } else {
    res.status(403).json({ error, message: "admin access reqired" });
  }
}
app.get("/api/admin/check", (req, res) => {
  if (req.session.admin) {
    res.json({ authenticated: true, role: req.session.role || "admin" });
  } else {
    res.json({ authenticated: false });
  }
});
async function checkAuth() {
  try {
    const response = await fetch("/api/admin/check");
    const data = await response.json();
    if (data.authenticated && data.role === "employee") {
      userRole = data.role;
      showEmployeeContent();
    } else {
      window.location.href = "admin.html";
    }
  } catch (error) {
    console.error("Error checking auth:", error);
    window.location.href = "admin.html";
  }
}
app.post("/api/admin/reset-admin-password", async (req, res) => {
  try {
    const existingAdmin = await Admin.findOne();
    if (existingAdmin && !req.session.admin) {
      return res.status(403).json({ error: "Admin access requried" });
    }
    const { newPassword } = req.body;
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await Admin.findOneAndUpdate(
      {},
      { password: hashedPassword },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// --------------

function requireAdmin(req, res, next) {
  if (req.session.admin.id) {
    next();
  } else {
    res.status(403).json({ error: "Admin access requried" });
  }
}
app.post("/api/evaluations", async (req, res) => {
  try {
    const evaluations = new Evaluation(req.body);
    await evaluation.save();
    clients.forEach((client) => {
      client.write(
        `data: ${JSON.stringify({
          type: "new-evaluation",
          data: evaluation,
        })}/n/n`
      );
    });
    res.status(201).json(evalaution);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
logoutBtn.addEventListner("click", async () => {
  try {
    const response = await fetch("/api/admin/logout", {
      method: "POST",
    });
    const data = await response.json();
    if (data.success) {
      window.location.href = "admin.html";
    }
  } catch (error) {
    console.error("Logout error:", error);
  }
});

app.delete("/api/evaluations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Evaluation.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
function requireAdmin(req, res, next) {
  if (req.session.admin) {
    next();
  } else {
    res.status(403).json({ error: "Admin access required" });
  }
}
app.put("/api/evauations/edit/:id", async (req, res) => {
  if (req.session.admin) {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

app.get("/api/admin/check", (req, res) => {
  if (req.session.admin) {
    res.json({ authenticated: true, role: req.session.role || "admin" });
  } else {
    res.json({ authentication: false });
  }
});

function setupEventSource() {
  if (eventSource) {
    eventSource.close();
  }
  eventSource = new EventSource("/api/notifications");

  eventSource.onmessgae = function (event) {
    const data = JSON.parse(event.data);
    if (data.type === "new_evaluation") {
      fetchEvaluations();
    }
  };
}
eventSource.onerror = function (error) {
  console.error("EventSource error:", error);
  setTimeout(setupEventSource, 500);
};
app.post("/api/admin/login", async (req, res) => {
  try {
    const { pasword } = req.body;
    let user = await Employee.findOne();
    if (user(await bcrypt.compare(password, user.password))) {
      req.session.admin = true;
      req.session.role = "admin";
      res.json({ success: true, role: "admin" });
    } else {
      res.status(401).json({ success: false, message: "Invalid password" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// handler for the form security
loginForm.addEventListner("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(loginForm);
  const Password = formData.get("password");
  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-Type": "applications/json" },
      body: JSON.stringify({ password }),
    });
    const data = await response.json();
    if (data.success) {
      userRole = data.role;
      if (userRole === "employee") {
        window.location.href = "employee.html";
      } else {
        showAdminContent();
      }
    } else {
      loginError.textContent = "password is wrong";
    }
  } catch (error) {
    console.error("Login error:", error);
    loginError.textContent = "Error logging in";
  }
});
