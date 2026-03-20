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

const DEFAULT_AVATARS = ["🎨", "🟦", "🟥", "🟩", "🟪", "🌈", "✨", "🎯", "🧩", "🔥"];

function makeEmptyBoard(columns, rows) {
  return Array.from({ length: rows }, () => Array.from({ length: columns }, () => null));
}

function randomSolution(columns) {
  const picked = [];
  for (let i = 0; i < columns; i++) picked.push(COLORS[Math.floor(Math.random() * COLORS.length)].id);
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
  const seed = Array.from(seedText).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const rand = mulberry32(seed + columns * 999);
  const picked = [];
  for (let i = 0; i < columns; i++) picked.push(COLORS[Math.floor(rand() * COLORS.length)].id);
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
  return `${username.toLowerCase().replace(/[^a-z0-9]/g, "") || "player"}@colorwordle.local`;
}

function feedbackBarColor(status) {
  if (status === "correct") return "#22c55e";
  if (status === "present") return "#facc15";
  if (status === "absent") return "#3f3f46";
  return "transparent";
}

function calcWinRate(games, wins) {
  if (!games) return 0;
  return Math.round((wins / games) * 100);
}

function usernameToKey(username) {
  return `cw_stats_${username}`;
}

async function ensureProfile(user, usernameOverride) {
  if (!supabase || !user) return null;
  const username = usernameOverride || user.user_metadata?.username || user.email?.split("@")[0] || "Player";
  const defaultAvatar = DEFAULT_AVATARS[username.length % DEFAULT_AVATARS.length];
  const payload = {
    id: user.id,
    username,
    avatar: defaultAvatar,
    bio: "",
    two_factor_enabled: false,
    wins: 0,
    games: 0,
    daily_streak: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await supabase.from("profiles").upsert(payload);
  return payload;
}

async function fetchProfile(userId) {
  if (!supabase || !userId) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return data || null;
}

async function fetchLeaderboard() {
  if (!supabase) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id, username, avatar, wins, games, daily_streak")
    .order("wins", { ascending: false })
    .order("games", { ascending: true })
    .limit(20);
  return data || [];
}

async function updateProfile(userId, values) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();
  if (error) return null;
  return data;
}

async function updateStatsRemote(userId, result, mode, streakValue) {
  if (!supabase || !userId) return null;
  const current = await fetchProfile(userId);
  if (!current) return null;
  const nextGames = (current.games || 0) + 1;
  const nextWins = (current.wins || 0) + (result === "win" ? 1 : 0);
  const payload = {
    games: nextGames,
    wins: nextWins,
    daily_streak: streakValue,
    updated_at: new Date().toISOString(),
    last_mode: mode,
  };
  const { data } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select()
    .single();
  return data || null;
}

function Tile({ colorId, status, active, onClick, size = 62 }) {
  const color = colorId ? colorById(colorId) : null;
  return (
    <button onClick={onClick} style={{ width: size, background: "transparent", border: "none", padding: 0, cursor: "pointer" }} title={color?.name || "Empty"}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 18,
          border: active ? "2px solid #38bdf8" : "1px solid rgba(255,255,255,0.08)",
          background: color ? color.hex : "rgba(255,255,255,0.04)",
          boxShadow: active ? "0 0 0 4px rgba(56,189,248,0.15)" : "0 10px 30px rgba(0,0,0,0.25)",
          transition: "all .18s ease",
        }}
      />
      <div
        style={{
          marginTop: 8,
          height: 5,
          borderRadius: 999,
          background: feedbackBarColor(status),
          boxShadow: status ? `0 0 12px ${feedbackBarColor(status)}55` : "none",
          transition: "all .18s ease",
        }}
      />
    </button>
  );
}

function SectionTitle({ eyebrow, title, text }) {
  return (
    <div>
      {eyebrow && <div style={styles.eyebrow}>{eyebrow}</div>}
      <h2 style={{ margin: "8px 0 0", fontSize: 34 }}>{title}</h2>
      {text && <div style={{ color: "#94a3b8", marginTop: 8 }}>{text}</div>}
    </div>
  );
}

function HomePreviewBoard() {
  const previewStatuses = ["correct", "present", "absent", null];
  return (
    <div style={styles.previewCard}>
      <div style={styles.previewGlowA} />
      <div style={styles.previewGlowB} />
      <div style={{ position: "relative", zIndex: 2 }}>
        <div style={styles.previewTopRow}>
          <SectionTitle eyebrow="Game preview" title="Crack the pattern" />
          <div style={styles.miniBadge}>26 colors</div>
        </div>
        <div style={{ display: "grid", gap: 12, justifyContent: "center", marginTop: 22 }}>
          {Array.from({ length: 6 }).map((_, row) => (
            <div key={row} style={{ display: "flex", gap: 12 }}>
              {Array.from({ length: 4 }).map((_, col) => {
                const preview = row < 2 ? COLORS[(row * 4 + col) % COLORS.length] : null;
                return <Tile key={col} colorId={preview?.id || null} status={row === 0 ? previewStatuses[col] : null} size={54} />;
              })}
            </div>
          ))}
        </div>
        <div style={styles.legendRow}>
          <div style={styles.legendItem}><span style={{ ...styles.legendDot, background: "#22c55e" }} /> Right spot</div>
          <div style={styles.legendItem}><span style={{ ...styles.legendDot, background: "#facc15" }} /> Right color</div>
          <div style={styles.legendItem}><span style={{ ...styles.legendDot, background: "#3f3f46" }} /> Not used</div>
        </div>
      </div>
    </div>
  );
}

