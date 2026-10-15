const form = document.getElementById("studentForm");
const studentTable = document.getElementById("studentTable");
const message = document.getElementById("message");
const searchInput = document.getElementById("searchInput");
const dobInput = document.getElementById("dob");
const ageInput = document.getElementById("age");


const API_BASE = "http://localhost:8082/api";

let students = [];
let dashboardFilter = "all";
let editingStudentId = null;
let currentRole = null;
let authToken = null;

const loginPanel = document.getElementById("loginPanel");
const appContent = document.getElementById("appContent");
const sessionControls = document.getElementById("sessionControls");
const loggedInLabel = document.getElementById("loggedInLabel");
const exportButton = document.getElementById("exportExcelBtn");

async function apiRequest(path, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(authToken
            ? { Authorization: `Bearer ${authToken}` }
            : {}),
        ...(options.headers || {})
    };

    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers
    });

    if (!response.ok) {
        let detail = `Request failed (${response.status})`;

        try {
            const data = await response.json();
            detail = data.message || data.detail || detail;
        } catch (_) {}

        throw new Error(detail);
    }

    if (response.status === 204) return null;
    return response.json();
}

function mapStudent(student) {
    return {
        ...student,
        id: student.id,
        studentId: student.studentId || "",
        firstName: student.firstName || "",
        lastName: student.lastName || "",
        dob: student.dob || "",
        age: student.age ?? "",
        phone: student.phone || "",
        group: student.group || "",
        department: student.department || "",
        academicYear: student.academicYear || ""
    };
}

async function loadStudentsFromApi() {
    const data = await apiRequest("/students");
    students = data.map(mapStudent);
    renderStudents();
}

document.getElementById("loginForm").addEventListener("submit", async event => {
    event.preventDefault();

    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;
    const loginMessage = document.getElementById("loginMessage");

    loginMessage.textContent = "Logging in...";
    loginMessage.className = "message";

    try {
        const result = await apiRequest("/auth/login", {
            method: "POST",
            body: JSON.stringify({ username, password })
        });

        authToken = result.token;
        currentRole = String(result.role).toLowerCase();

        await loadStudentsFromApi();

        loginPanel.hidden = true;
        appContent.hidden = false;
        sessionControls.hidden = false;
        loggedInLabel.textContent = `Logged in: ${result.username}`;
        exportButton.hidden = currentRole !== "admin";
        document.getElementById("studentId").readOnly = false;

        loginMessage.textContent = "";
        showMessage("Login successful.");
    } catch (error) {
        authToken = null;
        currentRole = null;
        loginMessage.textContent = `Login failed: ${error.message}. Check your credentials and backend.`;
        loginMessage.className = "message error";
    }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
    authToken = null;
    currentRole = null;
    students = [];

    if (editingStudentId !== null) finishEditMode();

    document.getElementById("loginForm").reset();
    document.getElementById("loginMessage").textContent = "";
    appContent.hidden = true;
    loginPanel.hidden = false;
    sessionControls.hidden = true;
    renderStudents();
});

function isAdmin() {
    return currentRole === "admin";
}
 

function showMessage(text, type = "success") {
    message.textContent = text;
    message.className = `message ${type}`;
}

function calculateAge(dobValue) {
    if (!dobValue) return "";

    const dob = new Date(`${dobValue}T00:00:00`);
    const today = new Date();

    if (Number.isNaN(dob.getTime()) || dob > today) return "";

    let age = today.getFullYear() - dob.getFullYear();
    const birthdayNotReached =
        today.getMonth() < dob.getMonth() ||
        (today.getMonth() === dob.getMonth() &&
         today.getDate() < dob.getDate());

    if (birthdayNotReached) age--;
    return age;
}

dobInput.addEventListener("change", () => {
    const age = calculateAge(dobInput.value);
    ageInput.value = age;

    if (dobInput.value && age === "") {
        showMessage("Please choose a valid date of birth.", "error");
    } else {
        showMessage("");
    }
});

