import './index.css';
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const API_BASE = 'http://127.0.0.1:8000';
const ORDER = ['raju_patil', 'vikram_s', 'meena_devi'];
const COLORS = ['#1d9e75', '#185fa5', '#e24b4a'];

function sortBorrowers(rows) {
  return [...rows].sort((a, b) => {
    const ai = ORDER.indexOf(a.borrower_id);
    const bi = ORDER.indexOf(b.borrower_id);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

function money(value) {
  if (value === null || value === undefined) return 'N/A';
  return `Rs ${Number(value).toLocaleString('en-IN')}`;
}

function pct(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function scoreClass(value) {
  if (value >= 70) return 'green';
  if (value >= 50) return 'amber';
  return 'red';
}

function riskClass(label) {
  if (label === 'Clean' || label === 'approve') return 'green';
  if (label === 'Suspicious' || label === 'conditional') return 'amber';
  return 'red';
}

function buildTemporalRows(report) {
  const temporal = report?.temporal || {};
  return (temporal.raw || []).map((raw, index) => ({
    month: `M${index + 1}`,
    raw,
    trend: temporal.trend?.[index] || 0,
    seasonal: temporal.seasonal?.[index] || 0,
    residual: temporal.residual?.[index] || 0,
    flagged: report.timeline?.[index]?.flagged,
  }));
}

export default function App() {
  const [borrowers, setBorrowers] = useState([]);
  const [selected, setSelected] = useState('');
  const [report, setReport] = useState(null);
  const [tab, setTab] = useState('risk');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBorrowers() {
      try {
        const response = await axios.get(`${API_BASE}/borrowers`);
        const rows = sortBorrowers(response.data.borrowers || []);
        setBorrowers(rows);
        setSelected(rows[0]?.borrower_id || '');
      } catch {
        setError('Backend is not reachable at http://127.0.0.1:8000.');
        setLoading(false);
      }
    }
    loadBorrowers();
  }, []);

  useEffect(() => {
    if (!selected) return;
    async function loadReport() {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(`${API_BASE}/borrower-report/${selected}`);
        setReport(response.data);
      } catch {
        setError('Could not load borrower report from backend.');
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [selected]);

  const temporalRows = useMemo(() => buildTemporalRows(report), [report]);
  const varianceRows = useMemo(() => {
    const variance = report?.variance || {};
    return [
      { name: 'Festival/seasonal', value: variance.festival || 0 },
      { name: 'Weekly cycles', value: variance.weekly || 0 },
      { name: 'Residual risk', value: variance.residual || 0 },
    ];
  }, [report]);
  const gaugeData = useMemo(
    () => [{ name: 'Anomaly', value: Math.round((report?.score?.anomaly_score || 0) * 100), fill: report?.score?.anomaly_score > 0.8 ? '#b91c1c' : report?.score?.anomaly_score > 0.65 ? '#b45309' : '#15803d' }],
    [report],
  );

  if (!report && loading) {
    return <main className="loading">Loading GCI report...</main>;
  }

  const score = report?.score || {};
  const profile = report?.profile || {};
  const components = report?.components || {};
  const recommendation = report?.recommendation || { rows: [] };
  const reportTitle = `${profile.report_id || 'GCI report'} - Valid ${profile.validity || '30 days'}`;

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-dot" />
          <span>GCI - Gig Cashflow Index</span>
        </div>
        <div className="topbar-right">
          <select value={selected} onChange={(event) => setSelected(event.target.value)}>
            {borrowers.map((borrower) => (
              <option key={borrower.borrower_id} value={borrower.borrower_id}>
                {borrower.display_name}
              </option>
            ))}
          </select>
          <span>{reportTitle}</span>
        </div>
      </header>

      <nav className="tabs">
        <button className={tab === 'risk' ? 'active' : ''} onClick={() => setTab('risk')}>Risk & Anomaly Analysis</button>
        <button className={tab === 'temporal' ? 'active' : ''} onClick={() => setTab('temporal')}>Temporal Analysis & Lender Report</button>
      </nav>

      {error && <div className="error">{error}</div>}

      {tab === 'risk' && (
        <section className="content">
          <div className="grid4">
            <article className="card score-card-wide">
              <div className="card-title">GCI Score</div>
              <div className="score-hero">
                <div>
                  <div className={`score-num ${score.color}`}>{score.gci}</div>
                  <div className="muted">{score.band} - Valid {profile.validity}</div>
                </div>
                <div className="score-track"><span style={{ width: `${Math.round(((score.gci || 300) - 300) / 6)}%` }} /></div>
              </div>
            </article>
            <Metric title="Avg Net Monthly Income" value={profile.avg_net_monthly_income} sub={`${profile.income_band} - ${profile.tenure}`} />
            <Metric title="Probability of Default" value={pct(score.pd)} className={riskClass(score.manipulation)} sub="XGBoost demo output" />
            <Metric title="Cohort Percentile" value={`${score.cohort_percentile}th`} sub={`${profile.occupation} - ${profile.tier}`} />
          </div>

          <div className="grid4">
            {Object.entries(components).map(([key, value]) => (
              <ScoreMetric key={key} title={key.replace('_', ' ')} value={value} />
            ))}
          </div>

          <div className="banner-row">
            <div className={`banner ${riskClass(score.manipulation)}`}>
              {score.manipulation.toUpperCase()} - Isolation Forest anomaly score {Number(score.anomaly_score).toFixed(2)}. Penalty multiplier {score.penalty}.
            </div>
          </div>

          <div className="grid3">
            <article className="card">
              <div className="card-title">Manipulation Flags</div>
              <div className="flag-list">
                {(report.flags?.items || []).map((flag) => (
                  <div className="flag-row" key={flag.code}>
                    <span className={`dot ${flag.ok ? 'green' : 'red'}`} />
                    <div>
                      <strong>{flag.name}</strong>
                      <small>{flag.reason}</small>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="card">
              <div className="card-title">Anomaly Score Gauge</div>
              <div className="gauge">
                <ResponsiveContainer width="100%" height={190}>
                  <RadialBarChart innerRadius="70%" outerRadius="100%" startAngle={180} endAngle={0} data={gaugeData}>
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar dataKey="value" cornerRadius={5} background={{ fill: '#eceae5' }} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <strong>{Number(score.anomaly_score).toFixed(2)}</strong>
              </div>
            </article>

            <article className="card">
              <div className="card-title">Monthly Income - Anomaly Overlay</div>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={temporalRows}>
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v) => money(v)} />
                  <Bar dataKey="raw" radius={[3, 3, 0, 0]}>
                    {temporalRows.map((row) => (
                      <Cell key={row.month} fill={row.flagged ? '#e24b4a' : '#1d9e75'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </article>
          </div>

          <div className="grid2">
            <article className="card">
              <div className="card-title">Expense Signature</div>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={report.expenses || []}>
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v) => money(v)} />
                  <Legend />
                  <Bar dataKey="recurring" stackId="a" fill="#185fa5" name="Recurring" />
                  <Bar dataKey="variable" stackId="a" fill="#b4b2a9" name="Variable" />
                </BarChart>
              </ResponsiveContainer>
            </article>
            <Recommendation recommendation={recommendation} />
          </div>
        </section>
      )}

      {tab === 'temporal' && (
        <section className="content">
          <ReportHeader report={report} />

          <article className="card section">
            <div className="section-head">
              <div className="card-title">Section 1 - Borrower Credit Profile</div>
              <span className="pill">Cohort percentile {score.cohort_percentile}th</span>
            </div>
            <div className="grid4">
              {Object.entries(components).map(([key, value]) => (
                <ScoreMetric key={key} title={key.replace('_', ' ')} value={value} />
              ))}
            </div>
            <div className="cohort">
              <div className="cohort-fill" style={{ width: `${score.cohort_percentile}%` }} />
              <div className="cohort-marker" style={{ left: `${score.cohort_percentile}%` }} />
            </div>
            <p className="muted">Income trend: <strong>{report.trend?.slope}</strong> ({report.trend?.direction}).</p>
          </article>

          <article className="card section">
            <div className="section-head">
              <div className="card-title">Section 2 - Temporal Income Analysis</div>
              <span className="pill">CVD Framework</span>
            </div>
            <div className="grid2">
              <ChartCard title="Income decomposition - raw / seasonal / residual">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={temporalRows}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(v) => money(v)} />
                    <Legend />
                    <Line dataKey="raw" stroke="#185fa5" strokeWidth={2} dot={false} name="Raw income" />
                    <Line dataKey="trend" stroke="#888780" strokeDasharray="5 4" dot={false} name="Trend" />
                    <Line dataKey="seasonal" stroke="#1d9e75" dot={false} name="Seasonal" />
                    <Line dataKey="residual" stroke="#e24b4a" dot={false} name="Residual" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Variance attribution - CVD breakdown">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={varianceRows} innerRadius={68} outerRadius={96} dataKey="value" paddingAngle={3}>
                      {varianceRows.map((entry, index) => <Cell key={entry.name} fill={COLORS[index]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
            <div className={`cvd-note ${riskClass(score.manipulation)}`}>{report.cvd_note}</div>
            <div className="event-row">
              {(report.events || []).map((event) => (
                <div className={`event ${event.status}`} key={event.name}>
                  <strong>{event.name}</strong>
                  <span>{event.pct}</span>
                  <small>{event.note}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="card section">
            <div className="section-head">
              <div className="card-title">Section 3 - Income Trend & Liquidity Buffer</div>
            </div>
            <div className="grid2">
              <ChartCard title="12-month income with trend line">
                <ResponsiveContainer width="100%" height={230}>
                  <LineChart data={temporalRows}>
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(v) => money(v)} />
                    <Line dataKey="raw" stroke="#185fa5" strokeWidth={2} dot={false} />
                    <Line dataKey="trend" stroke="#888780" strokeDasharray="5 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="End-of-month balance - liquidity cover">
                <ResponsiveContainer width="100%" height={230}>
                  <ComposedChart data={report.liquidity || []}>
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(v) => money(v)} />
                    <Bar dataKey="balance" fill="#1d9e75" name="Balance" />
                    <Line dataKey="floor" stroke="#e24b4a" name="Risk floor" />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </article>

          <article className="card section">
            <div className="section-head">
              <div className="card-title">Section 4 - Stress Simulation (Monte Carlo - 500 runs)</div>
            </div>
            <div className="grid3 compact">
              {(report.stress || []).map((row) => (
                <div className="stress-card" key={row.scenario}>
                  <span>{row.scenario}</span>
                  <strong className={scoreClass(row.repayment_probability)}>{row.repayment_probability}%</strong>
                  <small>repayment probability</small>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={report.stress || []}>
                <XAxis dataKey="scenario" />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => `${v}% repayment probability`} />
                <Bar dataKey="repayment_probability" radius={[4, 4, 0, 0]}>
                  {(report.stress || []).map((row) => <Cell key={row.scenario} fill={row.repayment_probability >= 70 ? '#15803d' : row.repayment_probability >= 50 ? '#b45309' : '#b91c1c'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="muted">Simulation is served by the backend demo report payload and models normal, 25% drop, and 40% drop income paths.</p>
          </article>

          <article className="card section">
            <div className="section-head">
              <div className="card-title">Section 5 - Feature Importance (SHAP Explainability)</div>
              <span className="pill">RBI compliant explanation layer</span>
            </div>
            <div className="shap-list">
              {(report.shap || []).map((item) => (
                <div className="shap-row" key={item.label}>
                  <span>{item.label}</span>
                  <div className="shap-track"><i style={{ width: `${item.value}%` }} className={item.positive ? 'pos' : 'neg'} /></div>
                  <strong className={item.positive ? 'green' : 'red'}>{item.positive ? '+' : '-'}{item.value} pts</strong>
                </div>
              ))}
            </div>
          </article>

          <Recommendation recommendation={recommendation} />
        </section>
      )}
    </main>
  );
}

function Metric({ title, value, sub, className = '' }) {
  return (
    <article className="card metric">
      <div className="card-title">{title}</div>
      <div className={`metric-val ${className}`}>{value}</div>
      {sub && <div className="muted">{sub}</div>}
    </article>
  );
}

function ScoreMetric({ title, value }) {
  return (
    <article className="score-mini">
      <span>{title}</span>
      <strong className={scoreClass(value)}>{Math.round(value)}</strong>
      <div className="mini-track"><i className={scoreClass(value)} style={{ width: `${value}%` }} /></div>
    </article>
  );
}

function Recommendation({ recommendation }) {
  return (
    <article className={`card rec ${recommendation.type}`}>
      <div className="rec-title">{recommendation.title}</div>
      <table>
        <tbody>
          {(recommendation.rows || []).map(([key, value]) => (
            <tr key={key}>
              <td>{key}</td>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

function ReportHeader({ report }) {
  const score = report.score || {};
  const profile = report.profile || {};
  return (
    <article className="report-header">
      <div>
        <span className="card-title">GCI Temporal Analysis Report</span>
        <h1>{report.display_name}</h1>
        <p>{profile.occupation} - {profile.city} - {profile.tier}</p>
        <div className="meta-pills">
          <span>Report {profile.report_id}</span>
          <span>Generated {profile.generated_date}</span>
          <span>Valid {profile.validity}</span>
        </div>
      </div>
      <div className={`score-badge ${score.color}`}>
        <strong>{score.gci}</strong>
        <span>{score.band}</span>
      </div>
      <div className="meta-grid">
        <Metric title="Avg Net Monthly Income" value={profile.avg_net_monthly_income} />
        <Metric title="Active Tenure" value={profile.tenure} />
        <Metric title="Transactions Analysed" value={profile.transactions?.toLocaleString('en-IN')} />
        <Metric title="Probability of Default" value={pct(score.pd)} className={riskClass(score.manipulation)} />
        <Metric title="Manipulation Risk" value={score.manipulation} className={riskClass(score.manipulation)} />
        <Metric title="Cohort Percentile" value={`${score.cohort_percentile}th pct`} />
      </div>
    </article>
  );
}

function ChartCard({ title, children }) {
  return (
    <div>
      <div className="chart-title">{title}</div>
      {children}
    </div>
  );
}