function LandingPage({ onStartAuth }) {
  return (
    <div style={styles.page}>
      <div style={styles.bgOrbPink} />
      <div style={styles.bgOrbBlue} />
      <div style={styles.bgGrid} />
      <div style={styles.container}>
        <div style={styles.heroHeader}>
          <div style={styles.brandWrap}>
            <div style={styles.brandIcon}>
              <span style={{ ...styles.brandSquare, background: "#ec4899" }} />
              <span style={{ ...styles.brandSquare, background: "#22c55e" }} />
              <span style={{ ...styles.brandSquare, background: "#3b82f6" }} />
              <span style={{ ...styles.brandSquare, background: "#f59e0b" }} />
            </div>
            <div>
              <div style={styles.brandTitle}>Color Wordle</div>
              <div style={styles.brandSub}>Guess the hidden color pattern</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button style={styles.buttonSecondary} onClick={onStartAuth}>Login</button>
            <button style={styles.button} onClick={onStartAuth}>Register</button>
          </div>
        </div>

        <div style={styles.heroGrid}>
          <div>
            <div style={styles.pill}>A color-first puzzle game</div>
            <h1 style={styles.heroTitle}>Wordle,<nobr /> <span style={styles.heroGradient}>rebuilt with colors only.</span></h1>
            <p style={styles.heroText}>
              Pick from 26 colors, click a box, choose a color, and solve the hidden pattern in six tries. Play 4 x 6, 5 x 6, or 6 x 6 boards with daily and random puzzle modes.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
              <button style={styles.button} onClick={onStartAuth}>Play Now</button>
              <button style={styles.buttonSecondary} onClick={onStartAuth}>Login / Register</button>
            </div>
            <div style={styles.featureGrid}>
              <div style={styles.featureCard}><div style={styles.featureTitle}>26 colors</div><div style={styles.featureText}>A full palette to guess from every round.</div></div>
              <div style={styles.featureCard}><div style={styles.featureTitle}>3 game modes</div><div style={styles.featureText}>4 x 6, 5 x 6, and 6 x 6 puzzle sizes.</div></div>
              <div style={styles.featureCard}><div style={styles.featureTitle}>Online profiles</div><div style={styles.featureText}>Leaderboards, settings, avatars, and account tools.</div></div>
            </div>
          </div>
          <HomePreviewBoard />
        </div>
      </div>
    </div>
  );
}

function AuthPage({ onBack, onAuth }) {
  const [mode, setMode] = React.useState("login");
  const [form, setForm] = React.useState({ username: "", password: "", confirm: "" });
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
      email: safeEmailFromUsername(form.username),
      password: form.password,
    });
    setMessage(result.message);
    setLoading(false);
  }

  return (
    <div style={styles.page}>
      <div style={styles.bgOrbPink} />
      <div style={styles.bgOrbBlue} />
      <div style={styles.bgGrid} />
      <div style={styles.authShell}>
        <div style={styles.authInfo}>
          <button style={styles.linkButton} onClick={onBack}>← Back to home</button>
          <div style={styles.pill}>Player access</div>
          <h2 style={{ fontSize: 48, lineHeight: 1.05, margin: "18px 0 10px" }}>Login to play Color Wordle.</h2>
          <p style={{ color: "#cbd5e1", fontSize: 18, maxWidth: 520 }}>
            Create your account, save progress, and jump into daily or random color puzzles across all game sizes.
          </p>
          <div style={styles.authSwatches}>
            {COLORS.slice(0, 12).map((c) => <div key={c.id} style={{ ...styles.authSwatch, background: c.hex }} />)}
          </div>
        </div>

        <div style={styles.authCard}>
          <div style={styles.authTabsWrap}>
            <button onClick={() => setMode("login")} style={mode === "login" ? styles.authTabActive : styles.authTab}>Login</button>
            <button onClick={() => setMode("register")} style={mode === "register" ? styles.authTabActive : styles.authTab}>Register</button>
          </div>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{mode === "login" ? "Welcome back" : "Create account"}</div>
            <div style={{ color: "#94a3b8", marginTop: 6 }}>{mode === "login" ? "Use your username and password." : "Set up your new profile."}</div>
          </div>
          <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
            <input style={styles.input} placeholder="Username" value={form.username} onChange={(e) => update("username", e.target.value)} />
            <input style={styles.input} type="password" placeholder="Password" value={form.password} onChange={(e) => update("password", e.target.value)} />
            {mode === "register" && <input style={styles.input} type="password" placeholder="Confirm Password" value={form.confirm} onChange={(e) => update("confirm", e.target.value)} />}
            <button style={{ ...styles.button, width: "100%", marginTop: 4, opacity: loading ? 0.6 : 1 }} type="submit" disabled={loading}>{loading ? "Please wait..." : mode === "login" ? "Enter Game" : "Create Account"}</button>
          </form>
          {message && <div style={styles.messageBox}>{message}</div>}
        </div>
      </div>
    </div>
  );
}

