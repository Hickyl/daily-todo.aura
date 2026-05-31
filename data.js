'use strict'

let userTasks = [];
let totalXp = 0;
let userLevel = "";
let pendingSync = [];



//CHECKING FOR INTERNET
function isOnline() {
    return navigator.onLine;
}

//ADD TASK
function addTask(task, xp) {
    let newTask = {};
    if (task && xp > 0 && xp <= 20) {
        newTask = {
            id: Date.now(),
            name: task,
            xp: xp,
            completed: false,
            synced: false
        }
        userTasks.push(newTask);
    } else {
        alert("please, write the task and xp must be under 20");
        return false;
    }
    if (isOnline()) {
        sendToServer(newTask)
            .then(() => {
                const found = userTasks.find(t => t.id === newTask.id);
                if (found) {
                    found.synced = true;
                    saveData();
                }
            })
            .catch((error) => {
                pendingSync.push({ action: "add", data: newTask });
                console.log("waiting for sending...");
                saveData();
            });
    } else {
        pendingSync.push({ action: "add", data: newTask });
        console.log("offline mode");
        saveData();
    }
}

//SEND TO API
async function sendToServer(task) {
    if (!isOnline()) {
        throw new Error("No network");
    }
    let token = localStorage.getItem("authToken");
    if (!token) {
        throw new Error("Not authenticated");
    }
    let res = await fetch("https://siyahil.pythonanywhere.com/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": token },
        body: JSON.stringify({
            name: task.name,
            xp: task.xp
        })
    });
    if (!res.ok) {
        let err = await res.json();
        throw new Error(err.error || "server error");
    }
}

//DELETE FROM API
async function deleteFromServer(task) {
    if (!isOnline()) {
        throw new Error("No network");
    }
    let token = localStorage.getItem("authToken");
    if (!token) {
        throw new Error("Not authenticated");
    }
    let res = await fetch(`https://siyahil.pythonanywhere.com/api/tasks/${task.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "Authorization": token }
    });
    if (!res.ok) {
        let err = await res.json();
        throw new Error(err.error || "server error");
    }
}

//COMPLETE TASK SERVER
async function completeFromServer(task) {
    if (!isOnline()) {
        throw new Error("No network");
    }
    let token = localStorage.getItem("authToken");
    if (!token) {
        throw new Error("Not authenticated");
    }
    let res = await fetch(`https://siyahil.pythonanywhere.com/api/tasks/${task.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": token }
    });
    if (!res.ok) {
        let err = await res.json();
        throw new Error(err.error || "server error");
    }
}

//CHECKING LOGIN
async function checkLogin(username, password) {
    if (!isOnline()) {
        throw new Error("No network");
    }
    let res = await fetch("https://siyahil.pythonanywhere.com/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: username,
            password: password
        })
    });
    if (!res.ok) {
        let err = await res.json();
        throw new Error(err.error || "server error");
    }
    const result = await res.json();
    return {token :result.token, user_id : result.user_id};
}

//CHECKING REGISTOR
async function checkRegister(username, password) {
    if (!isOnline()) {
        throw new Error("No network");
    }
    let res = await fetch("https://siyahil.pythonanywhere.com/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: username,
            password: password
        })
    });
    if (!res.ok) {
        let err = await res.json();
        throw new Error(err.error || "server error");
    }
    const result = await res.json();
    return jsonfy({"token":result.token, "user_id": result.user_id});
}

//SYNC
function syncLoad() {
    if (pendingSync.length === 0) {
        return;
    }
    const task = pendingSync[0];
    const found = userTasks.find(t => t.id === task.data.id);
    if (!found) {
        pendingSync.shift();
        return;
    }
    if (task.action === "add") {
        sendToServer(task.data)
            .then(() => {
                pendingSync.shift();
                found.synced = true;
                saveData();
                setTimeout(syncLoad, 500);
            })
            .catch(() => {
                console.log("something's wrong, waiting...");
            });
    } else if (task.action === "complete") {
        completeFromServer(task.data)
            .then(() => {
                pendingSync.shift();
                found.synced = true;
                found.completed = true;
                totalXp = totalXp + found.xp;
                saveData();
                setTimeout(syncLoad, 500);
            })
            .catch(() => {
                console.log("something's wrong, waiting...");
            });
    } else if (task.action === "delete") {
        deleteFromServer(task.data)
            .then(() => {
                pendingSync.shift();
                found.synced = true;
                userTasks.splice(userTasks.indexOf(found), 1);
                saveData();
                setTimeout(syncLoad, 500);
            })
            .catch(() => {
                console.log("something's wrong, waiting...");
            });
    }
}

