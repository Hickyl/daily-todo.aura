from flask import Flask, jsonify, request
from functools import wraps
from flask_cors import CORS
import bcrypt
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "mini-api.db")
conn = sqlite3.connect(DB_PATH)
DEBUG_MODE = os.getenv("DEBUG", "False") == "True"
app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": [
            "https://hickyl.github.io", 
            "http://127.0.0.1:5500",
            "http://127.0.0.1:5000"
        ]
    }
})

def get_db():
    conn = sqlite3.connect("mini-api.db")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
""")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS tasks(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            xp INTEGER NOT NULL,
            completed BOOLEAN DEFAULT 0,
            user_id INTEGER REFERENCES users(id))""")
    conn.commit()
    conn.close()

init_db()

#=============== AUTHORIZATION FUNC ===============
def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = request.headers.get("Authorization")
        username = get_username_from_token(token)
        if username is None:
            return jsonify({"error": "username broken"}),401
        try:
            conn = get_db()
            existing = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
            if existing is None:
                return jsonify({"error": "user not found"}), 403
        finally:
                conn.close()
        return f(*args, **kwargs)
    return wrapper

#=============== CHECK TOKEN ===============
def get_username_from_token(token):
        if not token :
            return None
        if not token.startswith("token_"):
            return None
        if len(token.split("_"))< 2:
            return None
        username = token.split("_")[1]
        if username == "" or not username:
            return None
        return username

#=============== LEVEL COUNT ===============
def calculate_level(total_xp):
    if total_xp == 67: #SIIIXX SEEEVVEEEENNN!!!
        return 67
    elif total_xp < 200 :
        return 1
    elif  total_xp < 350:
        return 2
    elif total_xp < 5000:
        return 3
    else:
        return 4



#=============== REGISTER ===============
@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    raw_password = data.get("password")
    if not username or not raw_password:
        return jsonify({"error": "username and password are necessary"}), 400
    password_bytes = raw_password.encode("utf-8")
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    hashed_str = hashed.decode("utf-8")
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO users (username, password_hash) VALUES (?,?)",
            (username, hashed_str)          
        )
        conn.commit()
        user_id = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()["id"]
    except sqlite3.IntegrityError:
        return jsonify({"error": "this username is already taken"}), 409
    finally :
        conn.close()
    user_token = f"token_{username}" # TODO: replace with proper JWT tokens
    return jsonify({"success": True, "token": user_token, "user_id": user_id}), 201


#=============== LOGIN ===============
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    raw_password = data.get("password") 
    if not username or not raw_password:
        return jsonify({"error": "username and password are necessary"}), 400
    try:
        conn = get_db()
        existing = conn.execute("SELECT password_hash, id FROM users WHERE username = ?", (username,))
        user = existing.fetchone()
        if user is None:
            return jsonify({"error": "user not found"}), 400
        password = user["password_hash"]
        password_bytes = password.encode("utf-8")
        password_check = raw_password.encode("utf-8")
        if bcrypt.checkpw( password_check, password_bytes):    #password saved as text therefore encode it to bytes for checking
            return jsonify({"token": f"token_{username}", "user_id": user["id"]}), 200
        else:
          return jsonify({"error": "Invalid credentials"}), 400  
    finally:
        conn.close()
    
    

#=============== INPUT TASKS ===============
@app.route("/api/tasks", methods=["POST"])
@require_auth
def tasks():
    token = request.headers.get("Authorization")
    username = get_username_from_token(token)
    data = request.get_json()
    name = data.get("name")
    xp = data.get("xp")
    if not name or not xp:
        return jsonify({"error": "name and xp are necessary.."}),401
    if not isinstance(xp, (int, float)) or xp < 0 or xp > 20 :
        return jsonify({"error": "xp must be a number and less than 20"}), 401
    try:
        conn = get_db()
        cursor = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if cursor is None:
            return jsonify({"error": "user not found"}), 403
        user_id = cursor["id"]
        conn.execute("INSERT INTO tasks (name, xp, user_id) VALUES (?,?,?)", (name, xp, user_id) )
        new_task_id = cursor.lastrowid
        conn.commit()
    finally:
        conn.close()
    return jsonify({"success": True, "task": name, "xp": xp, "id": new_task_id}), 201


#=============== CHECK SECURITY ===============
@app.route("/secret", methods=["GET"])
@require_auth
def secret():
   return jsonify({"user": "...", "secret": "🐹"})

#=============== GET TASKS ===============
@app.route("/api/tasks", methods=["GET"])
@require_auth
def get_tasks():
    token = request.headers.get("Authorization")
    username = get_username_from_token(token)
    try: 
        conn = get_db()
        cursor = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if cursor is None:
            return jsonify({"error": "user not found"}), 403
        user_id = cursor["id"]
        rows = conn.execute("SELECT id, name, xp, completed FROM tasks WHERE user_id = ?", (user_id,)).fetchall()
        tasks = [dict(row) for row in rows]
    finally:
        conn.close()
    return jsonify(tasks)



#=============== COMPLETE TASKS ===============
@app.route("/api/tasks/<int:task_id>/complete", methods=["POST"])
@require_auth
def complete_task(task_id):
    token = request.headers.get("Authorization")
    username= get_username_from_token(token)
    try:
        conn = get_db()
        cursor = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if cursor is None:
            return jsonify({"error": "user not found"}), 403
        user_id = cursor["id"]
        conn.execute("UPDATE tasks SET completed = 1 WHERE id = ? AND user_id = ?", (task_id, user_id))
        conn.commit()
    finally:
        conn.close()
    return jsonify({"success": True})

#=============== DELETE TASKS ===============
@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
@require_auth
def delete_task(task_id):
    token = request.headers.get("Authorization")
    username = get_username_from_token(token)
    try:
        conn = get_db()
        cursor = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if cursor is None:
            return jsonify({"error": "user not found"}), 403
        user_id = cursor["id"]
        conn.execute("DELETE FROM tasks WHERE id = ? AND user_id = ?", (task_id, user_id))
        conn.commit()
    finally:
        conn.close()
    return jsonify({"success": True})

#=============== GET STATS ===============
@app.route("/api/stats", methods=["GET"])
@require_auth
def get_stats():
    token = request.headers.get("Authorization")
    username = get_username_from_token(token)
    try:
        conn = get_db()
        user_record = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if user_record is None:
            return jsonify({"error": "user not found"}), 403
        user_id = user_record["id"]
        stats_cursor = conn.execute("SELECT SUM(xp), COUNT(*) FROM tasks WHERE user_id = ? AND completed = 1",(user_id,))
        row = stats_cursor.fetchone()
        totalXp = row[0] or 0
        tasksCompleted = row[1] or 0
        userLevel = calculate_level(totalXp)
    finally:
        conn.close()
    return jsonify({"totalXp": totalXp, "tasksCompleted": tasksCompleted, "level": userLevel})


# ===== ROUTES =====
@app.route("/hello")
def hello():
    return jsonify({"message": "Hello"})

@app.route("/")
def api_works():
    return "Daily Quest API is working! 🎮"

@app.route("/reset-password")
def resPass():
    return jsonify({"error":"Reset password doesnt exist yet("})


@app.route("/api/level/<int:level>")
def level_descr(level):
    return jsonify({"level": level, "title": "student", "nextLevelXp": 200})


# =============== START THE SERVER ===============
if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5000)