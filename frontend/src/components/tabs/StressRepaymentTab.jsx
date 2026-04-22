import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { LenderInsight } from '../LenderInsight';

const ttStyle = {
  backgroundColor: '#111827', border: '1px solid #1F2937',
  borderRadius: '8px', color: '#F9FAFB', fontSize: '12px',
};

function sColor(v) {
  return v >= 70 ? '#22C55E' : v >= 50 ? '#F59E0B' : '#EF4444';
}

export function StressRepaymentTab({ report }) {
  const stress = report?.stress || [];

  return (
    <div className="tab-inner">
      <div className="section-header">
        <div className="section-title">Stress & Repayment</div>
        <div className="section-sub">
          Simulates borrower repayment ability under adverse income scenarios using Monte Carlo pathways.
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div className="card-label" style={{ marginBottom: 0 }}>Monte Carlo Simulation — 500 Runs, 3 Income Scenarios</div>
          <span style={{
            fontSize: 11, fontWeight: 700, background: 'var(--bg)', border: '1px solid var(--border)',
            padding: '4px 12px', borderRadius: 6, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5,
          }}>XGBoost Pathway</span>
        </div>

        {/* Scenario KPI tiles */}
        <div className="stress-cards">
          {stress.length === 0 && (
            <div style={{ gridColumn: '1/-1', color: 'var(--muted)', fontSize: 14, padding: '24px 0' }}>
              No stress scenario data available.
            </div>
          )}
          {stress.map((row, i) => (
            <div key={i} className="stress-card">
              <span className="stress-scenario">{row.scenario}</span>
              <span className="stress-pct" style={{ color: sColor(row.repayment_probability) }}>
                {row.repayment_probability}%
              </span>
              <span className="stress-label">Repayment probability</span>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div style={{ height: 260, marginTop: 8 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stress} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal stroke="#1F2937" vertical={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: '#9CA3AF', fontSize: 11 }} stroke="#1F2937" />
              <YAxis
                dataKey="scenario" type="category"
                axisLine={false} tickLine={false}
                tick={{ fill: '#F9FAFB', fontSize: 12, fontWeight: 500 }}
                width={130}
              />
              <Tooltip
                contentStyle={ttStyle}
                formatter={(v) => [`${v}%`, 'Repayment Probability']}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar dataKey="repayment_probability" barSize={34} radius={[0, 4, 4, 0]}>
                {stress.map((row, i) => (
                  <Cell key={i} fill={sColor(row.repayment_probability)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ marginTop: 16, fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
          Scenarios simulate normal operating conditions, a 25% income shock, and a severe 40% income reduction. 
          Repayment probability falls as income stress increases — the rate of fall indicates resilience.
        </div>
      </div>

      <LenderInsight tabId="stress" report={report} />
    </div>
  );
}