//CHECKING NETWORK
window.addEventListener("online", () => {
    console.log("Internet appeared");
    syncLoad();
})


//COMPLETE TASK
async function completeTask(id) {
    const task = userTasks.find(t => t.id === id);
    if (!task) {
        console.log("something went wrong...");
        return "the task wasnt found";
    }
    if (task) {
        if (isOnline()) {
            try {
                let token = localStorage.getItem("authToken");
                let res = await fetch(`https://siyahil.pythonanywhere.com/api/tasks/${task.id}/complete`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": token },
                })
                if (!res.ok) {
                    let err = await res.json();
                    throw new Error(err.error || "server error");
                }
            }
            catch (e) {
                pendingSync.push({ action: "complete", data: task });
                console.log("waiting for sending...");
            }
        }
        task.completed = true;
        totalXp = totalXp + task.xp;
    }
    saveData();
    return totalXp;
}

//DELETE TASK
async function deleteTask(id) {
    const task = userTasks.find(t => t.id === id);
    if (!task) {
        console.log("something went wrong...");
        return "the task wasnt found";
    }
    if (task) {
        if (isOnline()) {
            try {
                let token = localStorage.getItem("authToken")
                let res = await fetch(`https://siyahil.pythonanywhere.com/api/tasks/${task.id}`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json", "Authorization": token },
                })
            }
            catch (e) {
                pendingSync.push({ action: "delete", data: task });
                console.log("waiting for sending...");
            }
        }
         userTasks.splice(userTasks.indexOf(task), 1);
    }
    saveData();
    return true;
}

//GET LEVEL
function getLevel() {
    if (totalXp === 67) {
        return 67;
    } else if (totalXp < 200) {
        return 1;
    } else if (totalXp < 350) {
        return 2;
    } else if (totalXp < 5000) {
        return 3;
    } else {
        return 4;
    }
}

//GET MESSAGE LEVEL
function getLevelName(level) {
    if (level === 67) {
        return "SIIIX SEEEEVVVENNN!!!!";
    } else if (level === 1) {
        return "beginner. Keep going!";
    } else if (level === 2) {
        return "pre-focusing master. Your on the track!";
    } else if (level === 3) {
        return "focus pro!!. Well done, however u can better, move forward";
    } else {
        return "you are the focus master. But it's still not the end...";
    }
}

//RETURN TOTAL XP
function getTotalXP() {
    return totalXp;
}

//SAVING
function saveData() {
    localStorage.setItem("totalXp", totalXp);
    localStorage.setItem("userLevel", userLevel);
    localStorage.setItem("userTasks", JSON.stringify(userTasks));
    localStorage.setItem("pendingSync", JSON.stringify(pendingSync));
}

//LOADING
function loadData() {
    let savedXp = localStorage.getItem("totalXp");
    let savedLevel = localStorage.getItem("userLevel");
    let savedUserTasks = localStorage.getItem("userTasks");
    let savedSync = localStorage.getItem("pendingSync");
    try {
        if (savedSync === null) {
            pendingSync = [];
        } else {
            pendingSync = JSON.parse(savedSync);
        }
        if (savedUserTasks !== null) {
            savedUserTasks = JSON.parse(savedUserTasks)
        } else {
            savedUserTasks = [];
        }
    }
    catch (e) {
        console.error("failed to parse:", e);
        pendingSync = [];
        savedUserTasks = [];
    }

    if (savedXp === null) {
        savedXp = 0;
    } else {
        savedXp = Number(savedXp);
    }
    totalXp = savedXp;
    if (savedLevel === null) {
        savedLevel = 0;
    } else {
        savedLevel = Number(savedLevel);
    }
    userLevel = getLevel();
    userTasks = savedUserTasks;
    if (isOnline()) {
        setTimeout(syncLoad, 500);
    }
}

function resetData() {
    let allow = confirm("are you sure to delete everything?");
    if (allow) {
        pendingSync = [];
        localStorage.removeItem("authToken");
        userTasks = [];
        totalXp = 0;
        userLevel = "";
        saveData();
        renderAll();
    }
}

function logout() {
    let allow = confirm("are you sure to log out?")
    if (allow) {
        pendingSync = [];
        userTasks = [];
        totalXp = 0;
        userLevel = "";
        localStorage.removeItem("authToken");
        localStorage.removeItem("user_id");
        initUI();
        saveData();
        window.location.reload();
    }

}

loadData();
