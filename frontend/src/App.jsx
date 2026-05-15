import './App.css';
import './index.css';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Sidebar } from './components/Sidebar';
import { OverviewTab }          from './components/tabs/OverviewTab';
import { FinancialBehaviorTab } from './components/tabs/FinancialBehaviorTab';
import { EventVolatilityTab }   from './components/tabs/EventVolatilityTab';
import { FraudAnomalyTab }      from './components/tabs/FraudAnomalyTab';
import { StressRepaymentTab }   from './components/tabs/StressRepaymentTab';
import { CohortComparisonTab }  from './components/tabs/CohortComparisonTab';
import { CreditGuidanceTab }    from './components/tabs/CreditGuidanceTab';

const API_BASE = 'https://pbl-0f19.onrender.com';
const ORDER    = ['raju_patil', 'vikram_s', 'meena_devi'];

function sortBorrowers(rows) {
  return [...rows].sort((a, b) => {
    const ai = ORDER.indexOf(a.borrower_id);
    const bi = ORDER.indexOf(b.borrower_id);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

export default function App() {
  const [borrowers, setBorrowers] = useState([]);
  const [selected,  setSelected]  = useState('');
  const [report,    setReport]    = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  /* ── load borrower list once ── */
  useEffect(() => {
    axios.get(`${API_BASE}/borrowers`)
      .then(res => {
        const rows = sortBorrowers(res.data.borrowers || []);
        setBorrowers(rows);
        if (rows.length) setSelected(rows[0].borrower_id);
      })
      .catch(() => {
        setError('Backend not reachable at https://pbl-0f19.onrender.com');
        setLoading(false);
      });
  }, []);

  /* ── load report when selection changes ── */
  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    setError('');
    axios.get(`${API_BASE}/borrower-report/${selected}`)
      .then(res  => setReport(res.data))
      .catch(()  => setError('Could not load borrower report.'))
      .finally(() => setLoading(false));
  }, [selected]);

  const profile = report?.profile || {};

  const TABS = {
    overview:  <OverviewTab          report={report} />,
    financial: <FinancialBehaviorTab report={report} />,
    event:     <EventVolatilityTab   report={report} />,
    fraud:     <FraudAnomalyTab      report={report} />,
    stress:    <StressRepaymentTab   report={report} />,
    cohort:    <CohortComparisonTab  report={report} />,
    credit:    <CreditGuidanceTab    report={report} />,
  };

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* ── Main Panel ── */}
      <div className="main-panel">

        {/* Top Strip */}
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-name-row">
              <span className="topbar-name">{report?.display_name || '—'}</span>
              <span className="id-badge">{selected}</span>
            </div>
            <div className="topbar-meta">
              <span>{profile.occupation || '—'}</span>
              <span className="meta-dot" />
              <span>{profile.city || '—'}</span>
              <span className="meta-dot" />
              <span>{profile.income_band || '—'}</span>
              <span className="meta-dot" />
              <span>Tenure: {profile.tenure || '—'}</span>
            </div>
          </div>

          <div className="topbar-right">
            <div className="topbar-report-info">
              <div className="rid">{profile.report_id || 'Report ID'}</div>
              <div className="rdate">Valid {profile.validity || '30 days'} · {profile.generated_date || '—'}</div>
            </div>
            <div className="divider-v" />
            <select
              className="borrower-select"
              value={selected}
              onChange={e => { setSelected(e.target.value); setActiveTab('overview'); }}
            >
              {borrowers.map(b => (
                <option key={b.borrower_id} value={b.borrower_id}>
                  {b.display_name} — {b.borrower_id}
                </option>
              ))}
            </select>
          </div>
        </header>

        {/* Tab Content */}
        <div className="tab-content">
          {error   ? <div className="error-box">{error}</div>
          : loading || !report ? <div className="loader">Loading GCI Analysis Platform…</div>
          : TABS[activeTab] || null}
        </div>
      </div>
    </div>
  );
}
