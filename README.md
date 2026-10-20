# 🌾 Bếp Quê — Learn English & Japanese

> **Explore the charm of Vietnamese countryside life, learn new vocabulary, earn coins, and treat yourself to your favorite snacks!**

**Bếp Quê** is a language-learning game that helps players learn English and Japanese vocabulary by exploring familiar objects found in a Vietnamese home. Discover objects, type their names correctly, collect coins, and unlock new rooms as you progress.

---

## ✨ Features

- 🏡 **Explore Rooms:** Discover everyday objects by tapping and swiping around each room.
- 📚 **Learn Two Languages:** Practice English and Japanese vocabulary through interactive gameplay.
- 🪙 **Earn Coins:** Answer correctly to collect coins and buy your favorite snacks.
- 🛒 **Tạp hóa Shop:** Tap the cart button on the room-selection screen to spend coins on snacks and drinks (products and prices are in the `GOODS` array in `game.js`).
- 🔓 **Unlock New Rooms:** Complete room challenges to explore new spaces.
- 📖 **Vocabulary Notebook:** Review words you have answered correctly, organized by category.
- 🎯 **Daily Missions:** Complete daily challenges to earn extra coins.
- 📱 **iPhone Support:** Deploy the game for free on the web and add it to your iPhone Home Screen.

## 🎮 How to Play

1. **Choose a room** and tap an object to explore it. Swipe horizontally to look around.
2. **Find hidden objects:** Use the “Find Objects” button to highlight undiscovered items.
3. **Type the correct word:** Enter the object's name in English or Japanese to earn coins.
4. **Review your vocabulary:** Open the notebook to revisit words you have answered correctly.
5. **Complete a room:** Answer correctly for at least 75% of the objects to earn **50 coins** and unlock the next room.
6. **Complete daily missions:** Earn extra coins and spend them on delicious snacks!

## 🛠️ Technologies

- HTML5
- CSS3
- Vanilla JavaScript

No external libraries, backend server, or player account is required.

## 📂 Project Structure

```text
bep-que/
├── index.html
├── style.css
├── game.js
├── vocab.js
└── assets/
    ├── start-garden.jpg
    ├── kitchen-background.png
    ├── living-room.png
    └── bedroom.png
```

| File | Description |
|---|---|
| `index.html` | Game structure and interface elements |
| `style.css` | Visual design, layout, and effects |
| `game.js` | Game interactions, answer validation, coins, missions, and progress |
| `vocab.js` | Room definitions, vocabulary, objects, and interactive hitboxes |
| `assets/` | Background images and visual assets |

### 📚 Vocabulary Collection

The game currently includes **86 objects across 3 rooms**.

| Room | Number of Objects |
|---|---:|
| 🍳 Kitchen | 26 |
| 🛋️ Living Room | 31 |
| 🛏️ Bedroom | 29 |
| **Total** | **86** |

Each object's interactive area is defined in the `rects` field, using pixel coordinates based on the original background image size of **1672 × 941 px**.

## 💻 Running the Game Locally

### Option 1 — Open Directly

Double-click `index.html` to open the game in your browser.

### Option 2 — Start a Local Server (Recommended)

Open a terminal in the project directory and run:

```bash
python3 -m http.server 8000
```

Then visit:

[http://localhost:8000](http://localhost:8000)

### 🐛 Debug Mode

Add `?debug` to the URL to display the interactive hitboxes. This helps you adjust object positions when developing or adding new objects.

```text
http://localhost:8000/?debug
```

## 🌐 Deploy for Free

### Option 1 — Netlify Drop

The quickest way to publish your game online.

1. Visit [Netlify Drop](https://app.netlify.com/drop).
2. Drag and drop the entire game folder onto the page.
3. Wait for deployment to finish and receive your website URL.
4. Open the link on your computer or iPhone to play.

### Option 2 — GitHub Pages

1. Create a public repository on [GitHub](https://github.com/).
2. Upload all project files and folders.
3. Open **Settings → Pages**.
4. Select the `main` branch and the `/ (root)` directory.
5. Wait for deployment to complete, then open your published website.

Your URL will typically look like this:

```text
https://take-2206.github.io/kotoba_world/
```

### 📱 Playing on iPhone

1. Open the published game URL in Safari.
2. Tap the **Share** button.
3. Select **Add to Home Screen**.
4. Launch the game from the new Home Screen icon for convenient access.

## 🇯🇵 Typing Japanese

To enter Japanese vocabulary on an iPhone, enable the Japanese keyboard:

**Settings → General → Keyboard → Keyboards → Add New Keyboard → Japanese.**

Switch to the Japanese keyboard whenever you need to enter Japanese answers.

## 📖 Vocabulary Notebook

The **Notebook** button is located in the upper-right corner of the game interface.

It stores words that players have answered correctly and organizes them into categories for easier review.

To add a new category, such as **Living Room**, add an entry to the `CATEGORIES` array at the end of `vocab.js`, including its corresponding `room` field.

The notebook only displays vocabulary from rooms that have been unlocked.

## 🔓 Room Completion and Unlocking

- **Completion requirement:** Correctly answer at least 75% of the objects in a room.
- **Completion reward:** 50 coins by default.
- **Unlock order:** Rooms follow the order defined in the `ROOMS` array in `vocab.js`.
- **Existing players:** Players who have already learned enough vocabulary in the Kitchen may have the Living Room unlocked automatically through the existing compatibility logic.

You can adjust the following settings near the beginning of `game.js`:

- `ROOM_RATIO` — the percentage of correct answers required to complete a room.
- `ROOM_BONUS` — the number of coins awarded for completing a room.

## ➕ Expanding the Project

### Adding a New Room

1. Add the new background image to the `assets/` directory. Use an image size of **1672 × 941 px**.
2. Add the room definition to the `ROOMS` array in `vocab.js`.
3. Define the room's objects using `makeItem(...)` and follow the existing data structure.
4. Add the corresponding category to `CATEGORIES` so the new vocabulary appears in the notebook.
5. Test and adjust the interactive hitboxes using debug mode.

Refer to the existing `L(...)` helper for the Living Room and `B(...)` helper for the Bedroom to follow the current implementation.

## 💾 Data and Privacy

Bếp Quê is designed to run directly in the browser without requiring a player account or backend connection.

Game progress is stored using the persistence mechanism implemented in the current game. Progress may not automatically synchronize across different devices or browsers.

## 🌱 Project Vision

Bếp Quê aims to make language learning more engaging, visual, and accessible by combining English and Japanese vocabulary practice with familiar scenes inspired by everyday Vietnamese life.

**Learn new words. Explore every room. Earn coins. Enjoy learning every day!** 🌾

