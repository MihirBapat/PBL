import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, ResponsiveContainer,
} from 'recharts';
import { LenderInsight } from '../LenderInsight';

const ttStyle = {
  backgroundColor: '#111827', border: '1px solid #1F2937',
  borderRadius: '8px', color: '#F9FAFB', fontSize: '12px',
};

function money(v) {
  return `Rs ${Number(v).toLocaleString('en-IN')}`;
}

export function FinancialBehaviorTab({ report }) {
  const temporal   = report?.temporal   || {};
  const expenses   = report?.expenses   || [];
  const components = report?.components || {};

  const incomeSeries = (temporal.raw || []).map((v, i) => ({
    month: `M${i + 1}`, income: v,
  }));

  const liq = components.liquidity || 0;
  const weeks = Math.round(liq / 10);

  return (
    <div className="tab-inner">
      <div className="section-header">
        <div className="section-title">Financial Behavior</div>
        <div className="section-sub">Income consistency, spending habits, and cash-buffer sustainability.</div>
      </div>

      <div className="grid-2">
        {/* Income Trend */}
        <div className="card">
          <div className="card-label">Monthly Income Trend</div>
          <div style={{ height: 260, marginTop: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={incomeSeries} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F2937" />
                <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 11 }} stroke="#1F2937" />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fill: '#9CA3AF', fontSize: 11 }} stroke="#1F2937" />
                <Tooltip
                  contentStyle={ttStyle}
                  formatter={(v) => [money(v), 'Monthly Income']}
                />
                <Line
                  type="monotone" dataKey="income" name="Monthly Income"
                  stroke="#3B82F6" strokeWidth={2.5}
                  dot={{ fill: '#111827', stroke: '#3B82F6', strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: 8 }}>
            Month-to-month raw income showing operational variability patterns.
          </div>
        </div>

        {/* Expense Pattern */}
        <div className="card">
          <div className="card-label">Expense Signature — Recurring vs Variable</div>
          <div style={{ height: 260, marginTop: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenses} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F2937" />
                <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 11 }} stroke="#1F2937" />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fill: '#9CA3AF', fontSize: 11 }} stroke="#1F2937" />
                <Tooltip contentStyle={ttStyle} formatter={(v) => money(v)} />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px', color: '#9CA3AF' }} />
                <Bar dataKey="recurring" name="Recurring (Fixed)"      stackId="a" fill="#8B5CF6" />
                <Bar dataKey="variable"  name="Variable (Discretionary)" stackId="a" fill="#374151" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: 8 }}>
            Identifies fixed vs flexible spending — high recurring base indicates financial discipline.
          </div>
        </div>
      </div>

      {/* Liquidity Indicator */}
      <div className="card">
        <div className="card-label">Liquidity Sustainability Indicator</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginTop: 16 }}>
          <div>
            <span style={{ fontSize: 44, fontWeight: 800, color: '#06B6D4', lineHeight: 1 }}>{liq}</span>
            <span style={{ fontSize: 14, color: 'var(--muted)', marginLeft: 6 }}>score / 100</span>
          </div>
          <div style={{ flex: 1 }}>
            <div className="liq-track">
              <div className="liq-fill" style={{ width: `${liq}%` }} />
            </div>
            <div className="liq-labels">
              <span>0 weeks buffer</span>
              <span style={{ color: '#06B6D4', fontWeight: 700 }}>≈ {weeks} weeks sustainment</span>
              <span>10+ weeks buffer</span>
            </div>
          </div>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: 14 }}>
          How many weeks the borrower can sustain regular expenses with their end-of-month cash balance in the event of a sudden income halt.
        </div>
      </div>

      <LenderInsight tabId="financial" report={report} />
    </div>
  );
}
