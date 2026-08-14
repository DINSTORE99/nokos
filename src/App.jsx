import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import "./style.css";

/* =========================================================
   SUPABASE
========================================================= */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/* =========================================================
   HELPERS
========================================================= */

const formatRupiah = (value = 0) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const generateFallbackKey = () => {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let result = "";

  for (let i = 0; i < 64; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }

  return result;
};

/* =========================================================
   APP
========================================================= */

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const [page, setPage] = useState("dashboard");

  const [authMode, setAuthMode] = useState("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* =======================================================
     CHECK SUPABASE
  ======================================================= */

  useEffect(() => {
    if (!supabase) {
      setError(
        "Supabase belum dikonfigurasi. Periksa VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY."
      );

      setLoading(false);
      return;
    }

    let mounted = true;

    const init = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setSession(session);

      if (session?.user) {
        await loadProfile(session.user);
      }

      setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      setSession(session);

      if (session?.user) {
        await loadProfile(session.user);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* =======================================================
     LOAD PROFILE
  ======================================================= */

  const loadProfile = async (user) => {
    if (!supabase || !user) return;

    setProfileLoading(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Profile error:", error);
        setProfile(null);
        return;
      }

      if (data) {
        setProfile(data);
      } else {
        /*
          Fallback apabila trigger Supabase belum membuat profile.
          Ini hanya berjalan untuk user yang sedang login.
        */

        const apiKey = generateFallbackKey();

        const newProfile = {
          id: user.id,
          name:
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "User",
          email: user.email,
          api_key: apiKey,
          balance: 0,
          status: "active",
          role: "member",
        };

        const { data: created, error: createError } = await supabase
          .from("profiles")
          .insert(newProfile)
          .select()
          .single();

        if (createError) {
          console.error("Create profile error:", createError);
          setError(
            "Login berhasil, tetapi profile belum bisa dibuat: " +
              createError.message
          );
          return;
        }

        setProfile(created);
      }
    } finally {
      setProfileLoading(false);
    }
  };

  /* =======================================================
     LOGIN
  ======================================================= */

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!supabase) {
      setError("Supabase belum dikonfigurasi.");
      return;
    }

    if (!email.trim() || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }

    setAuthLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("Login error:", error);

        if (error.message.toLowerCase().includes("invalid login")) {
          setError(
            "Email atau password salah. Pastikan akun tersebut sudah terdaftar di Supabase."
          );
        } else {
          setError(error.message);
        }

        return;
      }

      if (data?.user) {
        setSession(data.session);

        await loadProfile(data.user);

        setPage("dashboard");

        setMessage("Login berhasil.");
      }
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan saat login.");
    } finally {
      setAuthLoading(false);
    }
  };

  /* =======================================================
     REGISTER
  ======================================================= */

  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!supabase) {
      setError("Supabase belum dikonfigurasi.");
      return;
    }

    if (!name.trim()) {
      setError("Nama wajib diisi.");
      return;
    }

    if (!email.trim()) {
      setError("Email wajib diisi.");
      return;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    setAuthLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
          },
        },
      });

      if (error) {
        console.error("Register error:", error);
        setError(error.message);
        return;
      }

      /*
        Jika email confirmation aktif,
        session bisa null.
      */

      if (!data.session) {
        setMessage(
          "Pendaftaran berhasil. Silakan cek email untuk konfirmasi akun sebelum login."
        );

        setAuthMode("login");
        setPassword("");

        return;
      }

      /*
        Jika email confirmation tidak aktif,
        user langsung login.
      */

      if (data.user) {
        await loadProfile(data.user);
        setPage("dashboard");
      }

      setMessage("Akun berhasil dibuat.");
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan saat membuat akun.");
    } finally {
      setAuthLoading(false);
    }
  };

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = async () => {
    if (!supabase) return;

    await supabase.auth.signOut();

    setSession(null);
    setProfile(null);
    setPage("dashboard");
    setEmail("");
    setPassword("");
    setName("");
    setError("");
    setMessage("");
  };

  /* =======================================================
     COPY
  ======================================================= */

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Berhasil disalin.");
    } catch {
      setError("Tidak dapat menyalin.");
    }
  };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="splash">
        <div className="brand-mark">N</div>
        <strong>NOKOS</strong>
        <span>Memuat aplikasi...</span>
      </div>
    );
  }

  /* =======================================================
     AUTH PAGE
  ======================================================= */

  if (!session) {
    return (
      <div className="auth-page">
        <div className="auth-glow glow-a" />
        <div className="auth-glow glow-b" />

        <div className="auth-card">
          <div className="side-brand">
            <div className="brand-mark">N</div>

            <div>
              <strong>NOKOS</strong>
              <small>VIRTUAL NUMBER PLATFORM</small>
            </div>
          </div>

          <div className="auth-copy">
            <span className="eyebrow">
              {authMode === "login" ? "WELCOME BACK" : "CREATE ACCOUNT"}
            </span>

            <h1>
              {authMode === "login"
                ? "Masuk ke NOKOS"
                : "Buat akun NOKOS"}
            </h1>

            <p>
              {authMode === "login"
                ? "Masuk untuk mengelola saldo, nomor virtual, OTP, dan API."
                : "Daftar untuk mulai menggunakan layanan nomor virtual NOKOS."}
            </p>
          </div>

          {error && <div className="alert error">{error}</div>}

          {message && (
            <div className="success-badge">
              ✓ {message}
            </div>
          )}

          <form
            className="auth-form"
            onSubmit={
              authMode === "login"
                ? handleLogin
                : handleRegister
            }
          >
            {authMode === "register" && (
              <label>
                Nama
                <input
                  type="text"
                  placeholder="Nama kamu"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </label>
            )}

            <label>
              Email
              <input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={
                  authMode === "login"
                    ? "current-password"
                    : "new-password"
                }
              />
            </label>

            <button
              className="btn primary full"
              type="submit"
              disabled={authLoading}
            >
              {authLoading
                ? "Memproses..."
                : authMode === "login"
                ? "Masuk"
                : "Daftar Sekarang"}
            </button>
          </form>

          <button
            className="text-btn"
            type="button"
            onClick={() => {
              setAuthMode(
                authMode === "login"
                  ? "register"
                  : "login"
              );

              setError("");
              setMessage("");
            }}
          >
            {authMode === "login"
              ? "Belum punya akun? Daftar"
              : "Sudah punya akun? Login"}
          </button>
        </div>
      </div>
    );
  }

  /* =======================================================
     DASHBOARD
  ======================================================= */

  const displayName =
    profile?.name ||
    session.user.user_metadata?.name ||
    session.user.email?.split("@")[0] ||
    "User";

  const balance = profile?.balance || 0;

  /* =======================================================
     SIDEBAR
  ======================================================= */

  const nav = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "⌂",
    },
    {
      id: "buy",
      label: "Beli Nomor",
      icon: "＋",
    },
    {
      id: "deposit",
      label: "Top Up",
      icon: "Rp",
    },
    {
      id: "history",
      label: "Riwayat",
      icon: "◷",
    },
    {
      id: "docs",
      label: "API Documentation",
      icon: "⌘",
    },
  ];

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <div
          className="overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="side-brand">
          <div className="brand-mark">N</div>

          <div>
            <strong>NOKOS</strong>
            <small>VIRTUAL NUMBER</small>
          </div>
        </div>

        <div className="side-label">MENU</div>

        <nav>
          {nav.map((item) => (
            <button
              key={item.id}
              className={page === item.id ? "active" : ""}
              onClick={() => {
                setPage(item.id);
                setSidebarOpen(false);
                setError("");
                setMessage("");
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="side-status">
          <i className="status-dot" />

          <div>
            <b>System Online</b>
            <span>API operational</span>
          </div>
        </div>

        <button
          className="logout"
          onClick={handleLogout}
        >
          ↪
          <span>Logout</span>
        </button>
      </aside>

      <main className="main">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>

          <div className="top-title">
            <span>NOKOS PANEL</span>
            <h2>{displayName}</h2>
          </div>

          <div className="top-actions">
            <div className="balance-mini">
              <div>
                <small>Saldo</small>
                <b>{formatRupiah(balance)}</b>
              </div>
            </div>
          </div>
        </header>

        <div className="content">
          {error && (
            <div className="alert error">
              {error}
            </div>
          )}

          {message && (
            <div className="success-badge">
              ✓ {message}
            </div>
          )}

          {/* ===============================================
              DASHBOARD
          =============================================== */}

          {page === "dashboard" && (
            <>
              <section className="hero-card">
                <div>
                  <span className="eyebrow">
                    VIRTUAL NUMBER PLATFORM
                  </span>

                  <h1>
                    Nomor virtual
                    <br />
                    <span>lebih mudah.</span>
                  </h1>

                  <p>
                    Kelola nomor virtual, OTP, saldo,
                    dan API dalam satu dashboard.
                  </p>

                  <div className="action-row">
                    <button
                      className="btn primary"
                      onClick={() => setPage("buy")}
                    >
                      Beli Nomor →
                    </button>

                    <button
                      className="btn secondary"
                      onClick={() => setPage("deposit")}
                    >
                      Top Up
                    </button>
                  </div>
                </div>

                <div className="hero-orb">
                  <div className="brand-mark">N</div>
                </div>
              </section>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">Rp</div>

                  <div>
                    <small>Saldo</small>
                    <strong>{formatRupiah(balance)}</strong>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">#</div>

                  <div>
                    <small>API Key</small>
                    <strong>
                      {profile?.api_key ? "Aktif" : "Belum ada"}
                    </strong>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">@</div>

                  <div>
                    <small>Status</small>

                    <span className="online">
                      ● {profile?.status || "active"}
                    </span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">U</div>

                  <div>
                    <small>Role</small>
                    <strong>
                      {profile?.role || "member"}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="section-head">
                <span className="eyebrow">QUICK ACTION</span>
                <h3>Akses cepat</h3>
              </div>

              <div className="quick-grid">
                <button
                  className="quick-card"
                  onClick={() => setPage("buy")}
                >
                  <div className="quick-icon">＋</div>

                  <div>
                    <b>Beli Nomor</b>
                    <span>
                      Order nomor virtual baru
                    </span>
                  </div>

                  <span>→</span>
                </button>

                <button
                  className="quick-card"
                  onClick={() => setPage("deposit")}
                >
                  <div className="quick-icon">Rp</div>

                  <div>
                    <b>Top Up Saldo</b>
                    <span>
                      Isi saldo menggunakan QRIS
                    </span>
                  </div>

                  <span>→</span>
                </button>

                <button
                  className="quick-card"
                  onClick={() => setPage("docs")}
                >
                  <div className="quick-icon">⌘</div>

                  <div>
                    <b>API Documentation</b>
                    <span>
                      Integrasikan API NOKOS
                    </span>
                  </div>

                  <span>→</span>
                </button>
              </div>
            </>
          )}

          {/* ===============================================
              BUY
          =============================================== */}

          {page === "buy" && (
            <>
              <div className="page-title">
                <span className="eyebrow">
                  VIRTUAL NUMBER
                </span>

                <h1>Beli Nomor</h1>

                <p>
                  Pilih layanan, negara, dan server
                  untuk mendapatkan nomor virtual.
                </p>
              </div>

              <div className="buy-layout">
                <div className="panel">
                  <div className="panel-head">
                    <div>
                      <b>Order nomor</b>
                      <span>
                        Pilih konfigurasi nomor
                      </span>
                    </div>
                  </div>

                  <div className="form-grid">
                    <label>
                      Service
                      <select defaultValue="wa">
                        <option value="wa">
                          WhatsApp
                        </option>

                        <option value="tg">
                          Telegram
                        </option>

                        <option value="oi">
                          Tinder
                        </option>
                      </select>
                    </label>

                    <label>
                      Negara
                      <select defaultValue="6">
                        <option value="6">
                          Indonesia (+62)
                        </option>

                        <option value="0">
                          Russia (+7)
                        </option>

                        <option value="187">
                          USA (+1)
                        </option>
                      </select>
                    </label>

                    <label>
                      Server
                      <select defaultValue="s2">
                        <option value="s2">
                          Server Plus
                        </option>

                        <option value="s1">
                          Server Express
                        </option>
                      </select>
                    </label>

                    <label>
                      Operator
                      <select defaultValue="">
                        <option value="">
                          Semua Operator
                        </option>

                        <option value="telkomsel">
                          Telkomsel
                        </option>

                        <option value="indosat">
                          Indosat
                        </option>

                        <option value="xl">
                          XL
                        </option>
                      </select>
                    </label>
                  </div>

                  <div className="availability">
                    <div>
                      <span>Harga</span>
                      <strong>Rp -</strong>
                    </div>

                    <div>
                      <span>Stok</span>
                      <strong>-</strong>
                    </div>

                    <button
                      className="btn primary"
                      onClick={() =>
                        setMessage(
                          "Fitur order API akan kita hubungkan setelah backend NOKOS selesai."
                        )
                      }
                    >
                      Cek & Beli
                    </button>
                  </div>
                </div>

                <div className="panel order-result">
                  <span className="eyebrow">
                    ORDER RESULT
                  </span>

                  <div className="empty-panel">
                    <div>◎</div>
                    <b>Belum ada nomor</b>
                    <span>
                      Nomor yang dibeli akan muncul di sini.
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ===============================================
              DEPOSIT
          =============================================== */}

          {page === "deposit" && (
            <>
              <div className="page-title">
                <span className="eyebrow">
                  BALANCE
                </span>

                <h1>Top Up Saldo</h1>

                <p>
                  Isi saldo NOKOS menggunakan QRIS.
                </p>
              </div>

              <div className="deposit-layout">
                <div className="panel">
                  <div className="panel-head">
                    <div>
                      <b>Nominal Top Up</b>
                      <span>
                        Minimal Rp10.000
                      </span>
                    </div>
                  </div>

                  <label>
                    Jumlah
                    <div className="money-input">
                      <span>Rp</span>

                      <input
                        type="number"
                        min="10000"
                        placeholder="50000"
                      />
                    </div>
                  </label>

                  <div className="preset-grid">
                    {[10000, 25000, 50000, 100000].map(
                      (amount) => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => {
                            setMessage(
                              `Nominal Rp${amount.toLocaleString(
                                "id-ID"
                              )} dipilih.`
                            );
                          }}
                        >
                          Rp
                          {amount.toLocaleString("id-ID")}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    className="btn primary full"
                    onClick={() =>
                      setMessage(
                        "Integrasi createDeposit akan kita pasang di backend Vercel."
                      )
                    }
                  >
                    Buat QRIS
                  </button>
                </div>

                <div className="panel qr-panel">
                  <span className="eyebrow">
                    PAYMENT
                  </span>

                  <h3>QRIS</h3>

                  <div className="empty-panel">
                    <div>▦</div>
                    <b>QR belum dibuat</b>
                    <span>
                      QRIS akan muncul setelah transaksi dibuat.
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ===============================================
              HISTORY
          =============================================== */}

          {page === "history" && (
            <>
              <div className="page-title">
                <span className="eyebrow">
                  TRANSACTIONS
                </span>

                <h1>Riwayat</h1>

                <p>
                  Riwayat pembelian nomor dan transaksi saldo.
                </p>
              </div>

              <div className="panel">
                <div className="empty-panel">
                  <div>◷</div>
                  <b>Belum ada riwayat</b>
                  <span>
                    Transaksi kamu akan muncul di sini.
                  </span>
                </div>
              </div>
            </>
          )}

          {/* ===============================================
              DOCUMENTATION
          =============================================== */}

          {page === "docs" && (
            <>
              <div className="page-title">
                <span className="eyebrow">
                  DEVELOPER
                </span>

                <h1>API Documentation</h1>

                <p>
                  Integrasikan REST API NOKOS ke website,
                  bot, aplikasi, atau sistem reseller kamu.
                </p>
              </div>

              <div className="docs-grid">
                <div className="panel">
                  <div className="doc-title">
                    <b>Authentication</b>
                  </div>

                  <p>
                    Semua request API menggunakan API Key
                    melalui HTTP Header.
                  </p>

                  <div className="code">
                    <button
                      className="copy-btn"
                      onClick={() =>
                        copyText(
                          "X-API-Key: YOUR_API_KEY"
                        )
                      }
                    >
                      ⧉
                    </button>

                    <pre>
{`X-API-Key: YOUR_API_KEY`}
                    </pre>
                  </div>
                </div>

                <div className="panel">
                  <div className="doc-title">
                    <b>Base URL</b>
                  </div>

                  <div className="code">
                    <button
                      className="copy-btn"
                      onClick={() =>
                        copyText(
                          "https://nokos.co.id/api/?action="
                        )
                      }
                    >
                      ⧉
                    </button>

                    <pre>
{`https://nokos.co.id/api/?action=`}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="doc-title">
                  <b>Endpoints</b>
                </div>

                {[
                  ["GET", "getBalance", "Cek saldo"],
                  ["GET", "getServices", "List layanan"],
                  ["GET", "getCountries", "List negara"],
                  ["GET", "getPrices", "Cek harga"],
                  [
                    "GET",
                    "getAvailability",
                    "Cek stok",
                  ],
                  [
                    "POST",
                    "getNumber",
                    "Order nomor",
                  ],
                  [
                    "GET",
                    "getStatus",
                    "Cek status OTP",
                  ],
                  [
                    "POST",
                    "setStatus",
                    "Update status",
                  ],
                  [
                    "POST",
                    "cancelActivation",
                    "Cancel nomor",
                  ],
                  [
                    "GET",
                    "getHistory",
                    "Riwayat aktivasi",
                  ],
                  [
                    "POST",
                    "createDeposit",
                    "Buat QRIS",
                  ],
                  [
                    "GET",
                    "checkDeposit",
                    "Cek deposit",
                  ],
                ].map(([method, endpoint, description]) => (
                  <div
                    className="endpoint"
                    key={endpoint}
                  >
                    <span
                      className={`method ${
                        method === "POST"
                          ? "post"
                          : ""
                      }`}
                    >
                      {method}
                    </span>

                    <b>{endpoint}</b>

                    <span>{description}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
