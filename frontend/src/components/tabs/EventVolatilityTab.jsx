import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { LenderInsight } from '../LenderInsight';

const ttStyle = {
  backgroundColor: '#111827', border: '1px solid #1F2937',
  borderRadius: '8px', color: '#F9FAFB', fontSize: '12px',
};

function money(v) { return `Rs ${Number(v).toLocaleString('en-IN')}`; }

function manipClass(label) {
  if (label === 'Clean') return 'green';
  if (label === 'Suspicious') return 'amber';
  return 'red';
}

export function EventVolatilityTab({ report }) {
  const temporal = report?.temporal || {};
  const variance = report?.variance || {};
  const events   = report?.events   || [];
  const manip    = report?.score?.manipulation || 'Clean';

  const temporalRows = (temporal.raw || []).map((raw, i) => ({
    month: `M${i + 1}`,
    raw,
    trend:    temporal.trend?.[i]    || 0,
    seasonal: temporal.seasonal?.[i] || 0,
    residual: temporal.residual?.[i] || 0,
  }));

  const varianceData = [
    { name: 'Calendar / Seasonal', value: variance.festival || 0, fill: '#22C55E' },
    { name: 'Weekly Cycles',       value: variance.weekly   || 0, fill: '#3B82F6' },
    { name: 'Residual Risk',       value: variance.residual || 0, fill: '#EF4444' },
  ];

  function eventPctClass(pct) {
    if (!pct || pct === 'N/A') return 'event-pill-pct-warn';
    return pct.startsWith('+') ? 'event-pill-pct-pos' : pct.startsWith('-') ? 'event-pill-pct-neg' : 'event-pill-pct-warn';
  }

  return (
    <div className="tab-inner">
      <div className="section-header">
        <div className="section-title">Event Volatility — CVD Analysis</div>
        <div className="section-sub">
          Separates normal seasonal variation from true financial instability using STL decomposition.
        </div>
      </div>

      <div className="grid-8-4">
        {/* Multi-Line CVD Chart */}
        <div className="card">
          <div className="card-label">Income Decomposition — Actual vs Seasonal vs Residual vs Trend</div>
          <div style={{ height: 320, marginTop: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={temporalRows} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F2937" />
                <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 11 }} stroke="#1F2937" />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fill: '#9CA3AF', fontSize: 11 }} stroke="#1F2937" />
                <Tooltip contentStyle={ttStyle} formatter={(v) => money(v)} />
                <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '12px', color: '#9CA3AF' }} />
                <Line dataKey="raw"      name="Actual Income"          type="monotone" stroke="#3B82F6" strokeWidth={2.5} dot={false} />
                <Line dataKey="trend"    name="Trend"                  type="monotone" stroke="#8B5CF6" strokeDasharray="5 4" strokeWidth={2} dot={false} />
                <Line dataKey="seasonal" name="Event-Driven (Seasonal)" type="monotone" stroke="#22C55E" strokeDasharray="3 3" strokeWidth={2} dot={false} />
                <Line dataKey="residual" name="Residual Risk"           type="monotone" stroke="#EF4444" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className={`cvd-note ${manipClass(manip)}`}>{report?.cvd_note}</div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Variance donut */}
          <div className="card">
            <div className="card-label">Variance Attribution</div>
            <div style={{ position: 'relative', height: 160, marginTop: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={varianceData}
                    cx="50%" cy="50%"
                    innerRadius={46} outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {varianceData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={ttStyle} formatter={(v) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)', textAlign: 'center',
              }}>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{variance.explained}%</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Explained</div>
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {varianceData.map((v) => (
                <div key={v.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: v.fill, display: 'inline-block' }} />
                    <span style={{ color: 'var(--text)' }}>{v.name}</span>
                  </span>
                  <span style={{ fontWeight: 700 }}>{v.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Event markers */}
          <div className="card" style={{ flex: 1 }}>
            <div className="card-label">Calendar Event Markers</div>
            <div style={{ marginTop: 12 }}>
              {events.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13 }}>No events mapped.</p>}
              {events.map((ev, i) => (
                <div key={i} className={`event-pill ${ev.status}`}>
                  <div className="event-pill-top">
                    <span className="event-pill-name">{ev.name}</span>
                    <span className={eventPctClass(ev.pct)}>{ev.pct}</span>
                  </div>
                  <div className="event-pill-note">{ev.note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <LenderInsight tabId="volatility" report={report} />
    </div>
  );
}
