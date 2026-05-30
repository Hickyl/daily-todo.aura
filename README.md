# daily-todo.aura
# 🎮 Daily Quest

A gamified task tracker with offline-first architecture, user authentication, and real-time synchronization.

> Built as a full-stack portfolio project demonstrating modern web development practices.

## ✨ Features

- 🔐 **User Authentication**: Secure registration and login with bcrypt password hashing
- 📱 **Offline-First**: Tasks work without internet and sync automatically when connection is restored
- 🏆 **Gamification**: Earn XP, level up, and unlock achievements
- 🔄 **Real-time Sync**: Changes propagate across devices seamlessly
- 🎨 **Responsive Design**: Works on desktop and mobile devices

## 🛠️ Tech Stack

### Frontend
- Vanilla JavaScript (ES6+)
- HTML5 / CSS3
- localStorage for offline persistence
- Fetch API for async requests

### Backend
- Python 3.10+
- Flask (microframework)
- SQLite (database)
- bcrypt (password hashing)
- Flask-CORS (cross-origin requests)

### DevOps
- GitHub Pages (frontend hosting)
- PythonAnywhere (backend hosting)
- Git for version control

## 🚀 Getting Started

### Prerequisites
- Python 3.10 or higher
- pip (Python package manager)
- Modern web browser

### Installation

1. Clone the repository:
```bash
git clone https://hickyl.github.io/daily-todo.aura/
cd daily-quest

2. Set up the backend:
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
pip install -r requirements.txt
python app.py

3. Open the frontend:
Simply open frontend/index.html in your browser
Or use VS Code Live Server extension for hot reload

🧪 Testing
1. Register a new account via the UI or POST /register
2. Login to receive an authentication token
3. Create, complete, and delete tasks
4. Disable internet connection and verify offline functionality
5. Re-enable connection and verify synchronization
🤝 Contributing
This is a portfolio project, but feedback is welcome! Feel free to:
 Open an issue for bugs or feature requests
 Submit a pull request with improvements