function LeaderboardPanel({ leaderboard, currentUserId, onViewProfile }) {
  return (
    <div style={styles.panelCard}>
      <SectionTitle eyebrow="Global" title="Leaderboard" text="Top players across the app." />
      <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
        {leaderboard.length === 0 && <div style={{ color: "#94a3b8" }}>No players yet.</div>}
        {leaderboard.map((entry, index) => (
          <button key={entry.id || entry.username || index} style={{ ...styles.leaderCard, outline: entry.id === currentUserId ? "2px solid rgba(56,189,248,0.45)" : "none" }} onClick={() => onViewProfile(entry)}>
            <div style={styles.avatarCircle}>{entry.avatar || "🎨"}</div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontWeight: 700 }}>#{index + 1} {entry.username}</div>
              <div style={{ color: "#94a3b8", fontSize: 13 }}>{entry.games || 0} games • {calcWinRate(entry.games || 0, entry.wins || 0)}% WR</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={styles.rankValue}>{entry.wins || 0}</div>
              <div style={{ color: "#94a3b8", fontSize: 12 }}>wins</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ProfileModal({ profile, onClose, isSelf }) {
  if (!profile) return null;
  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalTop}>
          <div style={styles.profileHeader}>
            <div style={styles.bigAvatar}>{profile.avatar || "🎨"}</div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{profile.username}</div>
              <div style={{ color: "#94a3b8", marginTop: 6 }}>{profile.bio || "No bio yet."}</div>
            </div>
          </div>
          <button style={styles.buttonSecondary} onClick={onClose}>Close</button>
        </div>
        <div style={styles.profileStatsGrid}>
          <div style={styles.statCard}><div style={styles.statLabel}>Games</div><div style={styles.statValue}>{profile.games || 0}</div></div>
          <div style={styles.statCard}><div style={styles.statLabel}>Wins</div><div style={styles.statValue}>{profile.wins || 0}</div></div>
          <div style={styles.statCard}><div style={styles.statLabel}>Win Rate</div><div style={styles.statValue}>{calcWinRate(profile.games || 0, profile.wins || 0)}%</div></div>
          <div style={styles.statCard}><div style={styles.statLabel}>Daily Streak</div><div style={styles.statValue}>{profile.daily_streak || 0}</div></div>
        </div>
        <div style={{ color: "#94a3b8", marginTop: 20 }}>{isSelf ? "This is your profile." : "Viewing player profile."}</div>
      </div>
    </div>
  );
}

function SettingsModal({ profile, settings, setSettings, onClose, onSaveProfile, onSaveSettings, onChangePassword }) {
  const [local, setLocal] = React.useState({
    username: profile?.username || "",
    bio: profile?.bio || "",
    avatar: profile?.avatar || DEFAULT_AVATARS[0],
    currentPassword: "",
    newPassword: "",
  });
  const [message, setMessage] = React.useState("");

  function update(key, value) {
    setLocal((prev) => ({ ...prev, [key]: value }));
  }

  async function saveProfileChanges() {
    const result = await onSaveProfile({
      username: local.username,
      bio: local.bio,
      avatar: local.avatar,
    });
    setMessage(result?.message || "Saved.");
  }

  async function saveSecurityChanges() {
    if (!local.newPassword) {
      setMessage("Enter a new password first.");
      return;
    }
    const result = await onChangePassword(local.newPassword);
    setMessage(result?.message || "Password updated.");
    setLocal((prev) => ({ ...prev, currentPassword: "", newPassword: "" }));
  }

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modalCardLarge} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalTop}>
          <SectionTitle eyebrow="Account" title="Settings" text="Profile, security, and preferences." />
          <button style={styles.buttonSecondary} onClick={onClose}>Close</button>
        </div>

        <div style={styles.settingsGrid}>
          <div style={styles.settingsSection}>
            <div style={styles.settingsTitle}>Profile</div>
            <input style={styles.input} placeholder="Username" value={local.username} onChange={(e) => update("username", e.target.value)} />
            <textarea style={{ ...styles.input, minHeight: 110, resize: "vertical" }} placeholder="Bio" value={local.bio} onChange={(e) => update("bio", e.target.value)} />
            <div style={{ color: "#94a3b8", fontSize: 14 }}>Choose avatar</div>
            <div style={styles.avatarGrid}>
              {DEFAULT_AVATARS.map((avatar) => (
                <button key={avatar} style={{ ...styles.avatarPick, outline: local.avatar === avatar ? "2px solid rgba(56,189,248,0.75)" : "none" }} onClick={() => update("avatar", avatar)}>{avatar}</button>
              ))}
            </div>
            <button style={styles.button} onClick={saveProfileChanges}>Save Profile</button>
          </div>

          <div style={styles.settingsSection}>
            <div style={styles.settingsTitle}>Security</div>
            <input style={styles.input} type="password" placeholder="New password" value={local.newPassword} onChange={(e) => update("newPassword", e.target.value)} />
            <button style={styles.buttonSecondary} onClick={saveSecurityChanges}>Change Password</button>

            <div style={{ ...styles.twoFactorCard, marginTop: 20 }}>
              <div>
                <div style={{ fontWeight: 700 }}>Two-factor authentication</div>
                <div style={{ color: "#94a3b8", fontSize: 14, marginTop: 6 }}>Demo toggle for now. Wire to real OTP later.</div>
              </div>
              <label style={styles.switchRow}>
                <input
                  type="checkbox"
                  checked={settings.twoFactorEnabled}
                  onChange={(e) => setSettings((prev) => ({ ...prev, twoFactorEnabled: e.target.checked }))}
                />
                <span>{settings.twoFactorEnabled ? "Enabled" : "Disabled"}</span>
              </label>
            </div>

            <div style={{ ...styles.twoFactorCard, marginTop: 14 }}>
              <div>
                <div style={{ fontWeight: 700 }}>Profile privacy</div>
                <div style={{ color: "#94a3b8", fontSize: 14, marginTop: 6 }}>Let others view your profile in the leaderboard.</div>
              </div>
              <label style={styles.switchRow}>
                <input
                  type="checkbox"
                  checked={settings.publicProfile}
                  onChange={(e) => setSettings((prev) => ({ ...prev, publicProfile: e.target.checked }))}
                />
                <span>{settings.publicProfile ? "Public" : "Private"}</span>
              </label>
            </div>

            <button style={styles.button} onClick={onSaveSettings}>Save Settings</button>
          </div>
        </div>

        {message && <div style={styles.messageBox}>{message}</div>}
      </div>
    </div>
  );
}

