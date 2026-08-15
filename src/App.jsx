import { useEffect, useMemo, useState } from "react";
import {
  Menu,
  X,
  ShoppingCart,
  Wallet,
  Package,
  RefreshCw,
  CheckCircle2,
  Clock3,
  Copy,
  Search,
  Server,
  Smartphone,
  ShieldCheck,
  Zap,
  Ban,
  ChevronDown,
  Globe2,
  Activity,
  ArrowRight,
  CircleDollarSign,
} from "lucide-react";

import "./style.css";

const formatRupiah = (value) => {
  const number = Number(value || 0);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);
};

const api = async (url, options = {}) => {
  const response = await fetch(url, options);

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Server mengembalikan response tidak valid (${response.status})`
    );
  }

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message ||
        data.error ||
        `Request gagal (${response.status})`
    );
  }

  return data;
};

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const [services, setServices] = useState([]);
  const [countries, setCountries] = useState([]);

  const [service, setService] = useState("wa");
  const [country, setCountry] = useState("6");
  const [server, setServer] = useState("s2");
  const [operator, setOperator] = useState("");

  const [price, setPrice] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  const [ordering, setOrdering] = useState(false);
  const [order, setOrder] = useState(null);

  const [status, setStatus] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const [balance, setBalance] = useState(null);

  const [search, setSearch] = useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // =========================
  // LOAD SERVICES + COUNTRIES
  // =========================

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      setError("");

      const [servicesRes, countriesRes] = await Promise.all([
        api("/api/services"),
        api("/api/countries"),
      ]);

      setServices(servicesRes.data || []);
      setCountries(countriesRes.data || []);

      if (!service && servicesRes.data?.length) {
        setService(servicesRes.data[0].code);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  // =========================
  // LOAD BALANCE
  // =========================

  async function loadBalance() {
    try {
      const result = await api("/api/balance");

      setBalance(result.data?.balance ?? 0);
    } catch {
      setBalance(null);
    }
  }

  useEffect(() => {
    loadBalance();
  }, []);

  // =========================
  // LOAD PRICE
  // =========================

  async function loadPrice() {
    if (!service || !country) return;

    try {
      setLoadingPrice(true);
      setError("");

      const result = await api(
        `/api/prices?service=${encodeURIComponent(
          service
        )}&country=${encodeURIComponent(
          country
        )}&server=${encodeURIComponent(server)}`
      );

      const countryData =
        result.data?.[String(country)] ||
        result.data?.[country] ||
        {};

      const serviceData = countryData?.[service];

      if (!serviceData) {
        setPrice(null);
        return;
      }

      setPrice(serviceData);
    } catch (err) {
      setPrice(null);
      setError(err.message);
    } finally {
      setLoadingPrice(false);
    }
  }

  useEffect(() => {
    loadPrice();
  }, [service, country, server]);

  // =========================
  // ORDER NUMBER
  // =========================

  async function buyNumber() {
    if (!service) {
      setError("Pilih layanan terlebih dahulu.");
      return;
    }

    try {
      setOrdering(true);
      setError("");
      setNotice("");
      setOrder(null);
      setStatus(null);

      const result = await api("/api/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service,
          country,
          operator,
          server,
        }),
      });

      setOrder(result.data);

      setNotice("Nomor berhasil dipesan.");

      loadBalance();
    } catch (err) {
      setError(err.message);
    } finally {
      setOrdering(false);
    }
  }

  // =========================
  // CHECK STATUS
  // =========================

  async function checkStatus(showLoading = true) {
    if (!order?.activation_id) return;

    try {
      if (showLoading) setCheckingStatus(true);

      const result = await api(
        `/api/status?id=${encodeURIComponent(
          order.activation_id
        )}`
      );

      setStatus(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      if (showLoading) setCheckingStatus(false);
    }
  }

  // =========================
  // AUTO POLLING OTP
  // =========================

  useEffect(() => {
    if (!order?.activation_id) return;

    if (status?.status === "STATUS_OK") return;

    const timer = setInterval(() => {
      checkStatus(false);
    }, 4000);

    return () => clearInterval(timer);
  }, [order?.activation_id, status?.status]);

  // =========================
  // COPY
  // =========================

  async function copyText(text) {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(String(text));
      setNotice("Berhasil disalin.");
    } catch {
      setError("Tidak bisa menyalin otomatis.");
    }
  }

  // =========================
  // RESET ORDER
  // =========================

  function newOrder() {
    setOrder(null);
    setStatus(null);
    setNotice("");
    setError("");
  }

  // =========================
  // SEARCH SERVICES
  // =========================

  const filteredServices = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return services;

    return services.filter((item) => {
      return (
        String(item.name || "")
          .toLowerCase()
          .includes(keyword) ||
        String(item.code || "")
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [services, search]);

  const selectedService = services.find(
    (item) => item.code === service
  );

  const selectedCountry = countries.find(
    (item) => String(item.id) === String(country)
  );

  // =========================
  // SERVICE CARD
  // =========================

  const quickServices = [
    {
      code: "wa",
      name: "WhatsApp",
      icon: "W",
    },
    {
      code: "tg",
      name: "Telegram",
      icon: "T",
    },
    {
      code: "oi",
      name: "Tinder",
      icon: "O",
    },
  ];

  return (
    <div className="app-shell">

      {/* =========================
          SIDEBAR
      ========================= */}

      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>

        <div className="side-brand">
          <div className="brand-mark">N</div>

          <div>
            <strong>NOKOS</strong>
            <small>OTP STORE</small>
          </div>

          <button
            className="sidebar-close"
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="side-label">
          MENU
        </div>

        <nav>
          <button
            className="active"
            onClick={() => {
              document
                .getElementById("home")
                ?.scrollIntoView({ behavior: "smooth" });

              setMobileOpen(false);
            }}
          >
            <Package size={17} />
            <span>Beranda</span>
          </button>

          <button
            onClick={() => {
              document
                .getElementById("buy")
                ?.scrollIntoView({ behavior: "smooth" });

              setMobileOpen(false);
            }}
          >
            <ShoppingCart size={17} />
            <span>Beli Nomor</span>
          </button>

          <button
            onClick={() => {
              document
                .getElementById("services")
                ?.scrollIntoView({ behavior: "smooth" });

              setMobileOpen(false);
            }}
          >
            <Smartphone size={17} />
            <span>Layanan</span>
          </button>

          <button
            onClick={() => {
              document
                .getElementById("order")
                ?.scrollIntoView({ behavior: "smooth" });

              setMobileOpen(false);
            }}
          >
            <Activity size={17} />
            <span>Pesanan</span>
          </button>
        </nav>

        <div className="side-label">
          STATUS
        </div>

        <div className="side-status">
          <span className="status-dot" />

          <div>
            <b>Server Online</b>
            <span>NOKOS API aktif</span>
          </div>
        </div>

        <div className="sidebar-footer">
          <ShieldCheck size={14} />
          <span>Secure API Gateway</span>
        </div>

      </aside>

      {/* MOBILE OVERLAY */}

      {mobileOpen && (
        <div
          className="overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* =========================
          MAIN
      ========================= */}

      <main className="main">

        {/* TOPBAR */}

        <header className="topbar">

          <button
            className="mobile-menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={22} />
          </button>

          <div className="top-title">
            <span>PUBLIC STORE</span>
            <h2>NOKOS Store</h2>
          </div>

          <div className="top-actions">

            <button
              className="icon-btn"
              onClick={() => {
                loadPrice();
                loadBalance();
              }}
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>

            <div className="balance-mini">
              <Wallet size={15} />

              <div>
                <small>Saldo API</small>

                <b>
                  {balance === null
                    ? "—"
                    : formatRupiah(balance)}
                </b>
              </div>
            </div>

          </div>

        </header>

        <div className="content">

          {/* =========================
              HERO
          ========================= */}

          <section id="home" className="hero-card">

            <div className="hero-content">

              <span className="eyebrow">
                NOMOR OTP INSTANT
              </span>

              <h1>
                Nomor virtual
                <br />
                <span>cepat & murah.</span>
              </h1>

              <p>
                Dapatkan nomor virtual untuk WhatsApp,
                Telegram, dan berbagai layanan lainnya.
                Harga transparan dengan stok real-time.
              </p>

              <div className="hero-buttons">

                <button
                  className="btn primary"
                  onClick={() =>
                    document
                      .getElementById("buy")
                      ?.scrollIntoView({
                        behavior: "smooth",
                      })
                  }
                >
                  <ShoppingCart size={16} />
                  Beli Nomor
                  <ArrowRight size={15} />
                </button>

                <button
                  className="btn secondary"
                  onClick={() =>
                    document
                      .getElementById("services")
                      ?.scrollIntoView({
                        behavior: "smooth",
                      })
                  }
                >
                  Lihat Layanan
                </button>

              </div>

            </div>

            <div className="hero-orb">
              <div className="orb-inner">
                <Zap size={48} />
              </div>
            </div>

          </section>

          {/* =========================
              STATS
          ========================= */}

          <section className="stats-grid">

            <div className="stat-card">
              <div className="stat-icon">
                <Smartphone size={19} />
              </div>

              <div>
                <small>Layanan</small>
                <strong>
                  {services.length || "478+"}
                </strong>
                <span className="online">
                  <i /> Tersedia
                </span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <Globe2 size={19} />
              </div>

              <div>
                <small>Negara</small>
                <strong>
                  {countries.length || "76+"}
                </strong>
                <span className="online">
                  <i /> Support
                </span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <Server size={19} />
              </div>

              <div>
                <small>Server</small>
                <strong>2</strong>
                <span className="online">
                  <i /> Online
                </span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <ShieldCheck size={19} />
              </div>

              <div>
                <small>Status</small>
                <strong>ONLINE</strong>
                <span className="online">
                  <i /> API Connected
                </span>
              </div>
            </div>

          </section>

          {/* =========================
              QUICK SERVICES
          ========================= */}

          <section id="services">

            <div className="section-head">
              <span className="eyebrow">
                POPULAR
              </span>

              <h3>Layanan Populer</h3>
            </div>

            <div className="quick-grid">

              {quickServices.map((item) => {

                const serviceExists = services.find(
                  (x) => x.code === item.code
                );

                return (
                  <button
                    key={item.code}
                    className="quick-card"
                    onClick={() => {
                      setService(item.code);

                      document
                        .getElementById("buy")
                        ?.scrollIntoView({
                          behavior: "smooth",
                        });
                    }}
                  >

                    <div className="quick-icon">
                      {item.icon}
                    </div>

                    <div>
                      <b>
                        {serviceExists?.name ||
                          item.name}
                      </b>

                      <span>
                        {serviceExists
                          ? "Tersedia sekarang"
                          : "Pilih untuk mengecek"}
                      </span>
                    </div>

                    <ArrowRight size={15} />

                  </button>
                );
              })}

            </div>

          </section>

          {/* =========================
              BUY PANEL
          ========================= */}

          <section id="buy" className="buy-section">

            <div className="page-title">

              <span className="eyebrow">
                PURCHASE
              </span>

              <h1>Beli Nomor</h1>

              <p>
                Pilih layanan, negara dan server.
                Harga serta stok akan diperbarui
                secara real-time.
              </p>

            </div>

            <div className="buy-layout">

              {/* FORM */}

              <div className="panel">

                <div className="panel-head">

                  <div>
                    <b>Konfigurasi Nomor</b>
                    <span>
                      Tentukan nomor yang ingin kamu beli
                    </span>
                  </div>

                  <ShoppingCart size={19} />

                </div>

                <div className="form-grid">

                  {/* SERVICE */}

                  <label>
                    Layanan

                    <div className="select-wrap">

                      <select
                        value={service}
                        onChange={(e) =>
                          setService(e.target.value)
                        }
                      >
                        {services.length === 0 ? (
                          <option value="">
                            Memuat layanan...
                          </option>
                        ) : (
                          services.map((item) => (
                            <option
                              key={item.code}
                              value={item.code}
                            >
                              {item.name} ({item.code})
                            </option>
                          ))
                        )}
                      </select>

                      <ChevronDown size={14} />

                    </div>
                  </label>

                  {/* COUNTRY */}

                  <label>
                    Negara

                    <div className="select-wrap">

                      <select
                        value={country}
                        onChange={(e) =>
                          setCountry(e.target.value)
                        }
                      >
                        {countries.length === 0 ? (
                          <option value="6">
                            Memuat negara...
                          </option>
                        ) : (
                          countries.map((item) => (
                            <option
                              key={item.id}
                              value={item.id}
                            >
                              {item.name}{" "}
                              {item.prefix
                                ? `(${item.prefix})`
                                : ""}
                            </option>
                          ))
                        )}
                      </select>

                      <ChevronDown size={14} />

                    </div>
                  </label>

                  {/* SERVER */}

                  <label>
                    Server

                    <div className="select-wrap">

                      <select
                        value={server}
                        onChange={(e) =>
                          setServer(e.target.value)
                        }
                      >
                        <option value="s2">
                          Server Plus · s2
                        </option>

                        <option value="s1">
                          Server Express · s1
                        </option>
                      </select>

                      <ChevronDown size={14} />

                    </div>
                  </label>

                  {/* OPERATOR */}

                  <label>
                    Operator{" "}
                    <span className="optional">
                      Optional
                    </span>

                    <input
                      value={operator}
                      onChange={(e) =>
                        setOperator(e.target.value)
                      }
                      placeholder="any / telkomsel / xl"
                    />
                  </label>

                </div>

                {/* AVAILABILITY */}

                <div className="availability">

                  <div>
                    <span>Harga API</span>

                    <strong>
                      {loadingPrice
                        ? "..."
                        : formatRupiah(
                            price?.api_price
                          )}
                    </strong>
                  </div>

                  <div>
                    <span>Harga Jual</span>

                    <strong className="sell-price">
                      {loadingPrice
                        ? "..."
                        : formatRupiah(
                            price?.sell_price
                          )}
                    </strong>
                  </div>

                  <button
                    className="btn primary"
                    disabled={
                      ordering ||
                      !price ||
                      Number(price.stock) <= 0
                    }
                    onClick={buyNumber}
                  >
                    {ordering ? (
                      <>
                        <RefreshCw
                          size={15}
                          className="spin"
                        />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <ShoppingCart size={15} />
                        Beli Nomor
                      </>
                    )}
                  </button>

                </div>

                {price && (
                  <div className="price-info">

                    <span>
                      Markup
                    </span>

                    <b>
                      {formatRupiah(
                        price.markup
                      )}
                    </b>

                    <span>
                      Stok
                    </span>

                    <b>
                      {Number(
                        price.stock || 0
                      ).toLocaleString(
                        "id-ID"
                      )}
                    </b>

                  </div>
                )}

                {error && (
                  <div className="alert error">
                    {error}
                  </div>
                )}

                {notice && (
                  <div className="alert success">
                    <CheckCircle2 size={14} />
                    {notice}
                  </div>
                )}

              </div>

              {/* INFO */}

              <div className="panel order-info-panel">

                <div className="panel-head">

                  <div>
                    <b>
                      Informasi Pembelian
                    </b>

                    <span>
                      Harga otomatis dari API
                    </span>
                  </div>

                  <CircleDollarSign
                    size={19}
                  />

                </div>

                <div className="info-list">

                  <div>
                    <span>Service</span>
                    <b>
                      {selectedService?.name ||
                        service ||
                        "-"}
                    </b>
                  </div>

                  <div>
                    <span>Negara</span>
                    <b>
                      {selectedCountry?.name ||
                        "-"}
                    </b>
                  </div>

                  <div>
                    <span>Server</span>
                    <b>
                      {server === "s2"
                        ? "Plus · s2"
                        : "Express · s1"}
                    </b>
                  </div>

                  <div>
                    <span>Harga API</span>
                    <b>
                      {formatRupiah(
                        price?.api_price
                      )}
                    </b>
                  </div>

                  <div>
                    <span>Markup</span>
                    <b>
                      {formatRupiah(
                        price?.markup
                      )}
                    </b>
                  </div>

                  <div className="total-row">
                    <span>
                      Harga pelanggan
                    </span>

                    <b>
                      {formatRupiah(
                        price?.sell_price
                      )}
                    </b>
                  </div>

                </div>

                <div className="secure-note">
                  <ShieldCheck size={15} />

                  <span>
                    API key tidak pernah dikirim
                    ke browser pelanggan.
                  </span>
                </div>

              </div>

            </div>

          </section>

          {/* =========================
              ORDER RESULT
          ========================= */}

          {order && (
            <section
              id="order"
              className="order-section"
            >

              <div className="page-title">

                <span className="eyebrow">
                  ACTIVATION
                </span>

                <h1>Pesanan Kamu</h1>

                <p>
                  Pantau status nomor dan tunggu
                  kode OTP masuk.
                </p>

              </div>

              <div className="panel order-result">

                <div className="success-badge">
                  <CheckCircle2 size={14} />
                  Nomor berhasil dipesan
                </div>

                <span className="eyebrow">
                  NOMOR TELEPON
                </span>

                <div className="phone-box">

                  <Smartphone size={20} />

                  <strong>
                    +{String(
                      order.phone || ""
                    ).replace(/^\\+/, "")}
                  </strong>

                  <button
                    className="copy-btn"
                    onClick={() =>
                      copyText(
                        `+${String(
                          order.phone || ""
                        ).replace(/^\\+/, "")}`
                      )
                    }
                    title="Copy nomor"
                  >
                    <Copy size={15} />
                  </button>

                </div>

                <div className="order-meta">

                  <div>
                    <span>
                      Activation ID
                    </span>

                    <b>
                      {order.activation_id}
                    </b>
                  </div>

                  <div>
                    <span>
                      Layanan
                    </span>

                    <b>
                      {selectedService?.name ||
                        service}
                    </b>
                  </div>

                  <div>
                    <span>
                      Negara
                    </span>

                    <b>
                      {selectedCountry?.name ||
                        country}
                    </b>
                  </div>

                  <div>
                    <span>
                      Harga
                    </span>

                    <b>
                      {formatRupiah(
                        order.price
                      )}
                    </b>
                  </div>

                  <div>
                    <span>
                      Expired
                    </span>

                    <b>
                      {order.expires_at ||
                        "-"}
                    </b>
                  </div>

                  <div>
                    <span>
                      Status
                    </span>

                    <b className="status-text">
                      {status?.status ||
                        "STATUS_WAIT_CODE"}
                    </b>
                  </div>

                </div>

                {/* OTP */}

                <div
                  className={`otp-box ${
                    status?.status ===
                    "STATUS_OK"
                      ? "received"
                      : ""
                  }`}
                >

                  <span>
                    VERIFICATION CODE
                  </span>

                  <strong>
                    {status?.code ||
                      "— — — — — —"}
                  </strong>

                  {status?.code && (
                    <button
                      className="copy-btn"
                      onClick={() =>
                        copyText(
                          status.code
                        )
                      }
                    >
                      <Copy size={14} />
                    </button>
                  )}

                </div>

                {status?.sms && (
                  <div className="sms-box">
                    <span>SMS</span>
                    <p>
                      {status.sms}
                    </p>
                  </div>
                )}

                <div className="action-row">

                  <button
                    className="btn primary"
                    onClick={() =>
                      checkStatus(true)
                    }
                    disabled={
                      checkingStatus
                    }
                  >
                    <RefreshCw
                      size={14}
                      className={
                        checkingStatus
                          ? "spin"
                          : ""
                      }
                    />

                    {checkingStatus
                      ? "Mengecek..."
                      : "Cek OTP"}
                  </button>

                  <button
                    className="btn secondary"
                    onClick={newOrder}
                  >
                    <ShoppingCart size={14} />
                    Nomor Baru
                  </button>

                </div>

              </div>

            </section>
          )}

          {/* =========================
              SERVICE LIST
          ========================= */}

          <section className="services-section">

            <div className="section-head service-heading">

              <div>
                <span className="eyebrow">
                  CATALOG
                </span>

                <h3>
                  Semua Layanan
                </h3>
              </div>

              <div className="search">

                <Search size={14} />

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  placeholder="Cari layanan..."
                />

              </div>

            </div>

            <div className="service-list">

              {filteredServices
                .slice(0, 100)
                .map((item) => {

                  const active =
                    item.code === service;

                  return (
                    <button
                      key={item.code}
                      className={`service-item ${
                        active
                          ? "selected"
                          : ""
                      }`}
                      onClick={() => {
                        setService(
                          item.code
                        );

                        document
                          .getElementById(
                            "buy"
                          )
                          ?.scrollIntoView({
                            behavior:
                              "smooth",
                          });
                      }}
                    >

                      <div className="service-icon">
                        <Smartphone
                          size={16}
                        />
                      </div>

                      <div>
                        <b>
                          {item.name}
                        </b>

                        <span>
                          {item.code}
                        </span>
                      </div>

                      <ArrowRight
                        size={14}
                      />

                    </button>
                  );
                })}

              {filteredServices.length ===
                0 && (
                <div className="center">
                  Tidak ada layanan ditemukan.
                </div>
              )}

            </div>

          </section>

          {/* FOOTER */}

          <footer className="footer">

            <div className="footer-brand">

              <div className="brand-mark">
                N
              </div>

              <div>
                <b>NOKOS STORE</b>
                <span>
                  Virtual Number Platform
                </span>
              </div>

            </div>

            <div>
              © {new Date().getFullYear()} NOKOS
              Store
            </div>

          </footer>

        </div>
      </main>
    </div>
  );
}

export default App;
