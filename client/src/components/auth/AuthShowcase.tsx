export function AuthShowcase() {
  return (
    <aside className="auth-showcase" aria-label="WakePulse service monitoring">
      <div className="auth-showcase-topline">
        <span className="auth-status-pill">
          <span className="auth-status-dot" />
          Global network active
        </span>
        <span className="auth-sla">99.99% target SLA</span>
      </div>

      <div className="auth-network-art" aria-hidden="true">
        <svg viewBox="0 0 520 420" role="presentation">
          <defs>
            <linearGradient id="auth-board" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#153d43" />
              <stop offset="1" stopColor="#101c2d" />
            </linearGradient>
            <linearGradient id="auth-glow" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#0d837c" stopOpacity=".12" />
              <stop offset="1" stopColor="#59f0d1" stopOpacity=".9" />
            </linearGradient>
            <pattern id="auth-circuit" width="42" height="42" patternUnits="userSpaceOnUse">
              <path d="M0 21h12l9-9h21M21 12V0M21 42V30h21" fill="none" stroke="#45d7c1" strokeOpacity=".13" strokeWidth="1" />
              <circle cx="12" cy="21" r="2" fill="#45d7c1" fillOpacity=".24" />
            </pattern>
            <filter id="auth-soft-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="7" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width="520" height="420" fill="#101c2c" />
          <rect width="520" height="420" fill="url(#auth-circuit)" opacity=".62" />
          <path d="M57 256 258 139l205 117-206 121z" fill="url(#auth-board)" stroke="#3ad8c1" strokeOpacity=".48" strokeWidth="2" />
          <path d="m57 256 200 116v-24L57 232zm406 0L257 372v-24l206-116z" fill="#122c36" stroke="#247b79" strokeOpacity=".72" />
          <path d="m83 255 175-101 178 101-178 101z" fill="none" stroke="#37c9b7" strokeOpacity=".27" />
          <path d="m111 255 147-84 150 84-150 85z" fill="none" stroke="#37c9b7" strokeOpacity=".25" />
          <path d="m143 255 115-66 118 66-118 67z" fill="none" stroke="#37c9b7" strokeOpacity=".23" />
          <path d="M258 237v71m-36-51 72 39m-72 0 72-39" stroke="#59f0d1" strokeOpacity=".46" strokeWidth="1.5" />

          <path d="m132 211 29 17v25l-29-17zm226 14 29-17v25l-29 17zm-100-80 26-15v40l-26 15zm-111 123 26 15v29l-26-15zm225 0-26 15v29l26-15z" fill="#142f3a" stroke="#37c9b7" strokeOpacity=".8" />
          <path d="m132 211 29 17v9l-29-17zm226 14 29-17v9l-29 17zm-100-80 26-15v10l-26 15z" fill="#55e9cc" fillOpacity=".65" />

          <path d="M160 226 213 196l29 17 40-74 30 18 43-69" fill="none" stroke="url(#auth-glow)" strokeWidth="5" filter="url(#auth-soft-glow)" />
          <path d="m160 226 53-30 29 17 40-74 30 18 43-69" fill="none" stroke="#64f5da" strokeWidth="2" />
          <circle cx="160" cy="226" r="4" fill="#64f5da" />
          <circle cx="213" cy="196" r="4" fill="#64f5da" />
          <circle cx="242" cy="213" r="4" fill="#64f5da" />
          <circle cx="282" cy="139" r="4" fill="#64f5da" />
          <circle cx="312" cy="157" r="4" fill="#64f5da" />
          <circle cx="355" cy="88" r="5" fill="#9affea" filter="url(#auth-soft-glow)" />

          <path d="M161 253 88 294l-31 18m301-80 73 42 31 18m-171 2 1 70" fill="none" stroke="#39d5c1" strokeDasharray="4 7" strokeOpacity=".8" strokeWidth="2" />
          <circle cx="57" cy="312" r="4" fill="#59f0d1" />
          <circle cx="462" cy="293" r="4" fill="#59f0d1" />
          <circle cx="258" cy="359" r="4" fill="#59f0d1" />

          <ellipse cx="258" cy="252" rx="48" ry="27" fill="#0b373b" stroke="#49e9d0" strokeOpacity=".8" strokeWidth="2" />
          <ellipse cx="258" cy="252" rx="33" ry="18" fill="none" stroke="#49e9d0" strokeOpacity=".55" />
          <text x="258" y="257" fill="#a1ffeb" fontFamily="ui-sans-serif, sans-serif" fontSize="17" fontWeight="700" textAnchor="middle">WP</text>

          <path d="m377 93 37-21 31 18-37 22z" fill="#163944" stroke="#4fe4cb" strokeOpacity=".75" />
          <path d="m386 93 28-16 13 8-28 16z" fill="#4fe4cb" fillOpacity=".3" />
          <path d="m402 115 15 9v15l-15-9z" fill="#142d38" stroke="#4fe4cb" strokeOpacity=".6" />
          <path d="m112 296 29-17 28 16-29 17z" fill="#15343e" stroke="#4fe4cb" strokeOpacity=".65" />
        </svg>
      </div>

      <div className="auth-showcase-copy">
        <h2>Keep your services alive and responsive</h2>
        <p>
          Automated HTTP health checks, periodic synthetic pings, and real-time
          uptime monitoring to ensure 100% availability for your cloud workloads
          and APIs.
        </p>
      </div>

      <div className="auth-showcase-footer">
        <span><span className="auth-status-dot" />Multi-region synthetic ping</span>
        <span className="auth-mono">Zero Cold Starts</span>
      </div>
    </aside>
  )
}
