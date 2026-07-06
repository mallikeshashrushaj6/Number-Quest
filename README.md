# Number Quest

A full-stack number guessing game built with Flask and Pandas, featuring a REST API backend, multiple difficulty levels, real-time feedback, and a persistent leaderboard.

## Overview

Number Quest is a web-based game where players guess a secret integer within a limited number of attempts. The backend is a Flask REST API that manages game state via sessions, stores results in a CSV-based leaderboard using Pandas, and serves proximity hints to guide the player toward the answer.

## Features

- Four difficulty levels: Easy (1–50, 10 tries), Medium (1–100, 7 tries), Hard (1–500, 7 tries), Expert (1–1000, 5 tries)
- Proximity hints — feedback scales from "Way too low" to "Very close" based on how far off the guess is
- Hint system — reveals parity and divisibility clues on demand
- Persistent leaderboard — stores all game results in a CSV file via Pandas; tracks best attempts per player
- Live stats — total games, total wins, win rate, average attempts
- Guess history log — shows every guess with directional indicators during the game
- Clear leaderboard option for resetting all records

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, Flask |
| Data Storage | Pandas, CSV |
| Frontend | HTML, CSS, JavaScript |
| API | REST (JSON) |
| Session Management | Flask sessions |

## Project Structure

```
Number-Quest/
├── app.py                  — Flask app and REST API routes
├── requirements.txt        — Python dependencies
├── templates/
│   └── index.html          — Main game UI
├── static/
│   ├── css/
│   │   └── style.css       — Cyberpunk-themed styling
│   └── js/
│       └── game.js         — Frontend game logic
└── data/
    └── leaderboard.csv     — Auto-generated on first run
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/start` | Start a new game session |
| POST | `/api/guess` | Submit a guess |
| GET | `/api/hint` | Get a hint for the current number |
| GET | `/api/status` | Get current game state |
| GET | `/api/leaderboard` | Fetch leaderboard and stats |
| POST | `/api/clear_leaderboard` | Clear all leaderboard records |

## How to Run

**1. Clone the repository**
```bash
git clone https://github.com/mallikeshashrushaj6/Number-Quest.git
cd Number-Quest
```

**2. Install dependencies**
```bash
pip install -r requirements.txt
```

**3. Run the Flask server**
```bash
python app.py
```

**4. Open in browser**
```
http://localhost:5000
```

The `data/leaderboard.csv` file is created automatically on first run — no setup needed.

## Author

Shashrusha Mallike  
GitHub: [mallikeshashrushaj6](https://github.com/mallikeshashrushaj6)
