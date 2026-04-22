import { useState } from 'react';

/* ─── Build dynamic insights from live report data ─── */
function buildInsights(tabId, report) {
  const score      = report?.score      || {};
  const components = report?.components || {};
  const flags      = report?.flags      || {};
  const temporal   = report?.temporal   || {};
  const expenses   = report?.expenses   || [];
  const variance   = report?.variance   || {};
  const events     = report?.events     || [];
  const stress     = report?.stress     || [];
  const profile    = report?.profile    || {};
  const shap       = report?.shap       || [];
  const rec        = report?.recommendation || {};

  switch (tabId) {

    /* ── OVERVIEW ──────────────────────────────────────────────────── */
    case 'overview': {
      const gci       = score.gci || 0;
      const band      = score.band || '—';
      const pd        = score.pd != null
        ? (score.pd > 1 ? Number(score.pd).toFixed(1) : (score.pd * 100).toFixed(1))
        : null;
      const triggered = flags.triggered_rules ?? 0;
      const anomaly   = score.anomaly_score;
      const riskBand  = gci >= 700 ? 'LOW RISK' : gci >= 500 ? 'MODERATE RISK' : 'HIGH RISK';

      // Weakest component
      const compEntries = Object.entries(components);
      const lowest      = compEntries.sort((a, b) => a[1] - b[1])[0];
      const lowestName  = lowest ? lowest[0] : null;
      const lowestVal   = lowest ? Math.round(lowest[1]) : null;

      return [
        {
          title: `GCI Score: ${gci}/900 — ${riskBand}`,
          desc: `A score of ${gci} places this borrower in the "${band}" band. Scores ≥700 = Low Risk, 500–699 = Moderate, <500 = High Risk. Use this as the first go/no-go filter before any deeper analysis.`,
        },
        {
          title: pd != null ? `Probability of Default: ${pd}% — XGBoost Model Verdict` : 'Probability of Default: Not Available',
          desc: pd != null
            ? `The ML model predicts a ${pd}% chance of default. In a portfolio of 100 similar borrowers, ~${Math.round(parseFloat(pd))} are expected to default. ${parseFloat(pd) < 15 ? 'This falls within the acceptable micro-lending range.' : parseFloat(pd) < 30 ? 'Elevated — proceed with conditional approval only.' : 'High default risk — reject or require collateral.'}`
            : 'Default probability could not be computed. Ensure complete backend data before making a lending decision.',
        },
        {
          title: `Manipulation Status: ${score.manipulation || 'Unknown'} — ${triggered} Hard Rule${triggered !== 1 ? 's' : ''} Triggered`,
          desc: triggered === 0
            ? 'All hard rules passed. No fraud indicators detected — the submitted financial profile appears genuine, consistent, and unmanipulated.'
            : `${triggered} rule(s) triggered. The borrower's data shows suspicious patterns (e.g. pre-application income spikes, unusual balance activity). Manually verify source bank statements before proceeding.`,
        },
        {
          title: anomaly != null ? `Anomaly Score: ${anomaly.toFixed(2)} — Isolation Forest Output` : 'Anomaly Score: Not Computed',
          desc: anomaly != null
            ? anomaly >= 0.80
              ? `Score of ${anomaly.toFixed(2)} is HIGH RISK (≥0.80). This borrower's financial behavior matches almost no peers in the training data — strong indicator of a synthetic or pre-manipulated history.`
              : anomaly >= 0.65
              ? `Score of ${anomaly.toFixed(2)} is SUSPICIOUS (0.65–0.80). Some behavioral features deviate from normal profiles. Cross-check with bank statements and income proof.`
              : `Score of ${anomaly.toFixed(2)} is CLEAN (below 0.65). Account behavior — balance patterns, transaction frequency, income timing — all match normal real-world profiles.`
            : 'Anomaly detection score unavailable.',
        },
        {
          title: lowestName ? `Weakest Dimension: ${lowestName.charAt(0).toUpperCase() + lowestName.slice(1)} at ${lowestVal}/100` : 'Component Breakdown Available Below',
          desc: lowestName
            ? `"${lowestName.charAt(0).toUpperCase() + lowestName.slice(1)}" is the primary drag on this borrower's overall GCI score at ${lowestVal}/100. During the lending interview, specifically probe this area to determine whether it reflects a temporary constraint or a structural financial weakness.`
            : 'Review the component breakdown to identify which financial dimension (Stability, Liquidity, Discipline, Repayment) needs the most attention.',
        },
      ];
    }

    /* ── FINANCIAL BEHAVIOR ────────────────────────────────────────── */
    case 'financial': {
      const liq        = components.liquidity  || 0;
      const weeks      = Math.round(liq / 10);
      const discipline = components.discipline || 0;
      const stability  = components.stability  || 0;

      const rawIncome  = temporal.raw || [];
      const avgIncome  = rawIncome.length > 0
        ? rawIncome.reduce((a, b) => a + b, 0) / rawIncome.length : 0;
      const lastIncome = rawIncome[rawIncome.length - 1] || 0;
      const trendDir   = lastIncome > avgIncome * 1.05 ? 'Rising' : lastIncome < avgIncome * 0.95 ? 'Declining' : 'Stable';

      const lastExp       = expenses[expenses.length - 1] || {};
      const totalExp      = (lastExp.recurring || 0) + (lastExp.variable || 0);
      const recurringPct  = totalExp > 0 ? Math.round((lastExp.recurring / totalExp) * 100) : null;

      return [
        {
          title: `Liquidity Buffer: ${liq}/100 — ≈${weeks} Week${weeks !== 1 ? 's' : ''} of Zero-Income Survival`,
          desc: weeks >= 6
            ? `With ${weeks} weeks of buffer, the borrower can sustain all regular expenses even if income stops completely. This is a strong safety net for EMI repayment during lean gig months.`
            : weeks >= 3
            ? `${weeks} weeks of cash sustainability is moderate. If income drops for one month — common in gig work — the borrower can cover ~${weeks} EMIs from reserves before needing emergency credit.`
            : `Critical: only ${weeks} week(s) of cash buffer. Any income disruption directly threatens EMI repayment. Consider reducing the loan amount or tenure accordingly.`,
        },
        {
          title: `Income Trend: ${trendDir} — Avg ₹${avgIncome > 0 ? Math.round(avgIncome / 1000) + 'k' : '—'}/month`,
          desc: trendDir === 'Rising'
            ? 'Monthly income is trending upward vs. the historical average. Growing earning capacity improves future repayment confidence — especially for longer-tenure loans.'
            : trendDir === 'Declining'
            ? 'Income has trended below the historical average in recent months. This may reflect seasonal slowdown or a structural platform issue. Ask the borrower about current performance before sanctioning.'
            : 'Income is relatively stable month-over-month. Predictable income — even if modest — is preferable to high-but-erratic earnings for EMI scheduling purposes.',
        },
        {
          title: recurringPct != null ? `Expense Split: ${recurringPct}% Fixed, ${100 - recurringPct}% Variable` : 'Expense Signature Analysed',
          desc: recurringPct != null
            ? recurringPct >= 60
              ? `${recurringPct}% of spending is in fixed recurring categories (rent, utilities, subscriptions). This signals a disciplined lifestyle where an EMI can be scheduled as just another fixed obligation.`
              : `${recurringPct}% fixed spending — variable/discretionary costs dominate. This can mean flexibility when income drops, but may also indicate less structured cash management. Probe further.`
            : 'A higher purple (recurring) proportion in the bar chart relative to grey (variable) is the positive signal to look for.',
        },
        {
          title: `Spending Discipline Score: ${discipline}/100`,
          desc: discipline >= 70
            ? `Discipline score of ${discipline}/100 indicates consistent, structured spending behavior. Borrowers with high discipline scores naturally accommodate fixed monthly obligations — EMIs fit easily into their routine.`
            : discipline >= 40
            ? `Moderate discipline (${discipline}/100). The borrower exercises some financial control but has periodic discretionary splurges. Set a slightly conservative EMI to leave breathing room.`
            : `Low discipline score (${discipline}/100) — erratic or impulsive spending patterns detected. This is a risk factor for EMI regularity. Consider a shorter repayment window with smaller installments.`,
        },
        {
          title: `Income Stability Score: ${stability}/100 — Gig Variability Assessment`,
          desc: stability >= 70
            ? `Stability score of ${stability}/100 means low month-to-month income variance. For a gig worker, this is exceptional — consistent platform earnings across seasons directly supports repayment reliability.`
            : stability >= 40
            ? `Moderate stability (${stability}/100). Some seasonal or platform-driven fluctuations exist. Consider structuring the loan with a step-up EMI tied to high-income months.`
            : `Low stability (${stability}/100) means income fluctuates significantly. Avoid fixed-EMI products — consider income-linked repayment with a grace period for low-income months.`,
        },
      ];
    }

    /* ── EVENT VOLATILITY ──────────────────────────────────────────── */
    case 'volatility': {
      const explained   = variance.explained || 0;
      const residual    = variance.residual   || 0;
      const festival    = variance.festival   || 0;
      const weekly      = variance.weekly     || 0;
      const manip       = score.manipulation  || 'Clean';
      const eventCount  = events.length;

      return [
        {
          title: `${explained}% of Income Variance is Fully Explained`,
          desc: explained >= 75
            ? `${explained}% of all income fluctuations are accounted for by known seasonal and weekly patterns. Only ${100 - explained}% is unexplained residual risk — this is a highly predictable income profile for lending purposes.`
            : explained >= 50
            ? `${explained}% variance explained. A meaningful ${100 - explained}% of income swings cannot be attributed to known events — investigate whether this reflects undisclosed income sources or data gaps.`
            : `Less than half (${explained}%) of income variance is explained. ${100 - explained}% is residual — the borrower's income moves unpredictably, which increases repayment risk beyond what the raw numbers suggest.`,
        },
        {
          title: `Residual (Unexplained) Risk: ${residual}% of Total Variance`,
          desc: residual <= 20
            ? `Only ${residual}% of income variance is unexplained — well within safe limits. The borrower's income is largely driven by normal seasonal and weekly cycles, not random shocks.`
            : residual <= 35
            ? `${residual}% residual risk is moderate. Some unexplained income movement exists — could be undisclosed freelance income or irregular platform bonuses. Verify with bank passbook or UPI exports.`
            : `${residual}% residual risk is HIGH. A large portion of income swings cannot be explained by any known pattern. Treat this as equivalent to "irregular income" for structuring the lending offer.`,
        },
        {
          title: `Seasonal Variance: ${festival}% Calendar-Driven, ${weekly}% Weekly Cycles`,
          desc: `Festival-driven variance of ${festival}% means the borrower earns ${festival > 20 ? 'significantly' : 'moderately'} more during peak seasons (Diwali, Eid, harvest). ${festival > 20 ? 'Schedule EMI collections around these high-income periods for better recovery rates.' : 'Minimal festival dependency — standard monthly EMI scheduling applies.'} Weekly cycles at ${weekly}% indicate ${weekly > 15 ? 'strong weekday/weekend earnings differences — relevant for delivery or daily-wage gig workers.' : 'minor intra-week fluctuations consistent with standard employment patterns.'}`,
        },
        {
          title: `${eventCount} Calendar Event${eventCount !== 1 ? 's' : ''} Mapped to Income`,
          desc: eventCount > 0
            ? `The STL decomposition identified ${eventCount} calendar event${eventCount !== 1 ? 's' : ''} correlated with income changes. Events where income rises as expected (e.g. +30% during Diwali) confirm authentic gig behavior. Events where income unexpectedly falls during peak periods are red flags for platform issues or hidden liabilities.`
            : "No calendar events mapped — income does not show clear festival or seasonal correlations. This may indicate the borrower's income is not event-sensitive (e.g. platform-agnostic), or the data window is too short to capture annual cycles.",
        },
        {
          title: `Manipulation Signal from Volatility: ${manip}`,
          desc: manip === 'Clean'
            ? "The CVD decomposition found no artificial patterns. Income rises and falls follow natural economic rhythms — no sudden pre-application spikes or anomalous flatlines that suggest data fabrication."
            : manip === 'Suspicious'
            ? "The STL decomposition detected income patterns inconsistent with natural seasonal behavior — possible manual inflation of transactions before the application window. Request original bank passbook or UPI transaction history."
            : "High-risk manipulation signals detected in the volatility pattern. The income series shows signs of artificial construction. Do not proceed without independent income verification.",
        },
      ];
    }

    /* ── FRAUD & ANOMALY ───────────────────────────────────────────── */
    case 'fraud': {
      const anomaly    = score.anomaly_score || 0;
      const triggered  = flags.triggered_rules ?? 0;
      const manip      = score.manipulation   || 'Unknown';
      const flagItems  = flags.items          || [];
      const failedFlags = flagItems.filter(f => !f.ok);
      const passedFlags = flagItems.filter(f => f.ok);

      return [
        {
          title: `ML Anomaly Score: ${anomaly.toFixed(2)} — ${anomaly >= 0.8 ? 'HIGH RISK' : anomaly >= 0.65 ? 'SUSPICIOUS' : 'CLEAN'}`,
          desc: anomaly >= 0.80
            ? `Score of ${anomaly.toFixed(2)} (threshold: 0.80) — this borrower's financial behavior has almost no peers in the training dataset. The profile is statistically unique in a concerning way — possibly synthetic or pre-manipulated.`
            : anomaly >= 0.65
            ? `Score of ${anomaly.toFixed(2)} falls in the suspicious zone (0.65–0.80). Not conclusive on its own, but combined with any failed hard rules, this warrants a manual review before proceeding.`
            : `Score of ${anomaly.toFixed(2)} is well within the clean zone (below 0.65). Account behavior — balance patterns, transaction frequency, income timing — all match normal real-world profiles in the training set.`,
        },
        {
          title: `Hard Rules: ${triggered} Triggered, ${passedFlags.length} Passed out of ${flagItems.length} Total`,
          desc: triggered === 0
            ? `All ${passedFlags.length} hard rules passed. No deterministic fraud patterns detected — no pre-application income spikes, no unusual zero-balance periods, no round-number transaction anomalies. The profile is rule-clean.`
            : `${triggered} rule(s) failed — specifically: ${failedFlags.map(f => f.name).join(', ')}. These are deterministic checks, not probabilistic — the rule either fires or it doesn't. Each failure is a concrete, auditable reason to pause and investigate.`,
        },
        {
          title: `Overall Manipulation Verdict: ${manip}`,
          desc: manip === 'Clean'
            ? "Both the ML model and all hard rules agree: this profile is clean. No evidence of pre-application data manipulation. The borrower's financial history appears authentic and consistent."
            : manip === 'Suspicious'
            ? "One or more signals suggest possible manipulation. Do not reject outright — but request supporting documents (PDF bank statement, UPI exports, GST returns) before any decision."
            : "Multiple high-confidence fraud signals triggered simultaneously. The probability of unintentional data issues is low. Recommend rejection and filing for further compliance review.",
        },
        {
          title: 'Why Two Layers? — ML Model + Hard Rules Working Together',
          desc: 'Isolation Forest detects statistical anomalies — patterns no human auditor would spot (e.g. transaction clustering at specific hours, atypical balance decay curves). Hard rules catch known fraud behaviors (e.g. income exactly 3× threshold right before application). Together, they provide defense-in-depth: one consistently catches what the other misses.',
        },
        {
          title: triggered === 0 && anomaly < 0.65 ? 'Fraud Layer Result: Green Light — Proceed to Credit Sizing' : 'Fraud Layer Result: Caution — Apply Income Haircut',
          desc: triggered === 0 && anomaly < 0.65
            ? `With 0 rules triggered and an anomaly score of ${anomaly.toFixed(2)}, the fraud risk layer raises no concerns. This borrower's data can be trusted for downstream analysis. Proceed confidently to Stress and Cohort tabs.`
            : `The fraud layer has raised concerns (${triggered} rules triggered, anomaly ${anomaly.toFixed(2)}). Even if the borrower is ultimately approved, apply a 10–20% conservative haircut to the declared income figures when calculating EMI capacity.`,
        },
      ];
    }

    /* ── STRESS & REPAYMENT ────────────────────────────────────────── */
    case 'stress': {
      const normalScenario = stress.find(s =>
        s.scenario?.toLowerCase().includes('normal') || s.scenario?.toLowerCase().includes('base')
      ) || stress[0];
      const mildScenario = stress.find(s =>
        s.scenario?.toLowerCase().includes('25') || s.scenario?.toLowerCase().includes('mild') || s.scenario?.toLowerCase().includes('moderate')
      ) || stress[1];
      const severeScenario = stress.find(s =>
        s.scenario?.toLowerCase().includes('40') || s.scenario?.toLowerCase().includes('severe') || s.scenario?.toLowerCase().includes('stress')
      ) || stress[2];

      const nProb = normalScenario?.repayment_probability;
      const mProb = mildScenario?.repayment_probability;
      const sProb = severeScenario?.repayment_probability;
      const drop25 = nProb != null && mProb != null ? (nProb - mProb).toFixed(1) : null;
      const drop40 = nProb != null && sProb != null ? (nProb - sProb).toFixed(1) : null;

      return [
        {
          title: nProb != null ? `Baseline (Normal): ${nProb}% Repayment Probability` : 'Baseline Repayment Probability',
          desc: nProb != null
            ? nProb >= 80
              ? `At ${nProb}%, the borrower has a strong baseline repayment probability. 500 Monte Carlo simulations agree — 4 in 5 simulated futures result in successful loan repayment at today's income level.`
              : nProb >= 60
              ? `Baseline probability of ${nProb}% is moderate. Repayment succeeds in roughly ${nProb} out of 100 simulated futures. Consider a shorter loan tenure to reduce exposure duration.`
              : `Baseline probability of only ${nProb}% is concerning — even without any income shock, repayment is unreliable. The current income may be insufficient for the requested loan amount.`
            : 'Run the stress simulation to see the baseline repayment probability under normal income conditions.',
        },
        {
          title: mProb != null ? `−25% Income Shock: ${mProb}% Probability (−${drop25}pt drop)` : 'Mild Stress Scenario (−25% Income)',
          desc: mProb != null
            ? mProb >= 70
              ? `Even with a 25% income cut (platform fee hike, seasonal dry spell), repayment holds at ${mProb}%. This borrower is resilient to moderate income shocks — a key requirement for gig-sector lending.`
              : mProb >= 50
              ? `A 25% income drop reduces probability to ${mProb}% — a ${drop25}pt fall. The borrower can survive a mild shock but becomes vulnerable. Consider building a 1-month EMI moratorium into the loan structure.`
              : `A 25% income drop collapses repayment probability to ${mProb}% — a ${drop25}pt fall. The borrower has almost no cushion against even routine income variability.`
            : 'See the chart for mild stress scenario results.',
        },
        {
          title: sProb != null ? `−40% Income Shock: ${sProb}% Probability (−${drop40}pt drop)` : 'Severe Stress Scenario (−40% Income)',
          desc: sProb != null
            ? sProb >= 55
              ? `Under a severe 40% income reduction (health crisis, platform ban), the borrower still shows ${sProb}% repayment probability. This indicates genuine resilience — likely supported by savings, secondary income, or family buffers.`
              : sProb >= 30
              ? `Severe stress drops repayment to ${sProb}%. At −40% income, the borrower struggles significantly. Use this scenario to cap the maximum loan-to-income ratio — do not lend beyond the income floor.`
              : `A 40% income shock leaves only ${sProb}% repayment probability. This borrower lacks the financial depth to absorb a major income disruption. Limit loan size to 1–2 months' average income maximum.`
            : 'See the chart for severe stress scenario results.',
        },
        {
          title: drop25 != null && drop40 != null ? `Resilience Gradient: −${drop25}pt at −25%, −${drop40}pt at −40%` : 'Rate of Decline Matters More Than Individual Values',
          desc: drop25 != null && drop40 != null
            ? parseFloat(drop25) < 15 && parseFloat(drop40) < 25
              ? `Shallow decline curve (${drop25}pt, then ${drop40}pt) indicates high financial resilience. Repayment probability doesn't collapse with income stress — structural buffers exist.`
              : parseFloat(drop25) > 20 || parseFloat(drop40) > 35
              ? `Steep decline (${drop25}pt at −25%, ${drop40}pt at −40%) signals high income dependence with no meaningful buffer. Income stress has an outsized impact on this borrower.`
              : `Moderate decline gradient. The borrower loses ground as income shrinks but not catastrophically. Standard risk mitigation (smaller loan, shorter tenure) should be sufficient.`
            : 'A borrower going 90%→82%→74% is far safer than one going 82%→58%→31%, even if they start at similar levels. The rate of decline is the real signal.',
        },
        {
          title: 'How to Use This Tab for Loan Structuring',
          desc: nProb != null && sProb != null
            ? `Set the EMI such that repayment remains viable even at the −25% scenario (${mProb != null ? mProb + '%' : 'see chart'}). If the −40% scenario drops below 50%, cap the loan amount at 3× average monthly income. Use the 500-run simulation consensus — not the borrower's peak income — as your sizing anchor.`
            : "Use Monte Carlo repayment probabilities — not the borrower's peak income — as your loan sizing anchor. A loan the borrower can only repay in their best months is not a safe loan.",
        },
      ];
    }

    /* ── COHORT COMPARISON ─────────────────────────────────────────── */
    case 'cohort': {
      const pct        = score.cohort_percentile || 0;
      const occupation = profile.occupation      || 'similar workers';
      const tier       = profile.tier            || 'their city tier';

      return [
        {
          title: `${pct}th Percentile Among ${occupation} in ${tier}`,
          desc: pct >= 60
            ? `This borrower outperforms ${pct}% of their direct peers — ${occupation} working in ${tier}. The comparison is occupation- and location-specific, making it one of the most contextually fair creditworthiness signals available.`
            : pct >= 30
            ? `At the ${pct}th percentile, this borrower sits in the middle of their peer group — better than ${pct}% of similar workers but below the median. Standard lending terms apply.`
            : `Only ${pct}th percentile — this borrower underperforms ${100 - pct}% of their own peers. Bottom-tier even within their economic context: the clearest signal for caution or rejection.`,
        },
        {
          title: 'Why Peer Comparison Beats Absolute Score',
          desc: `A Swiggy delivery partner earning ₹18k/month in a Tier-3 city with strong savings discipline may be a better credit risk than a Bangalore freelancer earning ₹60k/month erratically. The cohort percentile normalizes for economic context — it answers: "Is this borrower doing well for who they are and where they live?"`,
        },
        {
          title: pct >= 60 ? 'Lending Implication: Standard or Premium Terms' : pct >= 30 ? 'Lending Implication: Standard Terms with Monitoring' : 'Lending Implication: Conditional or Restricted Offer',
          desc: pct >= 60
            ? `Above 60th percentile in a matched cohort justifies standard loan underwriting without additional restrictions. This borrower demonstrates peer-superior financial behavior.`
            : pct >= 30
            ? `30–60th percentile warrants standard loan terms but with a shorter initial tenure (e.g. 6 months vs 12) and a performance review before limit enhancement or renewal.`
            : `Below 30th percentile: even in comparison to similar workers, this borrower struggles. Consider a pilot micro-loan (₹5,000–₹15,000) with weekly repayment to establish a track record first.`,
        },
        {
          title: 'Cohort Percentile as a Regulatory Defense',
          desc: `If a credit decision is challenged, cohort percentile provides a transparent, non-discriminatory basis: "This applicant ranked at the ${pct}th percentile of ${occupation} workers in ${tier}." Fully auditable, statistically grounded, and compliant with RBI Fair Lending Practice guidelines — no demographic variables involved.`,
        },
        {
          title: 'What the Percentile Rank is Computed From',
          desc: `The rank combines GCI score and probability of default relative to the cohort — not just raw income. A borrower with lower income but better financial discipline can outrank a higher-earning but erratic peer. This is the correct criterion: creditworthiness is about reliability, not income size.`,
        },
      ];
    }

    /* ── CREDIT GUIDANCE ───────────────────────────────────────────── */
    case 'guidance': {
      const recType   = rec.type  || 'review';
      const recTitle  = rec.title || '—';
      const bestShap  = shap.filter(s =>  s.positive).sort((a, b) => b.value - a.value)[0];
      const worstShap = shap.filter(s => !s.positive).sort((a, b) => b.value - a.value)[0];

      return [
        {
          title: `Final Verdict: ${recTitle}`,
          desc: recType === 'approve'
            ? 'The system recommends APPROVAL. All major risk layers — fraud, anomaly, stress, cohort — passed successfully. The terms in the recommendation table are optimized for this borrower\'s income level and risk profile.'
            : recType === 'reject'
            ? 'The system recommends REJECTION. Multiple risk thresholds were not met. Proceeding against this recommendation requires explicit underwriter override with documented justification per NBFC compliance policy.'
            : 'The system recommends CONDITIONAL APPROVAL. Some risk signals exist but are not disqualifying. The conditions listed (reduced amount, shorter tenure, documentation) are designed to mitigate the identified risks.',
        },
        {
          title: bestShap ? `Strongest Positive Factor: "${bestShap.label}" (+${bestShap.value} pts)` : 'Positive Risk Factors Identified',
          desc: bestShap
            ? `"${bestShap.label}" contributes the largest positive impact (+${bestShap.value} pts) to the credit decision. When documenting the approval basis or communicating with the borrower, lead with this factor as the primary positive driver.`
            : "Review the SHAP chart to identify which features most positively contributed to this borrower's credit score.",
        },
        {
          title: worstShap ? `Biggest Risk Factor: "${worstShap.label}" (−${worstShap.value} pts)` : 'Primary Risk Factor Identified',
          desc: worstShap
            ? `"${worstShap.label}" is the single largest drag on creditworthiness at −${worstShap.value} pts. This is what to probe further in the borrower interview. If this specific factor improves (e.g. income stabilizes, savings grow), the borrower's score can improve substantially on reapplication.`
            : "Review the SHAP chart to identify the primary risk factor that needs to be mitigated before or during loan structuring.",
        },
        {
          title: 'SHAP Explainability — What RBI Compliance Requires',
          desc: "RBI guidelines require that algorithmically processed credit decisions be explainable to the applicant on request. SHAP values deliver exactly that — a ranked, feature-by-feature breakdown of what drove the score. Every factor is a banking behavior signal with no demographic variables: fully compliant with India's Fair Lending Practice norms.",
        },
        {
          title: 'How to Use the EMI Structuring Table',
          desc: 'The recommendation table calculates the suggested loan amount and EMI based on: (a) average monthly income × acceptable debt-to-income ratio, (b) stress-tested repayment probability at the −25% income scenario, and (c) liquidity buffer weeks as a reserve indicator. Use the suggested EMI as a ceiling — going higher increases default risk disproportionately per the Monte Carlo simulations.',
        },
      ];
    }

    default:
      return [];
  }
}

/* ─── LenderInsight Component ───────────────────────────────────────── */
export function LenderInsight({ tabId, report }) {
  const [open, setOpen] = useState(true);
  const insights = buildInsights(tabId, report);
  if (!insights || insights.length === 0) return null;

  return (
    <div className="lender-insight">
      <button className="li-header" onClick={() => setOpen(o => !o)}>
        <span className="li-icon">💡</span>
        <span className="li-title">Lender Insight</span>
        <span className="li-sub">What this tab is telling you about the borrower</span>
        <span className="li-toggle">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="li-body">
          {insights.map((item, i) => (
            <div key={i} className="li-item">
              <div className="li-num">{i + 1}</div>
              <div className="li-content">
                <div className="li-point-title">{item.title}</div>
                <div className="li-point-desc">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