// Supports academic years such as 2024-26 and 2024-2026.
function getEndYear(academicYear) {
    const parts = String(academicYear || "").trim().split("-");
    if (parts.length !== 2) return null;

    const startYear = Number(parts[0]);
    let endYear = Number(parts[1]);

    if (!Number.isInteger(startYear) || !Number.isInteger(endYear)) {
        return null;
    }

    if (parts[1].length === 2) {
        endYear = Math.floor(startYear / 100) * 100 + endYear;
        if (endYear < startYear) endYear += 100;
    }

    return endYear >= startYear ? endYear : null;
}

function getStatus(student) {
    const endYear = getEndYear(student.academicYear);
    if (endYear === null) return "Unknown";

    // The course ending in the current calendar year is still current.
    return endYear >= new Date().getFullYear()
        ? "Current"
        : "Passed Out";
}

function isComputerScience(student) {
    const department = String(student.department || "");
    const group = String(student.group || "");
    return /computer\s*science/i.test(`${department} ${group}`);
}

function updateDashboard() {
    const current = students.filter(s => getStatus(s) === "Current");
    const passed = students.filter(s => getStatus(s) === "Passed Out");
    const cs = students.filter(isComputerScience);
    const other = students.filter(s => !isComputerScience(s));

    document.getElementById("totalCount").textContent = students.length;
    document.getElementById("currentCount").textContent = current.length;
    document.getElementById("passedCount").textContent = passed.length;
    document.getElementById("csCount").textContent = cs.length;
    document.getElementById("otherCount").textContent = other.length;

    document.getElementById("recordCount").textContent =
        `${students.length} record${students.length === 1 ? "" : "s"}`;

    renderOtherDepartments(other);
}

function renderOtherDepartments(otherStudents) {
    const tbody = document.getElementById("otherDepartmentTable");
    tbody.replaceChildren();

    const departments = {};

    otherStudents.forEach(student => {
        const name = String(student.department || "").trim() || "Not specified";

        if (!departments[name]) {
            departments[name] = { total: 0, current: 0, passed: 0 };
        }

        departments[name].total++;

        if (getStatus(student) === "Current") {
            departments[name].current++;
        } else if (getStatus(student) === "Passed Out") {
            departments[name].passed++;
        }
    });

    const names = Object.keys(departments).sort();

    if (names.length === 0) {
        const row = tbody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 4;
        cell.className = "empty-state";
        cell.textContent = "No other department records found.";
        return;
    }

    names.forEach(name => {
        const data = departments[name];
        const row = tbody.insertRow();

        [name, data.total, data.current, data.passed].forEach(value => {
            const cell = row.insertCell();
            cell.textContent = value;
        });
    });
}

function addCell(row, value) {
    const cell = row.insertCell();
    cell.textContent = value ?? "";
}


function getVisibleStudents() {
    const search = searchInput.value.trim().toLowerCase();

    return students.filter(student => {
        let matchesDashboard = true;
        if (dashboardFilter === "current") matchesDashboard = getStatus(student) === "Current";
        if (dashboardFilter === "passed") matchesDashboard = getStatus(student) === "Passed Out";
        if (dashboardFilter === "cs") matchesDashboard = isComputerScience(student);

        const values = [
            student.studentId, student.firstName, student.lastName,
            student.phone, student.group, student.department,
            student.academicYear, student.dob, student.age, getStatus(student)
        ];
        return matchesDashboard && values.join(" ").toLowerCase().includes(search);
    });
}

