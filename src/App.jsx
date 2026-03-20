import React from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

const COLORS = [
  { id: "red", name: "Red", hex: "#ef4444" },
  { id: "orange", name: "Orange", hex: "#f97316" },
  { id: "amber", name: "Amber", hex: "#f59e0b" },
  { id: "yellow", name: "Yellow", hex: "#eab308" },
  { id: "lime", name: "Lime", hex: "#84cc16" },
  { id: "green", name: "Green", hex: "#22c55e" },
  { id: "emerald", name: "Emerald", hex: "#10b981" },
  { id: "teal", name: "Teal", hex: "#14b8a6" },
  { id: "cyan", name: "Cyan", hex: "#06b6d4" },
  { id: "sky", name: "Sky", hex: "#0ea5e9" },
  { id: "blue", name: "Blue", hex: "#3b82f6" },
  { id: "indigo", name: "Indigo", hex: "#6366f1" },
  { id: "violet", name: "Violet", hex: "#8b5cf6" },
  { id: "purple", name: "Purple", hex: "#a855f7" },
  { id: "fuchsia", name: "Fuchsia", hex: "#d946ef" },
  { id: "pink", name: "Pink", hex: "#ec4899" },
  { id: "rose", name: "Rose", hex: "#f43f5e" },
  { id: "brown", name: "Brown", hex: "#8b5e3c" },
  { id: "tan", name: "Tan", hex: "#d2b48c" },
  { id: "gold", name: "Gold", hex: "#d4af37" },
  { id: "silver", name: "Silver", hex: "#9ca3af" },
  { id: "white", name: "White", hex: "#f8fafc" },
  { id: "gray", name: "Gray", hex: "#6b7280" },
  { id: "black", name: "Black", hex: "#111827" },
  { id: "coral", name: "Coral", hex: "#fb7185" },
  { id: "mint", name: "Mint", hex: "#86efac" },
];

const MODES = {
  4: { columns: 4, rows: 6, label: "4 x 6" },
  5: { columns: 5, rows: 6, label: "5 x 6" },
  6: { columns: 6, rows: 6, label: "6 x 6" },
};

function makeEmptyBoard(columns, rows) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => null)
  );
}

function randomSolution(columns) {
  const picked = [];
  for (let i = 0; i < columns; i++) {
    picked.push(COLORS[Math.floor(Math.random() * COLORS.length)].id);
  }
  return picked;
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededSolution(columns, seedText) {
  const seed = Array.from(seedText).reduce(
    (acc, ch) => acc + ch.charCodeAt(0),
    0
  );
  const rand = mulberry32(seed + columns * 999);
  const picked = [];
  for (let i = 0; i < columns; i++) {
    picked.push(COLORS[Math.floor(rand() * COLORS.length)].id);
  }
  return picked;
}

function puzzleKeyForToday(mode) {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `cw-${y}-${m}-${d}-${mode}`;
}

function evaluateGuess(guess, solution) {
  const result = Array(guess.length).fill("absent");
  const solutionUsed = Array(solution.length).fill(false);
  const guessUsed = Array(guess.length).fill(false);

  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === solution[i]) {
      result[i] = "correct";
      solutionUsed[i] = true;
      guessUsed[i] = true;
    }
  }

  for (let i = 0; i < guess.length; i++) {
    if (guessUsed[i]) continue;
    for (let j = 0; j < solution.length; j++) {
      if (!solutionUsed[j] && guess[i] === solution[j]) {
        result[i] = "present";
        solutionUsed[j] = true;
        break;
      }
    }
  }

  return result;
}

function colorById(id) {
  return COLORS.find((c) => c.id === id);
}

function safeEmailFromUsername(username) {
  return `${
    username.toLowerCase().replace(/[^a-z0-9]/g, "") || "player"
  }@colorwordle.local`;
}

function Tile({ colorId, status, active, onClick }) {
  const color = colorId ? colorById(colorId) : null;

  let border = "#333";
  if (status === "correct") border = "#22c55e";
  if (status === "present") border = "#facc15";
  if (status === "absent") border = "#52525b";
  if (active) border = "#38bdf8";

  return (
    <button
      onClick={onClick}
      style={{
        width: 56,
        height: 56,
        borderRadius: 14,
        border: `3px solid ${border}`,
        background: color ? color.hex : "#18181b",
        cursor: "pointer",
      }}
      title={color?.name || "Empty"}
    />
  );
}

