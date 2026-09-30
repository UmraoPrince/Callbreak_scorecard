# 🃏 Callbreak Scorecard

A simple, interactive and responsive **Callbreak Scorecard Web Application** designed to digitally manage scores for a 4-player Callbreak game.

Instead of maintaining scores manually on paper, players can enter their **Call (Bid)** and **Tricks/Leads Won**, and the application automatically calculates the round score and maintains the total score for every player.

## 🎮 Project Overview

In Callbreak, every player declares a **Call** before playing the round.

For example:

- Player calls **5** and wins **8 tricks** → Score: **+8**
- Player calls **4** and wins only **2 tricks** → Score: **-4**
- Player calls **3** and wins exactly **3 tricks** → Score: **+3**
- Player calls **5** and wins exactly **5 tricks** → Score: **+5**

The application automatically applies the scoring rules and maintains the cumulative score throughout the game.

---

## ✨ Features

- 👥 Support for **4 players**
- 🎯 Enter Call/Bid for every player
- 🏆 Enter number of tricks/leads won
- 🧮 Automatic score calculation
- ➕ Successful calls add the tricks won to the score
- ❌ Failed calls apply negative call score
- 📊 Automatic cumulative total
- 🔄 Round-by-round score tracking
- 📱 Responsive user interface
- 🎨 Attractive and easy-to-use design
- ⚡ Runs directly in the browser
- 🚫 No database required

---

## 🧠 Scoring Logic

The application follows the following scoring concept:

### 1. Player achieves or exceeds the Call

If:

```text
Tricks Won >= Call
```

Then:

```text
Round Score = Tricks Won
```

Example:

```text
Call = 5
Tricks Won = 8

Score = +8
```

### 2. Player fails to achieve the Call

If:

```text
Tricks Won < Call
```

Then:

```text
Round Score = -Call
```

Example:

```text
Call = 4
Tricks Won = 2

Score = -4
```

### Example Round

| Player | Call | Tricks Won | Round Score |
|---|---:|---:|---:|
| Player 1 | 5 | 8 | +8 |
| Player 2 | 4 | 2 | -4 |
| Player 3 | 3 | 3 | +3 |
| Player 4 | 6 | 7 | +7 |

The total score is automatically updated after every round.

---

## 🕹️ How to Play

### Step 1 — Add Players

Enter the names of the four players.

### Step 2 — Enter Calls

Each player enters the number of tricks they expect to win.

Example:

```text
Player 1 → 5
Player 2 → 4
Player 3 → 3
Player 4 → 6
```

### Step 3 — Play the Round

After the round is completed, enter the actual number of tricks/leads won by each player.

### Step 4 — Calculate Score

The application calculates each player's round score automatically.

### Step 5 — Continue the Game

The round result is added to the player's previous total and the cumulative score is displayed.

---

## 📊 Score Example

Suppose Player 1 has the following rounds:

```text
Round 1 → +8
Round 2 → +5
Round 3 → -6
Round 4 → +7
```

Total:

```text
8 + 5 - 6 + 7 = 14
```

So the player's current total score will be:

```text
14
```

---

## 🛠️ Technologies Used

- **HTML5** — Application structure
- **CSS3** — Styling and responsive design
- **JavaScript** — Game logic and score calculation

### Tech Stack

```text
HTML5
CSS3
JavaScript
```

---

## 📁 Project Structure

```text
Call_Game/
│
├── CALL.HTML
└── README.md
```

---

## 🚀 Run the Project Locally

### 1. Clone the repository

```bash
git clone https://github.com/UmraoPrince/Callbreak_scorecard.git
```

### 2. Open the project

```bash
cd Callbreak_scorecard
```

### 3. Run the application

Simply open:

```text
CALL.HTML
```

in any modern web browser.

No server or database is required.

---

## 🌐 GitHub Repository

**Repository:** `Callbreak_scorecard`

This project is designed as a lightweight browser-based score management system for Callbreak players.

---

## 🎯 Future Improvements

Some planned improvements include:

- 👤 Player profile management
- 💾 LocalStorage support
- 📜 Complete match history
- 🏆 Winner detection
- 📈 Score statistics
- 🌙 Dark mode
- 📱 Improved mobile experience
- 🔊 Game sound effects
- 🖨️ Printable scorecard
- 📤 Export scorecard as PDF
- 🔗 Online multiplayer support
- ☁️ Cloud-based match saving

---

## 🤝 Contributing

Contributions are welcome!

If you want to improve this project:

1. Fork the repository
2. Create a new branch

```bash
git checkout -b feature/new-feature
```

3. Make your changes
4. Commit your changes

```bash
git commit -m "Add new feature"
```

5. Push the branch

```bash
git push origin feature/new-feature
```

6. Open a Pull Request

---

## 👨‍💻 Author

**Prince Umrao**

B.Tech Computer Science Student  
Interested in Java, Full Stack Development, Data Science & Analytics.

---

## ⭐ Support

If you find this project useful, consider giving the repository a ⭐ on GitHub.

---

### 🃏 Play • Call • Win • Score
**Enjoy your Callbreak game!**
