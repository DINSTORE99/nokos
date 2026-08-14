import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  CreditCard,
  Globe2,
  History,
  KeyRound,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Phone,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
  X,
  Zap
} from "lucide-react";
import { supabase } from "./lib/supabase";

const money = (value = 0) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const api = async (action, options = {}) => {
  const params = new URLSearchParams({ action, ...(options.params || {}) });
  const response = await fetch(`/api/nokos?${params.toString()}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(options.idempotencyKey
        ? { "X-Idempotency-Key": options.idempotencyKey }
        : {})
    },
    body:
      options.method && options.method !== "GET"
        ? new URLSearchParams(options.body || {})
        : undefined
  });

  const data = await response.json().catch(() => ({
    success: false,
    error: "Response server tidak valid."
  }));

  if (!response.ok || data.success === false) {
    throw new Error(data.error || data.message || "Request gagal.");
  }
  return data;
};

function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [sidebar, setSidebar] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));

    return () => subscription.unsubscribe();
  }, []);

  if (authLoading) return <Splash />;
  if (!session) return <Login />;

  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={setPage} open={sidebar} setOpen={setSidebar} />
      <main className="main">
        <Header setSidebar={setSidebar} />
        {page === "dashboard" && <Dashboard setPage={setPage} />}
        {page === "buy" && <BuyNumber />}
        {page === "activations" && <Activations />}
        {page === "deposit" && <Deposit />}
        {page === "history" && <HistoryPage />}
        {page === "docs" && <Docs />}
      </main>
    </div>
  );
}

function Splash() {
  return <div className="splash"><div className="brand-mark">N</div><strong>NOKOS</strong><span>Memuat dashboard...</span></div>;
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!supabase) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="brand-line"><div className="brand-mark">N</div><b>NOKOS</b></div>
          <h1>Supabase belum dikonfigurasi</h1>
          <p>Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di Environment Variables Vercel.</p>
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (result.error) setError(result.error.message);
    setBusy(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-glow glow-a" />
      <div className="auth-glow glow-b" />
      <div className="auth-card">
        <div className="brand-line">
          <div className="brand-mark">N</div>
          <div><b>NOKOS</b><small>Virtual Number Platform</small></div>
        </div>
        <div className="auth-copy">
          <span className="eyebrow">SECURE ACCESS</span>
          <h1>{mode === "login" ? "Selamat datang kembali." : "Buat akun baru."}</h1>
          <p>Kelola nomor virtual, OTP, saldo, dan transaksi dari satu dashboard.</p>
        </div>

        <form onSubmit={submit} className="auth-form">
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" required /></label>
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength="6" required /></label>
          {error && <div className="alert error">{error}</div>}
          <button className="btn primary full" disabled={busy}>{busy ? "Memproses..." : mode === "login" ? "Masuk ke Dashboard" : "Daftar Sekarang"} <ChevronRight size={17} /></button>
        </form>

        <button className="text-btn" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
          {mode === "login" ? "Belum punya akun? Daftar" : "Sudah punya akun? Login"}
        </button>
      </div>
    </div>
  );
}

function Sidebar({ page, setPage, open, setOpen }) {
  const items = [
    ["dashboard", "Dashboard", Activity],
    ["buy", "Beli Nomor", Smartphone],
    ["activations", "Aktivasi", MessageSquare],
    ["deposit", "Top Up", Wallet],
    ["history", "Riwayat", History],
    ["docs", "API Docs", KeyRound]
  ];

  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  return (
    <>
      {open && <div className="overlay" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="side-brand">
          <div className="brand-mark">N</div>
          <div><strong>NOKOS</strong><small>NUMBER PLATFORM</small></div>
        </div>

        <div className="side-label">MENU</div>
        <nav>
          {items.map(([id, label, Icon]) => (
            <button key={id} className={page === id ? "active" : ""} onClick={() => { setPage(id); setOpen(false); }}>
              <Icon size={18} /> <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="side-status">
          <div className="status-dot" />
          <div><b>API Online</b><span>NOKOS API aktif</span></div>
        </div>

        <button className="logout" onClick={logout}><LogOut size={17} /> Keluar</button>
      </aside>
    </>
  );
}

function Header({ setSidebar }) {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const result = await api("getBalance");
      setBalance(result.data?.balance ?? 0);
    } catch {
      setBalance(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <header className="topbar">
      <button className="mobile-menu" onClick={() => setSidebar(true)}><Menu /></button>
      <div className="top-title">
        <span>CONTROL CENTER</span>
        <h2>NOKOS Dashboard</h2>
      </div>
      <div className="top-actions">
        <button className="icon-btn" onClick={load} title="Refresh"><RefreshCw size={17} className={loading ? "spin" : ""} /></button>
        <div className="balance-mini">
          <Wallet size={17} />
          <div><small>Saldo</small><b>{balance === null ? "—" : money(balance)}</b></div>
        </div>
      </div>
    </header>
  );
}

function Dashboard({ setPage }) {
  const [balance, setBalance] = useState(0);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [b, s] = await Promise.all([api("getBalance"), api("getServices")]);
      setBalance(b.data?.balance || 0);
      setServices(s.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="content">
      <section className="hero-card">
        <div>
          <span className="eyebrow">WELCOME TO NOKOS</span>
          <h1>Nomor virtual,<br /><span>lebih cepat.</span></h1>
          <p>Beli nomor OTP untuk berbagai layanan dengan stok dan harga real-time.</p>
          <button className="btn primary" onClick={() => setPage("buy")}>Beli Nomor <ArrowUpRight size={17} /></button>
        </div>
        <div className="hero-orb"><Smartphone size={82} strokeWidth={1.2} /></div>
      </section>

      <div className="stats-grid">
        <Stat icon={Wallet} label="Saldo Aktif" value={money(balance)} loading={loading} />
        <Stat icon={Package} label="Total Layanan" value={`${services.length || "—"}`} loading={loading} />
        <Stat icon={Globe2} label="Negara" value="76+" />
        <Stat icon={Server} label="Server" value="2 Online" online />
      </div>

      <div className="section-head"><div><span className="eyebrow">QUICK ACTION</span><h3>Mulai sekarang</h3></div></div>
      <div className="quick-grid">
        <Quick icon={Smartphone} title="Beli Nomor" desc="Pilih layanan & negara" onClick={() => setPage("buy")} />
        <Quick icon={Wallet} title="Top Up Saldo" desc="Bayar dengan QRIS" onClick={() => setPage("deposit")} />
        <Quick icon={History} title="Riwayat" desc="Lihat transaksi kamu" onClick={() => setPage("history")} />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, loading, online }) {
  return <div className="stat-card"><div className="stat-icon"><Icon size={20} /></div><div><small>{label}</small><strong>{loading ? "..." : value}</strong>{online && <span className="online"><i /> Active</span>}</div></div>;
}

function Quick({ icon: Icon, title, desc, onClick }) {
  return <button className="quick-card" onClick={onClick}><div className="quick-icon"><Icon size={21} /></div><div><b>{title}</b><span>{desc}</span></div><ChevronRight size={18} /></button>;
}

function BuyNumber() {
  const [services, setServices] = useState([]);
  const [countries, setCountries] = useState([]);
  const [service, setService] = useState("wa");
  const [country, setCountry] = useState("6");
  const [server, setServer] = useState("s2");
  const [operator, setOperator] = useState("");
  const [price, setPrice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [order, setOrder] = useState(null);

  useEffect(() => {
    Promise.all([api("getServices"), api("getCountries")])
      .then(([s, c]) => {
        setServices(s.data || []);
        setCountries(c.data || []);
      })
      .catch((e) => setMessage(e.message));
  }, []);

  const checkPrice = async () => {
    try {
      setMessage("");
      const result = await api("getAvailability", {
        params: { service, country, server }
      });
      setPrice(result.data);
    } catch (e) { setMessage(e.message); }
  };

  useEffect(() => { if (service && country) checkPrice(); }, [service, country, server]);

  const buy = async () => {
    setBusy(true);
    setMessage("");
    setOrder(null);
    try {
      const result = await api("getNumber", {
        method: "POST",
        body: { service, country, operator, server },
        idempotencyKey: `nokos-${Date.now()}-${Math.random().toString(36).slice(2)}`
      });
      setOrder(result.data);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="content">
      <PageTitle eyebrow="PURCHASE" title="Beli Nomor" desc="Pilih layanan, negara, dan server untuk mendapatkan nomor OTP." />
      <div className="buy-layout">
        <div className="panel">
          <div className="panel-head"><div><b>Konfigurasi Pesanan</b><span>Harga & stok diperbarui otomatis</span></div><Zap size={19} /></div>
          <div className="form-grid">
            <label>Layanan
              <select value={service} onChange={(e) => setService(e.target.value)}>
                {services.map((x) => <option key={x.code} value={x.code}>{x.name} ({x.code})</option>)}
                {!services.length && <option value="wa">WhatsApp (wa)</option>}
              </select>
            </label>
            <label>Negara
              <select value={country} onChange={(e) => setCountry(e.target.value)}>
                {countries.map((x) => <option key={x.id} value={x.id}>{x.name} {x.prefix}</option>)}
                {!countries.length && <option value="6">Indonesia +62</option>}
              </select>
            </label>
            <label>Server
              <select value={server} onChange={(e) => setServer(e.target.value)}>
                <option value="s2">Server Plus — s2</option>
                <option value="s1">Server Express — s1</option>
              </select>
            </label>
            <label>Operator <span className="optional">optional</span>
              <input value={operator} onChange={(e) => setOperator(e.target.value)} placeholder="any / telkomsel / indosat / xl" />
            </label>
          </div>
          <div className="availability">
            <div><span>Harga</span><strong>{price?.price != null ? money(price.price) : "—"}</strong></div>
            <div><span>Stok tersedia</span><strong>{price?.available ?? "—"}</strong></div>
            <button className="btn primary" disabled={busy} onClick={buy}>{busy ? "Memproses..." : "Beli Nomor"} <ArrowUpRight size={17} /></button>
          </div>
          {message && <div className="alert error">{message}</div>}
        </div>

        {order && <OrderResult order={order} />}
      </div>
    </div>
  );
}

function OrderResult({ order }) {
  const [status, setStatus] = useState(order?.status || "STATUS_WAIT_CODE");
  const [otp, setOtp] = useState("");
  const [checking, setChecking] = useState(false);

  const check = async () => {
    setChecking(true);
    try {
      const result = await api("getStatus", { params: { id: order.activation_id } });
      setStatus(result.data?.status || "UNKNOWN");
      setOtp(result.data?.code || "");
    } catch {}
    setChecking(false);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      if (status !== "STATUS_OK") check();
    }, 4000);
    return () => clearInterval(timer);
  }, [status, order.activation_id]);

  const setActivationStatus = async (value) => {
    await api("setStatus", { method: "POST", body: { id: order.activation_id, status: value } }).catch(() => {});
    check();
  };

  return (
    <div className="panel order-result">
      <div className="success-badge"><CheckCircle2 size={18} /> Nomor berhasil dipesan</div>
      <span className="eyebrow">ACTIVATION #{order.activation_id}</span>
      <div className="phone-box"><Phone size={21} /><strong>{order.phone}</strong><CopyButton text={order.phone} /></div>
      <div className="order-meta">
        <div><span>Harga</span><b>{money(order.price)}</b></div>
        <div><span>Status</span><b className="status-text">{status}</b></div>
        <div><span>Expired</span><b>{order.expires_at || "—"}</b></div>
      </div>
      <div className={`otp-box ${otp ? "received" : ""}`}>
        <span>OTP CODE</span>
        <strong>{otp || "Menunggu SMS..."}</strong>
        {otp && <CopyButton text={otp} />}
      </div>
      <div className="action-row">
        <button className="btn secondary" onClick={check} disabled={checking}><RefreshCw size={16} className={checking ? "spin" : ""} /> Refresh</button>
        <button className="btn secondary" onClick={() => setActivationStatus(3)}>Request SMS</button>
        <button className="btn danger" onClick={() => setActivationStatus(-1)}>Cancel</button>
        <button className="btn primary" onClick={() => setActivationStatus(6)}>Selesai</button>
      </div>
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return <button className="copy-btn" onClick={() => { navigator.clipboard.writeText(String(text)); setCopied(true); setTimeout(() => setCopied(false), 1200); }}>{copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}</button>;
}

function Activations() {
  return <div className="content"><PageTitle eyebrow="LIVE ACTIVATIONS" title="Aktivasi" desc="Pantau nomor dan OTP yang sedang aktif." /><div className="empty-panel"><MessageSquare size={32} /><b>Aktivasi aktif muncul di sini</b><span>Gunakan halaman Beli Nomor untuk membuat aktivasi baru.</span></div></div>;
}

function Deposit() {
  const [amount, setAmount] = useState("50000");
  const [deposit, setDeposit] = useState(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    const value = Number(amount);
    if (!value || value < 10000 || value > 10000000) {
      setStatus("Nominal harus Rp10.000 sampai Rp10.000.000.");
      return;
    }

    setBusy(true);
    setStatus("");
    try {
      const result = await api("createDeposit", {
        method: "POST",
        body: { amount: value },
        idempotencyKey: `deposit-${Date.now()}`
      });
      setDeposit(result.data);
    } catch (e) {
      setStatus(e.message);
    } finally { setBusy(false); }
  };

  const check = async () => {
    if (!deposit?.transaction_id) return;
    try {
      const result = await api("checkDeposit", { params: { transaction_id: deposit.transaction_id } });
      setDeposit((old) => ({ ...old, ...result.data }));
    } catch (e) { setStatus(e.message); }
  };

  useEffect(() => {
    if (!deposit?.transaction_id || deposit.status === "paid") return;
    const timer = setInterval(check, 5000);
    return () => clearInterval(timer);
  }, [deposit?.transaction_id, deposit?.status]);

  return (
    <div className="content">
      <PageTitle eyebrow="BALANCE" title="Top Up Saldo" desc="Isi saldo NOKOS menggunakan QRIS." />
      <div className="deposit-layout">
        <div className="panel">
          <div className="panel-head"><div><b>Deposit QRIS</b><span>Minimum Rp10.000 · Maksimum Rp10.000.000</span></div><CreditCard size={19} /></div>
          <label>Nominal Top Up
            <div className="money-input"><span>Rp</span><input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} inputMode="numeric" /></div>
          </label>
          <div className="preset-grid">
            {[10000, 25000, 50000, 100000].map((x) => <button key={x} onClick={() => setAmount(String(x))}>{money(x)}</button>)}
          </div>
          <button className="btn primary full" onClick={create} disabled={busy}>{busy ? "Membuat QRIS..." : "Buat QRIS"} <ArrowUpRight size={17} /></button>
          {status && <div className="alert error">{status}</div>}
        </div>

        {deposit && <div className="panel qr-panel">
          <span className="eyebrow">PAYMENT</span>
          <h3>{deposit.status === "paid" ? "Pembayaran berhasil" : "Scan QRIS"}</h3>
          {deposit.qris_url && deposit.status !== "paid" && <img className="qr" src={deposit.qris_url} alt="QRIS pembayaran" />}
          <div className="deposit-info">
            <span>Transaction ID</span><b>{deposit.transaction_id}</b>
            <span>Bayar</span><b>{money(deposit.pay_amount)}</b>
            <span>Status</span><b className={deposit.status === "paid" ? "paid" : ""}>{deposit.status || "pending"}</b>
          </div>
          <button className="btn secondary full" onClick={check}><RefreshCw size={16} /> Cek Status</button>
        </div>}
      </div>
    </div>
  );
}

function HistoryPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const result = await api("getHistory", { params: { limit: 50, offset: 0 } });
      setRows(result.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="content">
      <PageTitle eyebrow="TRANSACTIONS" title="Riwayat Aktivasi" desc="Daftar transaksi nomor virtual kamu." />
      <div className="panel table-panel">
        <div className="table-tools"><div className="search"><Search size={17} /><input placeholder="Cari activation ID / nomor..." /></div><button className="icon-btn" onClick={load}><RefreshCw size={17} /></button></div>
        <div className="table-wrap">
          <table><thead><tr><th>Activation</th><th>Service</th><th>Phone</th><th>Harga</th><th>Status</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan="5" className="center">Memuat...</td></tr> :
              rows.length ? rows.map((r, i) => <tr key={i}><td>#{r.activation_id || r.id || "—"}</td><td>{r.service || "—"}</td><td>{r.phone || "—"}</td><td>{money(r.price || r.cost || 0)}</td><td><span className="pill">{r.status || "—"}</span></td></tr>) :
              <tr><td colSpan="5" className="center">Belum ada riwayat.</td></tr>}
          </tbody></table>
        </div>
      </div>
    </div>
  );
}

function Docs() {
  const endpoint = `curl "https://nokos.co.id/api/?action=getBalance" \\
  -H "X-API-Key: YOUR_API_KEY"`;

  return (
    <div className="content">
      <PageTitle eyebrow="DEVELOPER" title="API Documentation" desc="Gunakan proxy backend NOKOS untuk menjaga API Key tetap aman." />
      <div className="docs-grid">
        <div className="panel">
          <div className="doc-title"><ShieldCheck size={20} /><b>Authentication</b></div>
          <p>Semua request ke API NOKOS menggunakan header <code>X-API-Key</code>. API key asli tidak pernah dikirim dari browser karena request diteruskan melalui Vercel Function.</p>
          <div className="code"><CopyButton text={endpoint} /><pre>{endpoint}</pre></div>
        </div>
        <div className="panel">
          <div className="doc-title"><Server size={20} /><b>Server Selection</b></div>
          <div className="server-doc"><b>s2 · Server Plus</b><span>Default, tarif kompetitif dan stok lengkap.</span></div>
          <div className="server-doc"><b>s1 · Server Express</b><span>Server alternatif untuk membandingkan stok dan response time.</span></div>
        </div>
      </div>
      <div className="panel endpoints">
        <div className="doc-title"><Package size={20} /><b>Endpoints</b></div>
        {["getBalance", "getServices", "getCountries", "getPrices", "getAvailability", "getNumber", "getStatus", "setStatus", "cancelActivation", "getHistory", "createDeposit", "checkDeposit"].map((x) => (
          <div className="endpoint" key={x}><span className={x === "getNumber" || x === "setStatus" || x === "cancelActivation" || x === "createDeposit" ? "method post" : "method"}>{x === "getNumber" || x === "setStatus" || x === "cancelActivation" || x === "createDeposit" ? "POST" : "GET"}</span><b>{x}</b><span>action={x}</span></div>
        ))}
      </div>
    </div>
  );
}

function PageTitle({ eyebrow, title, desc }) {
  return <div className="page-title"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{desc}</p></div>;
}

export default App;
