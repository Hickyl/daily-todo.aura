'use strict'

const inputTask = document.getElementById("input-task");
const inputXp = document.getElementById("input-xp");
const addTaskXpBtn = document.getElementById("add-task-xp");
const allTasksList = document.getElementById("all-tasks-list");
const showLevel = document.getElementById("show-level");
const showXp = document.getElementById("show-xp");
const resetBtn = document.getElementById("reset-btn");
const authScreen = document.getElementById("auth-screen");
const appScreen = document.getElementById("app-screen");
const regNameInt = document.getElementById("username-regist");
const regPassInt = document.getElementById("password-regist");
const logNameInt = document.getElementById("username-login");
const logPassInt = document.getElementById("password-login");
const loginForm = document.getElementById("login-form");
const regForm = document.getElementById("register-form");
const logBut = document.getElementById("show-login");
const regBut = document.getElementById("show-register");
const logOutBtn = document.getElementById("logout-btn");
const resPass = document.getElementById("reset-password");

//SHOWING TASKS + XP + CREATING BUTTON
function renderTasks() {
    allTasksList.innerHTML = "";
    for (let i = 0; i < userTasks.length; i++) {
        let task = userTasks[i];
        let li = document.createElement("li");
        let taskText = document.createElement("span");
        taskText.className = "task-text";
        taskText.textContent = `${task.name} (${task.xp} XP)`;
        let completeButton = document.createElement("button");
        completeButton.textContent = "done ";
        completeButton.className = "complete-btn";
        completeButton.addEventListener("click", async function () {
            completeButton.disabled = true;
            await completeTask(task.id);
            renderTasks();
            renderXP();
            renderLevel();
        });
        let deleteBtn = document.createElement("button");
        deleteBtn.textContent = "delete";
        deleteBtn.className = "delete-btn";
        deleteBtn.addEventListener("click", async function () {
            await deleteTask(task.id);
            renderTasks();
            renderXP();
            renderLevel();
        })
        if (task.completed) {
            li.appendChild(taskText);
            li.appendChild(deleteBtn);
            li.classList.add("completed")
            allTasksList.appendChild(li);
        } else {
            li.appendChild(taskText);
            li.appendChild(completeButton);
            li.appendChild(deleteBtn);
            allTasksList.appendChild(li);
        };
    };
}

//SHOW XP
function renderXP(xp) {
    let valueToShow = (xp !== undefined) ? xp : getTotalXP();
    showXp.textContent = `XP: ${valueToShow}`;
}

//SHOW LEVEL
function renderLevel(level) {
    let valueToShow = (level !== undefined) ? level : getLevel();
    showLevel.textContent = `level: ${valueToShow}, you are ${getLevelName(valueToShow)}`;
}

//SHOWING ALL STUFF
function renderAll() {
    renderTasks();
    renderXP();
    renderLevel();
}

//ADD TASKS BUTTON
addTaskXpBtn.addEventListener("click", function () {
    let task = inputTask.value;
    let xp = Number(inputXp.value);
    addTask(task, xp);
    inputTask.value = "";
    inputXp.value = "";
    renderAll();
}
)

//RESET BUTTON
resetBtn.addEventListener("click", function () {
    resetData();
})

//LOGOUT BUTTON
logOutBtn.addEventListener("click", logout);


//CONNECTION WITH PYTHON
function saveAuth(token, user_id) {
    localStorage.setItem("authToken", token);
    localStorage.setItem("user_id", user_id);

}

//GET TOKEN
function getAuthHeader() {
    const token = localStorage.getItem("authToken");
    if (!token) {
        return {};
    } else {
        return { "Authorization": token };
    }
}

//GET USER ID
function checkAuth() {
    const token = localStorage.getItem("authToken");
    if (!token) {
        return false;
    } else {
        return true;
    }
}

//SHOW/HIDE AUTHORIZASION
async function initUI() {
    if (checkAuth() === true) {
        authScreen.style.display = "none";
        appScreen.style.display = "block";
        await loadTasksFromAPI();
        await loadStatsFromAPI();
    } else {
        authScreen.style.display = "block";
        appScreen.style.display = "none";
    }
}


//CHECK LOGIN
async function handleLogin(e) {
    e.preventDefault();
    const username = logNameInt.value;
    const password = logPassInt.value;
    const res = await fetch("http://127.0.0.1:5000/login",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
    if (!res.ok) {
        const err = await res.json();
        console.error(res.status, res.statusText);
        alert(err.error);
        return;
    };
    const result = await res.json();
    saveAuth(result.token, result.user_id);
    await initUI();
}

//CHECK REGISTER
async function handleRegister(e) {
    e.preventDefault();
    const username = regNameInt.value;
    const password = regPassInt.value;
    const res = await fetch("http://127.0.0.1:5000/register",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
    if (!res.ok) {
        const err = await res.json();
        console.error(res.status, res.statusText);
        alert(err.error);
        return;
    };
    const result = await res.json();
    saveAuth(result.token, result.user_id);
    await initUI();
}

//LOGIN BUTTON
loginForm.addEventListener("submit", handleLogin);

//REGISTER BUTTON
regForm.addEventListener("submit", handleRegister)


logBut.addEventListener("click", () => {
    loginForm.style.display = "flex";
    regForm.style.display = "none";
    logBut.classList.add("active");
    regBut.classList.remove("active");
});

regBut.addEventListener("click", () => {
    loginForm.style.display = "none";
    regForm.style.display = "flex";
    regBut.classList.add("active");
    logBut.classList.remove("active");
});

resPass.addEventListener("click", () => {
    alert("reset password doesnt exist yet(");
})


//LOAD FROM PYTHON
async function loadTasksFromAPI() {
    try {
        const res = await fetch("http://127.0.0.1:5000/api/tasks", {
            method: "GET",
            headers: { "Content-Type": "application/json", ...getAuthHeader() },
        });
        if (res.status === 401) {
            console.error(res.status, res.statusText);
            let dataErr = await res.json();
            alert(dataErr.error);
            localStorage.removeItem("authToken");
            localStorage.removeItem("user_id");
            allTasksList.innerHTML = "";
            userTasks = [];
            saveData();
            initUI();
            return null;
        };
        if (!res.ok) {
            console.error(res.status, res.statusText);
            let dataErr = await res.json();
            alert(dataErr.error);
            return null;
        };
        let tasks = await res.json();
        userTasks = tasks;
        saveData();
        renderTasks();
    } catch (e) {
        console.error("failed to load tasks", e);
    }
}

//GET FROM PYTHON
async function loadStatsFromAPI() {
    try {
        const res = await fetch("http://127.0.0.1:5000/api/stats", {
            method: "GET",
            headers: { "Content-Type": "application/json", ...getAuthHeader() },
        });
        if (!res.ok) {
            console.error(res.status, res.statusText);
            let dataErr = await res.json();
            alert(dataErr.error);
            return null;
        };
        let stats = await res.json();
        console.log(stats)
        renderXP(stats.totalXp);
        renderLevel(stats.level);
    }
    catch (e) {
        console.error("stats cannot load:", e);
    }
}

initUI();
renderAll();