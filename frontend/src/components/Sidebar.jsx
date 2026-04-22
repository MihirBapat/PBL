const TABS = [
  { id: 'overview',  label: 'Overview',               icon: '⊞'  },
  { id: 'financial', label: 'Financial Behavior',      icon: '↗'  },
  { id: 'event',     label: 'Event Volatility (CVD)', icon: '▦'  },
  { id: 'fraud',     label: 'Fraud & Anomaly',         icon: '⚑'  },
  { id: 'stress',    label: 'Stress & Repayment',      icon: '⚡'  },
  { id: 'cohort',    label: 'Cohort Comparison',       icon: '⊕'  },
  { id: 'credit',    label: 'Credit Guidance',         icon: '✔'  },
];

export function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">CX</div>
        <span className="brand-name">CreditX</span>
      </div>
      <nav className="sidebar-nav">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="nav-icon" style={{ fontSize: '16px', display: 'inline-block', textAlign: 'center' }}>
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        CreditX — Gig Credit Intelligence<br />
        v2.0 — Lender Analytics
      </div>
    </aside>
  );
}