function LandingPage({ onStartAuth }) {
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1>Color Wordle</h1>
        <p>Guess the hidden color pattern.</p>
        <p>
          Pick from 26 colors, fill each row by clicking a tile and then a
          color, and solve the pattern in six tries.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <button style={styles.button} onClick={onStartAuth}>
            Play Now
          </button>
          <button style={styles.buttonSecondary} onClick={onStartAuth}>
            Login / Register
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthPage({ onBack, onAuth, authReady }) {
  const [mode, setMode] = React.useState("login");
  const [form, setForm] = React.useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [message, setMessage] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();

    if (!form.username || !form.password) {
      setMessage("Fill out the required fields first.");
      return;
    }

    if (mode === "register" && form.password !== form.confirm) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    const result = await onAuth({
      mode,
      username: form.username.trim(),
      email: (form.email || safeEmailFromUsername(form.username)).trim(),
      password: form.password,
    });
    setMessage(result.message);
    setLoading(false);
  }

  return (
    <div style={styles.page}>
      <div style={styles.containerNarrow}>
        <button style={styles.linkButton} onClick={onBack}>
          ← Back
        </button>

        <h2>Login to play Color Wordle</h2>
        {!authReady && (
          <p style={{ color: "#facc15" }}>
            Add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY env vars in
            Vercel and redeploy.
          </p>
        )}

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button
            style={mode === "login" ? styles.button : styles.buttonSecondary}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            style={mode === "register" ? styles.button : styles.buttonSecondary}
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>

        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          <input
            style={styles.input}
            placeholder="Username"
            value={form.username}
            onChange={(e) => update("username", e.target.value)}
          />
          <input
            style={styles.input}
            placeholder="Email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
          />
          {mode === "register" && (
            <input
              style={styles.input}
              type="password"
              placeholder="Confirm Password"
              value={form.confirm}
              onChange={(e) => update("confirm", e.target.value)}
            />
          )}
          <button
            style={styles.button}
            type="submit"
            disabled={loading || !authReady}
          >
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
          </button>
        </form>

        {message && <p style={{ marginTop: 14 }}>{message}</p>}
      </div>
    </div>
  );
}

