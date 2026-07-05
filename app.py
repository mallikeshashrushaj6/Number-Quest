from flask import Flask, request, jsonify, render_template, session
import random
import pandas as pd
import os
import json
from datetime import datetime

app = Flask(__name__)
app.secret_key = "number_game_secret_2024"

LEADERBOARD_FILE = "data/leaderboard.csv"

def ensure_csv():
    if not os.path.exists(LEADERBOARD_FILE):
        os.makedirs("data", exist_ok=True)
        df = pd.DataFrame(columns=["player", "attempts", "number", "difficulty", "timestamp", "won"])
        df.to_csv(LEADERBOARD_FILE, index=False)

def load_leaderboard():
    ensure_csv()
    try:
        df = pd.read_csv(LEADERBOARD_FILE)
        return df
    except Exception:
        return pd.DataFrame(columns=["player", "attempts", "number", "difficulty", "timestamp", "won"])

def save_result(player, attempts, number, difficulty, won):
    ensure_csv()
    df = load_leaderboard()
    new_row = pd.DataFrame([{
        "player": player,
        "attempts": attempts,
        "number": number,
        "difficulty": difficulty,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "won": won
    }])
    df = pd.concat([df, new_row], ignore_index=True)
    df.to_csv(LEADERBOARD_FILE, index=False)

DIFFICULTY_CONFIG = {
    "easy":   {"min": 1,  "max": 50,   "max_attempts": 10},
    "medium": {"min": 1,  "max": 100,  "max_attempts": 7},
    "hard":   {"min": 1,  "max": 500,  "max_attempts": 7},
    "expert": {"min": 1,  "max": 1000, "max_attempts": 5},
}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/start", methods=["POST"])
def start_game():
    data = request.get_json()
    difficulty = data.get("difficulty", "medium")
    player = data.get("player", "Player").strip() or "Player"

    config = DIFFICULTY_CONFIG.get(difficulty, DIFFICULTY_CONFIG["medium"])
    secret = random.randint(config["min"], config["max"])

    session["secret"] = secret
    session["attempts"] = 0
    session["max_attempts"] = config["max_attempts"]
    session["difficulty"] = difficulty
    session["player"] = player
    session["min"] = config["min"]
    session["max"] = config["max"]
    session["history"] = []
    session["game_over"] = False

    return jsonify({
        "status": "started",
        "player": player,
        "difficulty": difficulty,
        "min": config["min"],
        "max": config["max"],
        "max_attempts": config["max_attempts"],
        "message": f"Game started! Guess a number between {config['min']} and {config['max']}."
    })

@app.route("/api/guess", methods=["POST"])
def make_guess():
    if "secret" not in session:
        return jsonify({"status": "error", "message": "No active game. Start a new game first."}), 400

    if session.get("game_over"):
        return jsonify({"status": "error", "message": "Game is over. Start a new game."}), 400

    data = request.get_json()
    try:
        guess = int(data.get("guess"))
    except (TypeError, ValueError):
        return jsonify({"status": "error", "message": "Please enter a valid integer."}), 400

    secret = session["secret"]
    session["attempts"] += 1
    attempts = session["attempts"]
    max_attempts = session["max_attempts"]
    remaining = max_attempts - attempts
    history = session.get("history", [])

    if guess < session["min"] or guess > session["max"]:
        return jsonify({
            "status": "out_of_range",
            "message": f"Out of range! Guess between {session['min']} and {session['max']}.",
            "attempts": attempts,
            "remaining": remaining + 1
        })

    hint = ""
    if guess < secret:
        diff = secret - guess
        if diff > 50:   hint = "Way too low! 🔻"
        elif diff > 20: hint = "Too low! ⬇️"
        elif diff > 10: hint = "A bit low! 🔽"
        else:           hint = "Very close, slightly low! 🔽"
        result = "low"
    elif guess > secret:
        diff = guess - secret
        if diff > 50:   hint = "Way too high! 🔺"
        elif diff > 20: hint = "Too high! ⬆️"
        elif diff > 10: hint = "A bit high! 🔼"
        else:           hint = "Very close, slightly high! 🔼"
        result = "high"
    else:
        result = "correct"

    history.append({"guess": guess, "result": result, "attempt": attempts})
    session["history"] = history

    if result == "correct":
        session["game_over"] = True
        save_result(session["player"], attempts, secret, session["difficulty"], True)
        return jsonify({
            "status": "won",
            "message": f"🎉 Correct! The number was {secret}!",
            "attempts": attempts,
            "number": secret,
            "history": history
        })

    if remaining <= 0:
        session["game_over"] = True
        save_result(session["player"], attempts, secret, session["difficulty"], False)
        return jsonify({
            "status": "lost",
            "message": f"💀 Game over! The number was {secret}.",
            "attempts": attempts,
            "number": secret,
            "history": history
        })

    return jsonify({
        "status": result,
        "message": hint,
        "attempts": attempts,
        "remaining": remaining,
        "history": history
    })

@app.route("/api/leaderboard", methods=["GET"])
def leaderboard():
    df = load_leaderboard()
    if df.empty:
        return jsonify({"leaderboard": [], "stats": {}})

    won_df = df[df["won"] == True]

    if not won_df.empty:
        best = (
            won_df.groupby("player")["attempts"]
            .min()
            .reset_index()
            .rename(columns={"attempts": "best_attempts"})
            .sort_values("best_attempts")
            .head(10)
        )
        leaderboard_data = best.to_dict(orient="records")
    else:
        leaderboard_data = []

    stats = {}
    if not df.empty:
        stats["total_games"] = int(len(df))
        stats["total_wins"] = int(df["won"].sum())
        stats["avg_attempts"] = round(float(df["attempts"].mean()), 2)
        stats["win_rate"] = round(stats["total_wins"] / stats["total_games"] * 100, 1)
        stats["difficulty_breakdown"] = df["difficulty"].value_counts().to_dict()

    return jsonify({"leaderboard": leaderboard_data, "stats": stats})

@app.route("/api/status", methods=["GET"])
def game_status():
    if "secret" not in session:
        return jsonify({"active": False})
    return jsonify({
        "active": True,
        "game_over": session.get("game_over", False),
        "attempts": session.get("attempts", 0),
        "max_attempts": session.get("max_attempts"),
        "difficulty": session.get("difficulty"),
        "player": session.get("player"),
        "min": session.get("min"),
        "max": session.get("max"),
        "history": session.get("history", [])
    })

@app.route("/api/hint", methods=["GET"])
def get_hint():
    if "secret" not in session or session.get("game_over"):
        return jsonify({"hint": "No active game."})
    secret = session["secret"]
    parity = "even" if secret % 2 == 0 else "odd"
    divisible = [n for n in [3, 5, 7] if secret % n == 0]
    hint = f"The number is {parity}."
    if divisible:
        hint += f" It is divisible by {divisible[0]}."
    return jsonify({"hint": hint})
@app.route("/api/clear_leaderboard", methods=["POST"])
def clear_leaderboard():
    df = pd.DataFrame(columns=["player","attempts","number","difficulty","timestamp","won"])
    df.to_csv(LEADERBOARD_FILE, index=False)
    return jsonify({"status": "cleared"})

if __name__ == "__main__":
    ensure_csv()
    app.run(debug=True, port=5000)