function GamePage({ user, profile, leaderboard, onLogout, onGameFinished, onOpenProfile, onOpenSettings }) {
  const username = profile?.username || user?.email?.split("@")[0] || "Player";
  const stats = {
    games: profile?.games || 0,
    wins: profile?.wins || 0,
  };
  const [mode, setMode] = React.useState(4);
  const [dailyMode, setDailyMode] = React.useState(true);
  const [board, setBoard] = React.useState(makeEmptyBoard(MODES[4].columns, MODES[4].rows));
  const [feedback, setFeedback] = React.useState(Array.from({ length: MODES[4].rows }, () => Array.from({ length: MODES[4].columns }, () => null)));
  const [solution, setSolution] = React.useState(seededSolution(MODES[4].columns, puzzleKeyForToday(4)));
  const [currentRow, setCurrentRow] = React.useState(0);
  const [selectedCell, setSelectedCell] = React.useState({ row: 0, col: 0 });
  const [message, setMessage] = React.useState("Pick a tile, then choose a color.");
  const [revealed, setRevealed] = React.useState(false);
  const [streak, setStreak] = React.useState(profile?.daily_streak || 0);
  const [lastWinKey, setLastWinKey] = React.useState(() => localStorage.getItem(`cw_last_win_${username}`) || "");

  React.useEffect(() => {
    setStreak(profile?.daily_streak || 0);
  }, [profile?.daily_streak]);

  function buildSolution(nextMode = mode, nextDaily = dailyMode) {
    const columns = MODES[nextMode].columns;
    return nextDaily ? seededSolution(columns, puzzleKeyForToday(nextMode)) : randomSolution(columns);
  }

  function resetGame(nextMode = mode, nextDaily = dailyMode) {
    const { columns, rows } = MODES[nextMode];
    setBoard(makeEmptyBoard(columns, rows));
    setFeedback(Array.from({ length: rows }, () => Array.from({ length: columns }, () => null)));
    setSolution(buildSolution(nextMode, nextDaily));
    setCurrentRow(0);
    setSelectedCell({ row: 0, col: 0 });
    setMessage(nextDaily ? "Daily puzzle ready. Pick a tile, then choose a color." : "Random puzzle ready. Pick a tile, then choose a color.");
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

  async function shareResult() {
    const attempts = revealed ? currentRow + 1 : currentRow;
    const text = `Color Wordle ${MODES[mode].label} • ${dailyMode ? "Daily" : "Random"} • ${attempts}/${MODES[mode].rows}`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(text);
    setMessage("Result copied to clipboard.");
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

    const todayKey = puzzleKeyForToday(mode);
    const won = result.every((r) => r === "correct");
    if (won) {
      setRevealed(true);
      const nextStreak = dailyMode && lastWinKey !== todayKey ? streak + 1 : streak;
      setStreak(nextStreak);
      setLastWinKey(todayKey);
      localStorage.setItem(`cw_last_win_${username}`, todayKey);
      setMessage("You solved it.");
      await onGameFinished("win", mode, nextStreak);
      return;
    }

    if (currentRow === MODES[mode].rows - 1) {
      setRevealed(true);
      const resetStreak = dailyMode ? 0 : streak;
      if (dailyMode) setStreak(0);
      setMessage("Out of tries.");
      await onGameFinished("loss", mode, resetStreak);
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
      copy[currentRow] = Array.from({ length: MODES[mode].columns }, () => null);
      return copy;
    });
    setSelectedCell({ row: currentRow, col: 0 });
    setMessage("Row cleared.");
  }

  return (
    <div style={styles.page}>
      <div style={styles.bgOrbPink} />
      <div style={styles.bgOrbBlue} />
      <div style={styles.bgGrid} />
      <div style={styles.gameShellWide}>
        <div style={styles.sidePanel}>
          <div style={styles.panelCard}>
            <div style={styles.profileMiniTop}>
              <button style={styles.profileMini} onClick={() => onOpenProfile(profile)}>
                <div style={styles.avatarCircleLarge}>{profile?.avatar || "🎨"}</div>
                <div style={{ textAlign: "left" }}>
                  <div style={styles.brandTitle}>{username}</div>
                  <div style={{ color: "#94a3b8", marginTop: 4 }}>View profile</div>
                </div>
              </button>
              <button style={styles.buttonSecondary} onClick={onOpenSettings}>Settings</button>
            </div>
            <div style={styles.modeSwitchWrap2}>
              <button onClick={() => toggleDaily(true)} style={dailyMode ? styles.miniButtonActive : styles.miniButton}>Daily</button>
              <button onClick={() => toggleDaily(false)} style={!dailyMode ? styles.miniButtonActive : styles.miniButton}>Random</button>
            </div>
            <div style={styles.modeSwitchWrap}>
              <button onClick={() => changeMode(4)} style={mode === 4 ? styles.miniButtonActive : styles.miniButton}>4 x 6</button>
              <button onClick={() => changeMode(5)} style={mode === 5 ? styles.miniButtonActive : styles.miniButton}>5 x 6</button>
              <button onClick={() => changeMode(6)} style={mode === 6 ? styles.miniButtonActive : styles.miniButton}>6 x 6</button>
            </div>
            <div style={styles.statGrid}>
              <div style={styles.statCard}><div style={styles.statLabel}>Games</div><div style={styles.statValue}>{stats.games}</div></div>
              <div style={styles.statCard}><div style={styles.statLabel}>Wins</div><div style={styles.statValue}>{stats.wins}</div></div>
              <div style={{ ...styles.statCard, gridColumn: "1 / -1" }}><div style={styles.statLabel}>Daily streak</div><div style={styles.statValue}>{streak}</div></div>
            </div>
            <div style={styles.helpBox}>
              <div style={styles.helpTitle}>How feedback works</div>
              <div style={styles.helpRow}><span style={{ ...styles.legendDot, background: "#22c55e" }} /> Green line = right color, right spot</div>
              <div style={styles.helpRow}><span style={{ ...styles.legendDot, background: "#facc15" }} /> Yellow line = right color, wrong spot</div>
              <div style={styles.helpRow}><span style={{ ...styles.legendDot, background: "#3f3f46" }} /> Gray line = not in the answer</div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              <button style={styles.buttonSecondary} onClick={shareResult}>Share</button>
              <button style={styles.buttonSecondary} onClick={onLogout}>Log Out</button>
            </div>
          </div>

          <LeaderboardPanel leaderboard={leaderboard} currentUserId={user?.id} onViewProfile={onOpenProfile} />
        </div>

        <div style={styles.boardPanel}>
          <div style={styles.boardCard}>
            <div style={styles.boardHeader}>
              <SectionTitle eyebrow={dailyMode ? "Daily puzzle" : "Random puzzle"} title={`${MODES[mode].label} board`} text={message} />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button style={styles.buttonSecondary} onClick={() => resetGame()}>{dailyMode ? "Reload Daily" : "New Puzzle"}</button>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12, justifyContent: "center", marginTop: 10 }}>
              {board.map((row, rowIndex) => (
                <div key={rowIndex} style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                  {row.map((cell, colIndex) => (
                    <Tile
                      key={`${rowIndex}-${colIndex}`}
                      colorId={cell}
                      status={feedback[rowIndex]?.[colIndex]}
                      active={selectedCell.row === rowIndex && selectedCell.col === colIndex}
                      onClick={() => {
                        if (rowIndex !== currentRow || revealed) return;
                        setSelectedCell({ row: rowIndex, col: colIndex });
                      }}
                      size={mode === 6 ? 52 : 62}
                    />
                  ))}
                </div>
              ))}
            </div>

            <div style={styles.actionRow}>
              <button style={styles.buttonSecondary} onClick={clearActiveRow}>Clear Row</button>
              <button style={styles.button} onClick={submitGuess}>Submit Guess</button>
            </div>

            <div>
              <div style={styles.paletteHeader}>
                <div style={{ fontWeight: 700 }}>Color palette</div>
                <div style={{ color: "#94a3b8", fontSize: 14 }}>Selected tile: row {selectedCell.row + 1}, box {selectedCell.col + 1}</div>
              </div>
              <div style={styles.palette}>
                {COLORS.map((color) => (
                  <button key={color.id} onClick={() => fillColor(color.id)} title={color.name} style={styles.paletteCard}>
                    <div style={{ ...styles.paletteSwatch, background: color.hex }} />
                    <div style={styles.paletteName}>{color.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {revealed && (
              <div style={styles.solutionCard}>
                <div>
                  <div style={styles.eyebrow}>Solution</div>
                  <div style={{ color: "#cbd5e1", marginTop: 6 }}>Here was the hidden pattern.</div>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
                  {solution.map((id, idx) => (
                    <div key={idx} style={styles.solutionItem}>
                      <div style={{ ...styles.solutionSwatch, background: colorById(id)?.hex }} />
                      <div style={styles.solutionText}>{colorById(id)?.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = React.useState("landing");
  const [user, setUser] = React.useState(null);
  const [profile, setProfile] = React.useState(null);
  const [leaderboard, setLeaderboard] = React.useState([]);
  const [selectedProfile, setSelectedProfile] = React.useState(null);
  const [showSettings, setShowSettings] = React.useState(false);
  const [settings, setSettings] = React.useState({ twoFactorEnabled: false, publicProfile: true });

  React.useEffect(() => {
    let mounted = true;

    async function boot() {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      const currentSession = data.session;
      if (!mounted) return;
      if (currentSession?.user) {
        setUser(currentSession.user);
        const prof = await ensureProfile(currentSession.user);
        setProfile(prof || (await fetchProfile(currentSession.user.id)));
        setPage("game");
        setLeaderboard(await fetchLeaderboard());
      }
    }

    boot();
    if (!supabase) return () => { mounted = false; };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (nextSession?.user) {
        setUser(nextSession.user);
        const prof = await ensureProfile(nextSession.user);
        setProfile(prof || (await fetchProfile(nextSession.user.id)));
        setPage("game");
        setLeaderboard(await fetchLeaderboard());
      } else {
        setUser(null);
        setProfile(null);
        setPage("landing");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleAuth(payload) {
    if (!supabase) {
      return { ok: false, message: "Supabase is not connected yet. Add the VITE env vars in Vercel and redeploy." };
    }

    const { mode, username, email, password } = payload;

    if (mode === "register") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) return { ok: false, message: error.message };
      if (data.user) {
        const prof = await ensureProfile(data.user, username);
        setProfile(prof || (await fetchProfile(data.user.id)));
      }
      return { ok: true, message: "Account created successfully. You can now login." };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, message: error.message };
    if (data.user) {
      const prof = await ensureProfile(data.user, username);
      const fullProfile = prof || (await fetchProfile(data.user.id));
      setUser(data.user);
      setProfile(fullProfile);
      setPage("game");
      setLeaderboard(await fetchLeaderboard());
    }
    return { ok: true, message: "Logged in." };
  }

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setPage("landing");
  }

  async function updatePlayerStats(result, mode, streakValue) {
    if (!user) return;
    const next = await updateStatsRemote(user.id, result, mode, streakValue);
    if (next) setProfile(next);
    setLeaderboard(await fetchLeaderboard());
  }

  async function handleSaveProfile(values) {
    if (!user) return { message: "No user found." };
    const next = await updateProfile(user.id, values);
    if (next) {
      setProfile(next);
      setLeaderboard(await fetchLeaderboard());
      return { message: "Profile saved." };
    }
    return { message: "Could not save profile." };
  }

  async function handleSaveSettings() {
    if (!user) return;
    const next = await updateProfile(user.id, { two_factor_enabled: settings.twoFactorEnabled, public_profile: settings.publicProfile });
    if (next) setProfile(next);
  }

  async function handleChangePassword(newPassword) {
    if (!supabase) return { message: "Supabase not ready." };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { message: error.message };
    return { message: "Password changed successfully." };
  }

  if (page === "landing") return <LandingPage onStartAuth={() => setPage("auth")} />;

  if (page === "auth") return <AuthPage onBack={() => setPage("landing")} onAuth={handleAuth} />;

  return (
    <>
      <GamePage
        user={user}
        profile={profile}
        leaderboard={leaderboard}
        onLogout={handleLogout}
        onGameFinished={updatePlayerStats}
        onOpenProfile={(p) => setSelectedProfile(p)}
        onOpenSettings={() => setShowSettings(true)}
      />
      <ProfileModal profile={selectedProfile} onClose={() => setSelectedProfile(null)} isSelf={selectedProfile?.id === user?.id} />
      {showSettings && (
        <SettingsModal
          profile={profile}
          settings={settings}
          setSettings={setSettings}
          onClose={() => setShowSettings(false)}
          onSaveProfile={handleSaveProfile}
          onSaveSettings={handleSaveSettings}
          onChangePassword={handleChangePassword}
        />
      )}
    </>
  );
}

const glass = {
  background: "rgba(11,15,25,0.72)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 20px 80px rgba(0,0,0,0.45)",
  backdropFilter: "blur(18px)",
};

const styles = {
  page: { minHeight: "100vh", background: "linear-gradient(180deg, #05070c 0%, #09090b 100%)", color: "white", fontFamily: "Inter, Arial, sans-serif", position: "relative", overflow: "hidden" },
  bgOrbPink: { position: "absolute", top: -140, left: -100, width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle, rgba(236,72,153,0.28) 0%, rgba(236,72,153,0) 72%)", filter: "blur(10px)" },
  bgOrbBlue: { position: "absolute", right: -120, top: 120, width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.22) 0%, rgba(59,130,246,0) 72%)", filter: "blur(14px)" },
  bgGrid: { position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "34px 34px", maskImage: "radial-gradient(circle at center, black 35%, transparent 90%)", pointerEvents: "none" },
  container: { maxWidth: 1240, margin: "0 auto", padding: "28px 24px 64px", position: "relative", zIndex: 2 },
  heroHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 42 },
  brandWrap: { display: "flex", alignItems: "center", gap: 14 },
  brandIcon: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 5, padding: 10, borderRadius: 20, ...glass },
  brandSquare: { width: 16, height: 16, borderRadius: 6, display: "block" },
  brandTitle: { fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em" },
  brandSub: { color: "#94a3b8", marginTop: 4, fontSize: 14 },
  heroGrid: { display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 34, alignItems: "center" },
  pill: { display: "inline-block", padding: "10px 16px", borderRadius: 999, ...glass, fontSize: 14, color: "#e2e8f0" },
  heroTitle: { fontSize: 70, lineHeight: 0.95, letterSpacing: "-0.05em", margin: "18px 0 16px", maxWidth: 760 },
  heroGradient: { background: "linear-gradient(90deg, #f472b6 0%, #67e8f9 52%, #86efac 100%)", WebkitBackgroundClip: "text", color: "transparent" },
  heroText: { fontSize: 19, color: "#cbd5e1", lineHeight: 1.7, maxWidth: 760 },
  featureGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16, marginTop: 28 },
  featureCard: { ...glass, borderRadius: 24, padding: 20 },
  featureTitle: { fontWeight: 800, marginBottom: 8, fontSize: 17 },
  featureText: { color: "#94a3b8", fontSize: 14, lineHeight: 1.6 },
  previewCard: { ...glass, borderRadius: 34, padding: 28, position: "relative", overflow: "hidden", minHeight: 620 },
  previewGlowA: { position: "absolute", top: -40, right: -30, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(236,72,153,0.32), rgba(236,72,153,0))" },
  previewGlowB: { position: "absolute", bottom: -50, left: -30, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,197,94,0.22), rgba(34,197,94,0))" },
  previewTopRow: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" },
  miniBadge: { padding: "8px 12px", borderRadius: 999, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#cbd5e1", fontSize: 13 },
  eyebrow: { fontSize: 12, textTransform: "uppercase", letterSpacing: ".18em", color: "#94a3b8" },
  legendRow: { marginTop: 26, display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", color: "#cbd5e1", fontSize: 14 },
  legendItem: { display: "flex", alignItems: "center", gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 999, display: "inline-block" },
  authShell: { maxWidth: 1240, margin: "0 auto", padding: "34px 24px 64px", display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 34, alignItems: "center", position: "relative", zIndex: 2 },
  authInfo: { minWidth: 0 },
  authSwatches: { display: "grid", gridTemplateColumns: "repeat(4, 58px)", gap: 14, marginTop: 28 },
  authSwatch: { width: 58, height: 58, borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 12px 30px rgba(0,0,0,0.24)" },
  authCard: { ...glass, borderRadius: 34, padding: 28, maxWidth: 480, width: "100%", justifySelf: "end" },
  authTabsWrap: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 6, borderRadius: 20, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 22 },
  authTab: { background: "transparent", color: "#94a3b8", border: "none", padding: "14px 16px", borderRadius: 16, fontWeight: 700, cursor: "pointer" },
  authTabActive: { background: "linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)", color: "#020617", border: "none", padding: "14px 16px", borderRadius: 16, fontWeight: 800, cursor: "pointer", boxShadow: "0 10px 24px rgba(255,255,255,0.14)" },
  gameShellWide: { maxWidth: 1500, margin: "0 auto", padding: "28px 24px 50px", position: "relative", zIndex: 2, display: "grid", gridTemplateColumns: "360px 1fr", gap: 26 },
  sidePanel: { minWidth: 0, display: "grid", gap: 20, alignSelf: "start" },
  boardPanel: { minWidth: 0 },
  panelCard: { ...glass, borderRadius: 30, padding: 22, position: "sticky", top: 18 },
  profileMiniTop: { display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", marginBottom: 12 },
  profileMini: { display: "flex", alignItems: "center", gap: 12, background: "transparent", border: "none", color: "white", cursor: "pointer", padding: 0 },
  avatarCircle: { width: 46, height: 46, borderRadius: 999, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "grid", placeItems: "center", fontSize: 22 },
  avatarCircleLarge: { width: 58, height: 58, borderRadius: 999, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "grid", placeItems: "center", fontSize: 28 },
  bigAvatar: { width: 88, height: 88, borderRadius: 999, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "grid", placeItems: "center", fontSize: 38 },
  modeSwitchWrap2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 },
  modeSwitchWrap: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 10 },
  miniButton: { background: "rgba(255,255,255,0.04)", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "11px 10px", cursor: "pointer", fontWeight: 700 },
  miniButtonActive: { background: "linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)", color: "#020617", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "11px 10px", cursor: "pointer", fontWeight: 800 },
  statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 18 },
  statCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 16 },
  statLabel: { color: "#94a3b8", fontSize: 13 },
  statValue: { fontSize: 32, fontWeight: 800, marginTop: 6, letterSpacing: "-0.03em" },
  helpBox: { marginTop: 18, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 16 },
  helpTitle: { fontWeight: 800, marginBottom: 10 },
  helpRow: { display: "flex", alignItems: "center", gap: 8, color: "#cbd5e1", fontSize: 14, marginTop: 8 },
  leaderCard: { display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 12, color: "white", cursor: "pointer" },
  rankValue: { fontSize: 24, fontWeight: 800 },
  boardCard: { ...glass, borderRadius: 30, padding: 28 },
  boardHeader: { display: "flex", justifyContent: "space-between", gap: 18, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 24 },
  actionRow: { display: "flex", gap: 12, margin: "24px 0 26px", flexWrap: "wrap" },
  paletteHeader: { display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" },
  palette: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(88px, 1fr))", gap: 12 },
  paletteCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 10, cursor: "pointer", textAlign: "left" },
  paletteSwatch: { height: 44, borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)" },
  paletteName: { marginTop: 8, color: "#e2e8f0", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  solutionCard: { marginTop: 26, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: 20 },
  solutionItem: { textAlign: "center" },
  solutionSwatch: { width: 56, height: 56, borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 14px 28px rgba(0,0,0,0.25)" },
  solutionText: { marginTop: 8, color: "#cbd5e1", fontSize: 12 },
  button: { background: "linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)", color: "#020617", border: "none", borderRadius: 16, padding: "13px 18px", cursor: "pointer", fontWeight: 800, boxShadow: "0 16px 30px rgba(255,255,255,0.12)" },
  buttonSecondary: { background: "rgba(255,255,255,0.04)", color: "white", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "13px 18px", cursor: "pointer", fontWeight: 700 },
  linkButton: { background: "transparent", color: "#cbd5e1", border: "none", cursor: "pointer", marginBottom: 20, padding: 0, fontSize: 15 },
  input: { padding: "15px 16px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "white", outline: "none", fontSize: 15 },
  messageBox: { marginTop: 16, padding: "14px 16px", borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#cbd5e1" },
  modalBackdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "grid", placeItems: "center", zIndex: 50, padding: 20 },
  modalCard: { ...glass, borderRadius: 28, padding: 24, width: "min(760px, 100%)" },
  modalCardLarge: { ...glass, borderRadius: 28, padding: 24, width: "min(1000px, 100%)", maxHeight: "90vh", overflow: "auto" },
  modalTop: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 20 },
  profileHeader: { display: "flex", gap: 16, alignItems: "center" },
  profileStatsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: 20 },
  settingsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  settingsSection: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 22, padding: 18, display: "grid", gap: 14, alignContent: "start" },
  settingsTitle: { fontSize: 20, fontWeight: 800 },
  avatarGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 },
  avatarPick: { height: 56, borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "white", fontSize: 28, cursor: "pointer" },
  twoFactorCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 14, display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center" },
  switchRow: { display: "flex", alignItems: "center", gap: 8, color: "#e2e8f0" },
};
