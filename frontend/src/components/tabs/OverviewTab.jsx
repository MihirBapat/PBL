import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { LenderInsight } from '../LenderInsight';

const COMPONENT_COLORS = {
  stability:  { fill: '#3B82F6', label: 'Stability'  },
  liquidity:  { fill: '#06B6D4', label: 'Liquidity'  },
  discipline: { fill: '#F59E0B', label: 'Discipline' },
  repayment:  { fill: '#22C55E', label: 'Repayment'  },
};

function gciColor(gci) {
  if (gci >= 700) return '#22C55E';
  if (gci >= 500) return '#F59E0B';
  return '#EF4444';
}

function gciClass(gci) {
  if (gci >= 700) return 'col-green';
  if (gci >= 500) return 'col-amber';
  return 'col-red';
}

function manipClass(label) {
  if (label === 'Clean') return 'badge badge-green';
  if (label === 'Suspicious') return 'badge badge-amber';
  return 'badge badge-red';
}

export function OverviewTab({ report }) {
  const score      = report?.score      || {};
  const components = report?.components || {};
  const flags      = report?.flags      || {};

  // Gauge: semi-circle (start=180°, end=0°)
  const gci = score.gci || 300;
  const ratio = Math.min(Math.max((gci - 300) / 600, 0), 1);
  const color = gciColor(gci);
  const gaugeData = [
    { value: ratio,     fill: color  },
    { value: 1 - ratio, fill: '#1F2937' },
  ];

  const compRows = Object.entries(COMPONENT_COLORS).map(([key, meta]) => ({
    key, label: meta.label, fill: meta.fill, value: components[key] || 0,
  }));

  const tooltipStyle = {
    backgroundColor: '#111827', border: '1px solid #1F2937',
    borderRadius: '8px', color: '#F9FAFB', fontSize: '12px',
  };

  return (
    <div className="tab-inner">
      <div className="section-header">
        <div className="section-title">Overview</div>
        <div className="section-sub">Instant summary of overall creditworthiness — answer in under 10 seconds.</div>
      </div>

      {/* KPI Row */}
      <div className="grid-4">
        <div className="kpi-card">
          <div className="kpi-label">GCI Score</div>
          <div className={`kpi-value ${gciClass(gci)}`}>
            {gci}<span className="kpi-unit">/ 900</span>
          </div>
          <div className="kpi-sub">{score.band || '—'} • Valid {report?.profile?.validity || '30 days'}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Probability of Default</div>
          <div className="kpi-value">
            {score.pd != null
              ? `${score.pd > 1 ? score.pd.toFixed(1) : (score.pd * 100).toFixed(1)}`
              : '—'}<span className="kpi-unit">%</span>
          </div>
          <div className="kpi-sub">XGBoost model output</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Manipulation Status</div>
          <div style={{ marginTop: '8px' }}>
            <span className={manipClass(score.manipulation)}>
              {score.manipulation || 'Unknown'}
            </span>
          </div>
          <div className="kpi-sub">{flags.triggered_rules ?? 0} hard rules triggered</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Anomaly Score</div>
          <div className="kpi-value">{score.anomaly_score?.toFixed(2) ?? '—'}</div>
          <div className="kpi-sub">Isolation Forest output</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-2">
        {/* Gauge */}
        <div className="card">
          <div className="card-label">Creditworthiness Gauge</div>
          <div className="gauge-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={gaugeData}
                  cx="50%" cy="75%"
                  startAngle={180} endAngle={0}
                  innerRadius={72} outerRadius={110}
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                  isAnimationActive
                >
                  {gaugeData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="gauge-center">
              <div className="g-score">{gci}</div>
              <div className="g-band">{score.band}</div>
            </div>
          </div>
          <div className="gauge-labels">
            <span style={{ color: '#EF4444', fontSize: '11px', fontWeight: 600 }}>High Risk (300)</span>
            <span style={{ color: '#F59E0B', fontSize: '11px', fontWeight: 600 }}>Moderate (500)</span>
            <span style={{ color: '#22C55E', fontSize: '11px', fontWeight: 600 }}>Low Risk (700+)</span>
          </div>
        </div>

        {/* Component Breakdown */}
        <div className="card">
          <div className="card-label">Component Breakdown</div>
          <div style={{ marginTop: '16px' }}>
            {compRows.map((row) => (
              <div key={row.key} className="comp-row">
                <div className="comp-name">{row.label}</div>
                <div className="comp-track">
                  <div
                    className="comp-fill"
                    style={{ width: `${row.value}%`, background: row.fill }}
                  />
                </div>
                <div className="comp-num" style={{ color: row.fill }}>{Math.round(row.value)}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '14px', textAlign: 'center' }}>
            Each dimension scored out of 100
          </div>
        </div>
      </div>

      <LenderInsight tabId="overview" report={report} />
    </div>
  );
}
