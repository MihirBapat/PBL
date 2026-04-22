import { LenderInsight } from '../LenderInsight';

export function CohortComparisonTab({ report }) {
  const score   = report?.score   || {};
  const profile = report?.profile || {};
  const pct     = score.cohort_percentile || 0;


  return (
    <div className="tab-inner">
      <div className="section-header">
        <div className="section-title">Cohort Comparison</div>
        <div className="section-sub">
          Benchmarks this borrower's cashflow against matching peers with similar occupation and city tier.
        </div>
      </div>

      <div className="card">
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
          <div>
            <div className="card-label">Peer Percentile Rank</div>
            <div style={{ fontSize: 14, color: 'var(--text)', marginTop: 6, lineHeight: 1.6 }}>
              Compared against{' '}
              <strong style={{ color: 'var(--blue)' }}>{profile.occupation || 'similar workers'}</strong>
              {' '}in{' '}
              <strong style={{ color: 'var(--blue)' }}>{profile.tier || 'similar tier'}</strong>.
            </div>
          </div>
          <div className="pct-rank-display">
            <span className="big-pct">{pct}<sup style={{ fontSize: 22 }}>th</sup></span>
            <span className="pct-lbl">Percentile</span>
          </div>
        </div>

        {/* Track */}
        <div className="pct-track-wrap">
          <div className="pct-track">
            <div className="pct-fill" style={{ width: `${pct}%` }}>
              <div className="pct-marker">
                <div className="pct-bubble">You are here · {pct}th pct</div>
                <div className="pct-needle" />
              </div>
            </div>
          </div>
          <div className="pct-axis">
            <span>Bottom 1%</span>
            <span>Median — 50th</span>
            <span>Top 1%</span>
          </div>
        </div>

        {/* Info box */}
        <div className="pct-info">
          A {pct}th percentile rank indicates this borrower outperforms{' '}
          <strong>{pct}% of similar peers</strong> in cashflow stability and probability of default.
          {pct >= 60
            ? ' This places them in a strong position for standard loan underwriting.'
            : pct >= 30
            ? ' Moderate standing — additional scrutiny is recommended before sanctioning.'
            : ' Bottom-tier performance warrants caution or a conditional offer.'}
        </div>
      </div>

      <LenderInsight tabId="cohort" report={report} />
    </div>
  );
}
