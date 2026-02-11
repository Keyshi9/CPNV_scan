import './globals.css';

export const metadata = {
  title: 'CPNV Scan — Blockchain Explorer',
  description: 'Explorateur de blocs pour la blockchain privée Ethereum CPNV (Chain ID 32383)',
  icons: {
    icon: '/cpnv-logo.png',
    shortcut: '/cpnv-logo.png',
    apple: '/cpnv-logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="min-h-screen flex flex-col">
        {/* ---- Navbar ---- */}
        <nav className="navbar">
          <div className="max-w-7xl mx-auto px-4 w-full flex items-center justify-between">
            {/* CPNV Logo */}
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <img src="/cpnv-logo.png" alt="CPNV" style={{ height: 28 }} />
              <span style={{ fontSize: 16, fontWeight: 700, color: '#1e2022', letterSpacing: '-0.01em' }}>
                CPNV<span style={{ color: '#00a650' }}>Scan</span>
              </span>
            </a>

            {/* Nav Links */}
            <div className="nav-links hidden md:flex">
              <a href="/">Home</a>
              <a href="/blocks">Blocks</a>
              <a href="/transactions">Transactions</a>
              <a href="/tokens">Tokens</a>
            </div>
          </div>
        </nav>

        {/* ---- Content ---- */}
        <main className="flex-grow">{children}</main>

        {/* ---- Footer ---- */}
        <footer style={{ borderTop: '1px solid var(--border-color)', background: 'var(--bg-white)', marginTop: 48 }} className="py-6">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              CPNV Scan © {new Date().getFullYear()} | Ethereum CPNV · Chain ID 32383
            </p>
            <p style={{ color: 'var(--text-light)', fontSize: 11, marginTop: 4 }}>
              Centre professionnel du Nord vaudois — RPC: 10.229.43.182:8545
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
