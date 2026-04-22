import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { LenderInsight } from '../LenderInsight';

export function FraudAnomalyTab({ report }) {
  const flags        = report?.flags        || { items: [] };
  const anomalyScore = report?.score?.anomaly_score || 0;
  const manip        = report?.score?.manipulation  || 'Unknown';

  // Colour thresholds: <0.65 = Clean, 0.65–0.80 = Suspicious, ≥0.80 = High Risk
  const aColor = anomalyScore >= 0.8 ? '#EF4444' : anomalyScore >= 0.65 ? '#F59E0B' : '#22C55E';
  const aLabel = anomalyScore >= 0.8 ? 'High Risk' : anomalyScore >= 0.65 ? 'Suspicious' : 'Clean';

  // Arc segments — sizes are proportional to the threshold bands (must sum to 1)
  const gaugeData = [
    { value: 0.65, fill: '#22C55E' },  // 0.00 → 0.65  left  = Clean
    { value: 0.15, fill: '#F59E0B' },  // 0.65 → 0.80  mid   = Suspicious
    { value: 0.20, fill: '#EF4444' },  // 0.80 → 1.00  right = High Risk
  ];

  /*
    Needle math — pivot at (150, PIVOT_Y) which must equal cy:"100%" of the
    container height so the needle origin sits exactly on the arc's flat edge.

    CORRECT direction:  angle = score × π
      score=0.00 → cos(0)   = +1  → x = 150-90 =  60  → LEFT  (green ✓)
      score=0.50 → cos(π/2) =  0  → x = 150          → TOP   (✓)
      score=0.80 → cos(0.8π)≈-0.81 → x ≈ 223         → right (amber→red ✓)
      score=1.00 → cos(π)   = -1  → x = 150+90 = 240 → RIGHT (red ✓)

    Previous bug used (1-score)×π which was the mirror image — completely reversed.
  */
  const PIVOT_Y      = 155;   // container height = cy:"100%"
  const NEEDLE_LEN   = 90;
  const needleAngle  = anomalyScore * Math.PI;
  const needleTipX   = 150 - NEEDLE_LEN * Math.cos(needleAngle);
  const needleTipY   = PIVOT_Y - NEEDLE_LEN * Math.sin(needleAngle);

  const triggeredCount = flags.triggered_rules ?? 0;

  return (
    <div className="tab-inner">
      <div className="section-header">
        <div className="section-title">Fraud &amp; Anomaly Detection</div>
        <div className="section-sub">
          Detects manipulated financial profiles using statistical hard rules and ML Isolation Forest scoring.
        </div>
      </div>

      <div className="grid-5-7">

        {/* ── Anomaly Gauge card ── */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="card-label" style={{ alignSelf: 'flex-start' }}>ML Anomaly Score (Isolation Forest)</div>

          {/* Arc — height = PIVOT_Y so cy:"100%" puts centre at exact bottom edge */}
          <div style={{ position: 'relative', width: 300, height: PIVOT_Y, marginTop: 16 }}>
            <ResponsiveContainer width={300} height={PIVOT_Y}>
              <PieChart>
                <Pie
                  data={gaugeData}
                  cx="50%" cy="100%"
                  startAngle={180} endAngle={0}
                  innerRadius={70} outerRadius={112}
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                  isAnimationActive
                >
                  {gaugeData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* SVG needle — drawn in same coordinate space as the Recharts arc */}
            <svg
              style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
              width="300"
              height={PIVOT_Y}
            >
              {/* Needle line */}
              <line
                x1="150"        y1={PIVOT_Y}
                x2={needleTipX} y2={needleTipY}
                stroke={aColor} strokeWidth="3.5" strokeLinecap="round"
              />
              {/* Pivot dot */}
              <circle cx="150" cy={PIVOT_Y} r="7" fill={aColor} />
            </svg>
          </div>

          {/* Score + risk label — lives BELOW the arc, never overlaps the needle */}
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <div style={{ fontSize: 38, fontWeight: 800, color: aColor, lineHeight: 1 }}>
              {anomalyScore.toFixed(2)}
            </div>
            <div style={{
              fontSize: 12, fontWeight: 700, color: aColor,
              textTransform: 'uppercase', letterSpacing: 1, marginTop: 6,
            }}>
              {aLabel}
            </div>
          </div>

          {/* Axis labels — left / centre / right match green / amber / red */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            width: '100%', padding: '0 8px', marginTop: 16,
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#22C55E' }}>Low (0)</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#F59E0B' }}>Suspicious</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#EF4444' }}>High (1)</span>
          </div>

          <div style={{ marginTop: 18, fontSize: 13, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.6 }}>
            Trained on multivariate account behaviors to detect synthetic profiles and pre-application manipulation.
          </div>
        </div>

        {/* ── Hard Rule Evaluation panel ── */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div className="card-label" style={{ marginBottom: 0 }}>Hard Rule Evaluation</div>
            <span className={triggeredCount > 0 ? 'flags-summary flags-fail' : 'flags-summary flags-ok'}>
              {triggeredCount} Rules Triggered
            </span>
          </div>

          {(flags.items || []).map((flag) => (
            <div key={flag.code} className={`flag-item ${flag.ok ? '' : 'fail'}`}>
              <div className={`flag-icon ${flag.ok ? 'ok' : 'bad'}`}>
                {flag.ok ? '✓' : '✗'}
              </div>
              <div className="flag-body">
                <div className="flag-name">
                  {flag.name}
                  <span className="flag-code">{flag.code}</span>
                </div>
                <div className="flag-reason">{flag.reason}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <LenderInsight tabId="fraud" report={report} />
    </div>
  );
}
