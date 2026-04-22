import { LenderInsight } from '../LenderInsight';

export function CreditGuidanceTab({ report }) {
  const rec  = report?.recommendation || { type: 'review', title: 'Data Missing', rows: [] };
  const shap = report?.shap            || [];

  const recType   = rec.type || 'review';
  const normType  = recType === 'approve' ? 'approve' : recType === 'reject' ? 'reject' : 'conditional';

  const recIcon = normType === 'approve' ? '✔' : normType === 'reject' ? '✗' : '⚠';

  return (
    <div className="tab-inner">
      <div className="section-header">
        <div className="section-title">Credit Guidance</div>
        <div className="section-sub">
          Final lending decision support, EMI structuring, and RBI-compliant feature explainability.
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Recommendation Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="rec-card">
            <div className={`rec-header ${normType}`}>
              <span style={{ fontSize: 22 }}>{recIcon}</span>
              <span>{rec.title}</span>
            </div>
            <table className="rec-table">
              <tbody>
                {(rec.rows || []).map(([key, value], i) => (
                  <tr key={i}>
                    <td>{key}</td>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="notice-box">
            This guidance is generated purely from banking behavior signals. Final loan sanctioning remains
            at the full discretion of the underwriting officer and is subject to applicable RBI norms.
          </div>
        </div>

        {/* SHAP Feature Importance */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div className="card-label" style={{ marginBottom: 0 }}>Risk Contribution (SHAP)</div>
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6,
              color: 'var(--muted)', background: 'var(--bg)', border: '1px solid var(--border)',
              padding: '3px 8px', borderRadius: 5,
            }}>RBI Compliant</span>
          </div>

          {shap.length === 0 && (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>
              No SHAP explanations generated for this profile.
            </div>
          )}

          {shap.map((item, i) => (
            <div key={i} className="shap-item">
              <div className="shap-top">
                <span className="shap-name">{item.label}</span>
                <span className={item.positive ? 'shap-val-pos' : 'shap-val-neg'}>
                  {item.positive ? '+' : '−'}{item.value} pts
                </span>
              </div>
              <div className="shap-track">
                <div
                  className={item.positive ? 'shap-fill-pos' : 'shap-fill-neg'}
                  style={{ width: `${Math.min(item.value + 10, 100)}%`, transition: 'width 0.8s ease' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <LenderInsight tabId="guidance" report={report} />
    </div>
  );
}