function GamePage({ username, onLogout, stats, onGameFinished }) {
  const [mode, setMode] = React.useState(4);
  const [dailyMode, setDailyMode] = React.useState(true);
  const [board, setBoard] = React.useState(
    makeEmptyBoard(MODES[4].columns, MODES[4].rows)
  );
  const [feedback, setFeedback] = React.useState(
    Array.from({ length: MODES[4].rows }, () =>
      Array.from({ length: MODES[4].columns }, () => null)
    )
  );
  const [solution, setSolution] = React.useState(
    seededSolution(MODES[4].columns, puzzleKeyForToday(4))
  );
  const [currentRow, setCurrentRow] = React.useState(0);
  const [selectedCell, setSelectedCell] = React.useState({ row: 0, col: 0 });
  const [message, setMessage] = React.useState(
    "Pick a tile, then choose a color."
  );
  const [revealed, setRevealed] = React.useState(false);
  const [streak, setStreak] = React.useState(() =>
    Number(localStorage.getItem(`cw_streak_${username}`) || 0)
  );
  const [lastWinKey, setLastWinKey] = React.useState(
    () => localStorage.getItem(`cw_last_win_${username}`) || ""
  );

  function buildSolution(nextMode = mode, nextDaily = dailyMode) {
    const columns = MODES[nextMode].columns;
    return nextDaily
      ? seededSolution(columns, puzzleKeyForToday(nextMode))
      : randomSolution(columns);
  }

  function resetGame(nextMode = mode, nextDaily = dailyMode) {
    const { columns, rows } = MODES[nextMode];
    setBoard(makeEmptyBoard(columns, rows));
    setFeedback(
      Array.from({ length: rows }, () =>
        Array.from({ length: columns }, () => null)
      )
    );
    setSolution(buildSolution(nextMode, nextDaily));
    setCurrentRow(0);
    setSelectedCell({ row: 0, col: 0 });
    setMessage(
      nextDaily
        ? "Daily puzzle ready. Pick a tile, then choose a color."
        : "Random puzzle ready. Pick a tile, then choose a color."
    );
    setRevealed(false);
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    resetGame(nextMode, dailyMode);
  }

  function toggleDaily(nextDaily) {
    setDailyMode(nextDaily);
    resetGame(mode, nextDaily);
  }

  function fillColor(colorId) {
    if (revealed) return;
    if (selectedCell.row !== currentRow) {
      setMessage("You can only fill the active row.");
      return;
    }

    setBoard((prev) => {
      const copy = prev.map((r) => [...r]);
      copy[selectedCell.row][selectedCell.col] = colorId;
      return copy;
    });

    setMessage(`${colorById(colorId)?.name} placed.`);
  }

  async function submitGuess() {
    if (revealed) return;
    const row = board[currentRow];

    if (row.some((cell) => !cell)) {
      setMessage("Fill every tile in the row before submitting.");
      return;
    }

    const result = evaluateGuess(row, solution);
    setFeedback((prev) => {
      const copy = prev.map((r) => [...r]);
      copy[currentRow] = result;
      return copy;
    });

    const won = result.every((r) => r === "correct");
    if (won) {
      setRevealed(true);
      setMessage("You solved it.");
      await onGameFinished("win");

      const todayKey = puzzleKeyForToday(mode);
      if (dailyMode && lastWinKey !== todayKey) {
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        setLastWinKey(todayKey);
        localStorage.setItem(`cw_streak_${username}`, String(nextStreak));
        localStorage.setItem(`cw_last_win_${username}`, todayKey);
      }
      return;
    }

    if (currentRow === MODES[mode].rows - 1) {
      setRevealed(true);
      setMessage("Out of tries.");
      await onGameFinished("loss");
      if (dailyMode) {
        setStreak(0);
        localStorage.setItem(`cw_streak_${username}`, "0");
      }
      return;
    }

    setCurrentRow((r) => r + 1);
    setSelectedCell({ row: currentRow + 1, col: 0 });
    setMessage("Guess submitted.");
  }

  function clearActiveRow() {
    if (revealed) return;
    setBoard((prev) => {
      const copy = prev.map((r) => [...r]);
      copy[currentRow] = Array.from(
        { length: MODES[mode].columns },
        () => null
      );
      return copy;
    });
    setSelectedCell({ row: currentRow, col: 0 });
    setMessage("Row cleared.");
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.topbar}>
          <div>
            <h1>Color Wordle</h1>
            <p>Welcome back, {username}</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={styles.buttonSecondary} onClick={() => resetGame()}>
              {dailyMode ? "Reload Daily" : "New Puzzle"}
            </button>
            <button style={styles.buttonSecondary} onClick={onLogout}>
              Log Out
            </button>
          </div>
        </div>

        <div style={styles.modeRow}>
          <button
            style={dailyMode ? styles.button : styles.buttonSecondary}
            onClick={() => toggleDaily(true)}
          >
            Daily
          </button>
          <button
            style={!dailyMode ? styles.button : styles.buttonSecondary}
            onClick={() => toggleDaily(false)}
          >
            Random
          </button>
          <button
            style={mode === 4 ? styles.button : styles.buttonSecondary}
            onClick={() => changeMode(4)}
          >
            4 x 6
          </button>
          <button
            style={mode === 5 ? styles.button : styles.buttonSecondary}
            onClick={() => changeMode(5)}
          >
            5 x 6
          </button>
          <button
            style={mode === 6 ? styles.button : styles.buttonSecondary}
            onClick={() => changeMode(6)}
          >
            6 x 6
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <strong>Games:</strong> {stats.games} &nbsp; | &nbsp;
          <strong>Wins:</strong> {stats.wins} &nbsp; | &nbsp;
          <strong>Streak:</strong> {streak}
        </div>

        <p>{message}</p>

        <div style={{ display: "grid", gap: 10, margin: "20px 0" }}>
          {board.map((row, rowIndex) => (
            <div
              key={rowIndex}
              style={{ display: "flex", gap: 10, justifyContent: "center" }}
            >
              {row.map((cell, colIndex) => (
                <Tile
                  key={`${rowIndex}-${colIndex}`}
                  colorId={cell}
                  status={feedback[rowIndex]?.[colIndex]}
                  active={
                    selectedCell.row === rowIndex && selectedCell.col === colIndex
                  }
                  onClick={() => {
                    if (rowIndex !== currentRow || revealed) return;
                    setSelectedCell({ row: rowIndex, col: colIndex });
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <button style={styles.buttonSecondary} onClick={clearActiveRow}>
            Clear Row
          </button>
          <button style={styles.button} onClick={submitGuess}>
            Submit Guess
          </button>
        </div>

        <div style={styles.palette}>
          {COLORS.map((color) => (
            <button
              key={color.id}
              onClick={() => fillColor(color.id)}
              title={color.name}
              style={{
                ...styles.colorButton,
                background: color.hex,
              }}
            />
          ))}
        </div>

        {revealed && (
          <div style={{ marginTop: 24 }}>
            <h3>Solution</h3>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              {solution.map((id, idx) => (
                <div
                  key={idx}
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 12,
                    background: colorById(id)?.hex,
                    border: "2px solid #333",
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = React.useState("landing");
  const [username, setUsername] = React.useState("Player");
  const [session, setSession] = React.useState(null);
  const [stats, setStats] = React.useState({ games: 0, wins: 0 });

  const authReady = Boolean(supabase);

  React.useEffect(() => {
    let mounted = true;

    async function boot() {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      const currentSession = data.session;

      if (!mounted) return;

      if (currentSession?.user) {
        const nextUsername =
          currentSession.user.user_metadata?.username ||
          currentSession.user.email?.split("@")[0] ||
          "Player";
        setSession(currentSession);
        setUsername(nextUsername);
        setPage("game");
        setStats(readLocalStats(nextUsername));
      }
    }

    boot();

    if (!supabase) return () => { mounted = false; };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (nextSession?.user) {
        const nextUsername =
          nextSession.user.user_metadata?.username ||
          nextSession.user.email?.split("@")[0] ||
          "Player";
        setSession(nextSession);
        setUsername(nextUsername);
        setPage("game");
        setStats(readLocalStats(nextUsername));
      } else {
        setSession(null);
        setPage("landing");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  function readLocalStats(name) {
    try {
      return JSON.parse(
        localStorage.getItem(`cw_stats_${name}`) || '{"games":0,"wins":0}'
      );
    } catch {
      return { games: 0, wins: 0 };
    }
  }

  function writeLocalStats(name, nextStats) {
    localStorage.setItem(`cw_stats_${name}`, JSON.stringify(nextStats));
  }

  async function handleAuth(payload) {
    if (!supabase) {
      return {
        ok: false,
        message:
          "Supabase is not connected yet. Add the VITE env vars in Vercel and redeploy.",
      };
    }

    const { mode, username: nextUsername, email, password } = payload;

    if (mode === "register") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: nextUsername } },
      });
      if (error) return { ok: false, message: error.message };
      return {
        ok: true,
        message:
          "Account created. If email confirmation is enabled, check your inbox.",
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { ok: false, message: error.message };

    const resolvedUsername =
      data.user?.user_metadata?.username || nextUsername || "Player";

    setUsername(resolvedUsername);
    setSession(data.session);
    setPage("game");
    setStats(readLocalStats(resolvedUsername));

    return { ok: true, message: "Logged in." };
  }

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setPage("landing");
  }

  async function updatePlayerStats(result) {
    const nextStats = {
      games: stats.games + 1,
      wins: stats.wins + (result === "win" ? 1 : 0),
    };
    setStats(nextStats);
    writeLocalStats(username, nextStats);
  }

  if (page === "landing") {
    return <LandingPage onStartAuth={() => setPage("auth")} />;
  }

  if (page === "auth") {
    return (
      <AuthPage
        onBack={() => setPage("landing")}
        onAuth={handleAuth}
        authReady={authReady}
      />
    );
  }

  return (
    <GamePage
      username={username}
      onLogout={handleLogout}
      stats={stats}
      onGameFinished={updatePlayerStats}
    />
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#09090b",
    color: "white",
    fontFamily: "Arial, sans-serif",
    padding: 24,
  },
  container: {
    maxWidth: 1100,
    margin: "0 auto",
  },
  containerNarrow: {
    maxWidth: 500,
    margin: "0 auto",
  },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 24,
  },
  modeRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 20,
  },
  button: {
    background: "white",
    color: "black",
    border: "none",
    borderRadius: 10,
    padding: "10px 16px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  buttonSecondary: {
    background: "#18181b",
    color: "white",
    border: "1px solid #333",
    borderRadius: 10,
    padding: "10px 16px",
    cursor: "pointer",
  },
  linkButton: {
    background: "transparent",
    color: "#ddd",
    border: "none",
    cursor: "pointer",
    marginBottom: 20,
  },
  input: {
    padding: 12,
    borderRadius: 10,
    border: "1px solid #333",
    background: "#111",
    color: "white",
  },
  palette: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(48px, 1fr))",
    gap: 10,
  },
  colorButton: {
    height: 48,
    borderRadius: 10,
    border: "2px solid #333",
    cursor: "pointer",
  },
};