function exportToExcel() {
    if (!isAdmin()) {
        showMessage("Only Admin can export student records.", "error");
        return;
    }
    const visibleStudents = getVisibleStudents();
    if (visibleStudents.length === 0) {
        showMessage("No student records to export.", "error");
        return;
    }

    const headings = [
        "Student ID", "First Name", "Last Name", "Date of Birth", "Age",
        "Phone Number", "Group", "Department", "Academic Year", "Status"
    ];
    const rows = visibleStudents.map(student => [
        student.studentId, student.firstName, student.lastName, student.dob,
        calculateAge(student.dob), student.phone, student.group,
        student.department, student.academicYear, getStatus(student)
    ]);
    const csvCell = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = "\uFEFF" + [headings, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `student_records_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showMessage(`Exported ${visibleStudents.length} student record${visibleStudents.length === 1 ? "" : "s"}. Open the CSV file in Excel.`);
}

function renderStudents() {
    const filtered = getVisibleStudents();

    const titles = {
        all: "Student Details",
        current: "Current Students",
        passed: "Passed Out Students",
        cs: "Computer Science Students"
    };
    document.getElementById("studentDetailsTitle").textContent = titles[dashboardFilter];
    document.getElementById("clearFilterBtn").hidden = dashboardFilter === "all";

    studentTable.replaceChildren();

    if (filtered.length === 0) {
        const row = studentTable.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 11;
        cell.className = "empty-state";
        cell.textContent = students.length === 0
            ? "No students added yet."
            : "No matching students found for this selection.";
    } else {
        filtered.forEach(student => {
            const row = studentTable.insertRow();

            [
                student.studentId, student.firstName, student.lastName,
                student.dob, student.age, student.phone, student.group,
                student.department, student.academicYear
            ].forEach(value => addCell(row, value));

            const statusCell = row.insertCell();
            const status = getStatus(student);
            const badge = document.createElement("span");
            badge.className = `status ${
                status === "Current" ? "current" :
                status === "Passed Out" ? "passed" : ""
            }`;
            badge.textContent = status;
            statusCell.appendChild(badge);

            const actionCell = row.insertCell();
            if (isAdmin()) {
                const editButton = document.createElement("button");
                editButton.type = "button";
                editButton.className = "secondary-button table-action-button";
                editButton.textContent = "Edit";
                editButton.addEventListener("click", () => startEditStudent(student));
                actionCell.appendChild(editButton);

                const deleteButton = document.createElement("button");
                deleteButton.type = "button";
                deleteButton.className = "delete-button table-action-button";
                deleteButton.textContent = "Delete";
                
deleteButton.addEventListener("click", async () => {
    if (!isAdmin()) {
        showMessage("Only Admin can delete students.", "error");
        return;
    }

    if (!confirm(`Delete student ${student.studentId}?`)) return;

    try {
        await apiRequest(`/students/${student.id}`, {
            method: "DELETE"
        });

        await loadStudentsFromApi();
        showMessage("Student deleted successfully.");
    } catch (error) {
        showMessage(`Delete failed: ${error.message}`, "error");
    }
});

                actionCell.appendChild(deleteButton);
            } else {
                actionCell.textContent = "View only";
            }
        });
    }

    updateDashboard();
}


form.addEventListener("submit", async event => {
    event.preventDefault();

    if (!currentRole) {
        showMessage("Please log in first.", "error");
        return;
    }

    if (editingStudentId !== null && !isAdmin()) {
        showMessage("Only Admin can edit student details.", "error");
        return;
    }

    const student = {
        studentId: document.getElementById("studentId").value.trim(),
        firstName: document.getElementById("firstName").value.trim(),
        lastName: document.getElementById("lastName").value.trim(),
        dob: dobInput.value,
        age: calculateAge(dobInput.value),
        phone: document.getElementById("phone").value.trim(),
        group: document.getElementById("group").value.trim(),
        department: document.getElementById("department").value.trim(),
        academicYear: document.getElementById("academicYear").value.trim()
    };

    if (student.age === "" || student.age < 0) {
        showMessage("Please enter a valid date of birth.", "error");
        return;
    }

    if (!/^[0-9]{10}$/.test(student.phone)) {
        showMessage("Phone number must contain exactly 10 digits.", "error");
        return;
    }

    if (getEndYear(student.academicYear) === null) {
        showMessage("Enter academic year like 2024-26 or 2024-2026.", "error");
        return;
    }

    const duplicate = students.some(item =>
        String(item.studentId).toLowerCase() ===
            student.studentId.toLowerCase() &&
        item.studentId !== editingStudentId
    );

    if (duplicate) {
        showMessage("Student ID already exists. Please use a unique ID.", "error");
        return;
    }

    try {
        if (editingStudentId !== null) {
            const existing = students.find(
                item => item.studentId === editingStudentId
            );

            if (!existing || existing.id == null) {
                throw new Error("Could not find the database record to update.");
            }

            await apiRequest(`/students/${existing.id}`, {
                method: "PUT",
                body: JSON.stringify(student)
            });

            finishEditMode();
            showMessage("Student details updated successfully.");
        } else {
            await apiRequest("/students", {
                method: "POST",
                body: JSON.stringify(student)
            });

            showMessage("Student added successfully.");
        }

        form.reset();
        ageInput.value = "";
        await loadStudentsFromApi();
    } catch (error) {
        showMessage(`Save failed: ${error.message}`, "error");
    }
});

function startEditStudent(student) {
    if (!isAdmin()) {
        showMessage("Only Admin can edit student details.", "error");
        return;
    }
    editingStudentId = student.studentId;
    document.getElementById("studentId").value = student.studentId;
    document.getElementById("studentId").readOnly = true;
    document.getElementById("firstName").value = student.firstName || "";
    document.getElementById("lastName").value = student.lastName || "";
    dobInput.value = student.dob || "";
    ageInput.value = calculateAge(student.dob || "");
    document.getElementById("phone").value = student.phone || "";
    document.getElementById("group").value = student.group || "";
    document.getElementById("department").value = student.department || "";
    document.getElementById("academicYear").value = student.academicYear || "";
    document.getElementById("formTitle").textContent = "Edit Student Details";
    document.getElementById("submitStudentBtn").textContent = "Update Student";
    document.getElementById("cancelEditBtn").hidden = false;
    document.getElementById("clearFormBtn").hidden = true;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    showMessage(`Editing student ${student.studentId}. Update the details and click Update Student.`);
}

function finishEditMode() {
    editingStudentId = null;
    document.getElementById("studentId").readOnly = false;
    document.getElementById("formTitle").textContent = "Add Student";
    document.getElementById("submitStudentBtn").textContent = "Add Student";
    document.getElementById("cancelEditBtn").hidden = true;
    document.getElementById("clearFormBtn").hidden = false;
}

document.getElementById("cancelEditBtn").addEventListener("click", () => {
    finishEditMode();
    form.reset();
    ageInput.value = "";
    showMessage("Edit cancelled.");
});

form.addEventListener("reset", () => {
    ageInput.value = "";
    if (editingStudentId !== null) finishEditMode();
});

searchInput.addEventListener("input", renderStudents);
document.getElementById("exportExcelBtn").addEventListener("click", exportToExcel);

function applyDashboardFilter(filter) {
    dashboardFilter = filter;
    renderStudents();
    document.getElementById("studentDetailsTitle").scrollIntoView({ behavior: "smooth", block: "center" });
}

document.querySelectorAll(".clickable-card").forEach(card => {
    card.addEventListener("click", () => applyDashboardFilter(card.dataset.filter));
    card.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            applyDashboardFilter(card.dataset.filter);
        }
    });
});

document.getElementById("clearFilterBtn").addEventListener("click", () => {
    dashboardFilter = "all";
    searchInput.value = "";
    renderStudents();
});

document.getElementById("otherDashboardBtn").addEventListener("click", function () {
    const panel = document.getElementById("otherDepartmentPanel");
    const shouldOpen = panel.hidden;

    panel.hidden = !shouldOpen;
    this.setAttribute("aria-expanded", String(shouldOpen));

    if (shouldOpen) {
        renderOtherDepartments(students.filter(s => !isComputerScience(s)));
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
});

// Initial page load; records are shown after login.
renderStudents();
