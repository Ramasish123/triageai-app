import { Activity, AlertTriangle, Check, ChevronDown, CircleCheck, Clock3, Copy, Download, ExternalLink, Gauge, Phone, Printer, Share2, ShieldCheck, Stethoscope } from 'lucide-react';
import { useMemo, useState } from 'react';

const icons = {
  self: ShieldCheck,
  doctor: Stethoscope,
  emergency: AlertTriangle,
};

export function ResultPanel({ copy, result, serviceNotice, onNewAssessment, compact = false }) {
  const [copied, setCopied] = useState(false);
  const Icon = icons[result.level] || ShieldCheck;
  const title = result.level === 'emergency' ? copy.emergencyTitle : result.level === 'doctor' ? copy.doctorTitle : copy.selfTitle;
  const summary = result.level === 'emergency' ? copy.emergencySummary : result.level === 'doctor' ? copy.doctorSummary : copy.selfSummary;
  const scorePercent = Math.min(100, Math.max(8, (result.score / 10) * 100));
  const summaryText = useMemo(() => {
    const symptomText = result.selectedSymptoms?.map((item) => item.name).join(', ') || '—';
    const redFlags = result.redFlags?.map((item) => `- ${item.message}`).join('\n') || 'None reported';
    const nextSteps = result.recommendations?.map((item) => `- ${item}`).join('\n') || '';
    return [
      'TriageAI assessment summary',
      `Guidance: ${title}`,
      `Suggested timeframe: ${result.timeframe}`,
      `Assessment score: ${result.score}`,
      `Selected symptoms: ${symptomText}`,
      `Emergency warning signs: ${redFlags}`,
      `Engine: v${result.model?.engineVersion || '—'}`,
      `Decision path: ${result.model?.decisionPath || '—'}`,
      '',
      'Suggested next steps:',
      nextSteps,
      '',
      'This summary is informational guidance, not a diagnosis or replacement for professional medical advice.',
    ].join('\n');
  }, [result, title]);

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { /* Clipboard may be unavailable on non-secure origins. */ }
  };
  const shareResult = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'TriageAI assessment summary', text: summaryText }); } catch { /* User cancelled. */ }
    } else {
      copyResult();
    }
  };
  const downloadResult = () => {
    const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `triageai-summary-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className={`result-view ${compact ? 'result-compact' : ''}`} aria-live="assertive" aria-atomic="true">
      {!compact && <><span className="eyebrow">{copy.resultEyebrow}</span><h1>{copy.resultTitle}</h1></>}
      <div className={`outcome-card outcome-${result.level}`} role={result.level === 'emergency' ? 'alert' : undefined}>
        <span className="outcome-icon"><Icon size={27} aria-hidden="true" /></span>
        <div>
          <span className="outcome-kicker">{result.level === 'emergency' ? copy.emergencyAction : result.timeframe}</span>
          <h2>{title}</h2>
          <p>{summary}</p>
        </div>
      </div>

      {serviceNotice && <div className="service-notice"><AlertTriangle size={18} aria-hidden="true" /><span>{serviceNotice}</span></div>}

      {!compact && <div className="result-tools" aria-label={copy.resultTools}>
        <span>{copy.resultTools}</span>
        <div>
          <button type="button" onClick={copyResult}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? copy.copiedSummary : copy.copySummary}</button>
          <button type="button" onClick={shareResult}><Share2 size={16} />{copy.shareSummary}</button>
          <button type="button" onClick={() => window.print()}><Printer size={16} />{copy.printSummary}</button>
          <button type="button" onClick={downloadResult}><Download size={16} />{copy.downloadSummary}</button>
        </div>
      </div>}

      {result.model && <div className="model-audit" aria-label={copy.modelStrength}>
        <div><span className="audit-icon"><Gauge size={18} /></span><span><small>{copy.engineVersion}</small><strong>v{result.model.engineVersion}</strong></span></div>
        <div><span className="audit-icon"><Activity size={18} /></span><span><small>{copy.rulesChecked}</small><strong>{result.model.symptomRulesEvaluated + result.model.emergencyRulesEvaluated}</strong></span></div>
        <div><span className="audit-icon"><CircleCheck size={18} /></span><span><small>{copy.inputCoverage}</small><strong>{result.model.inputCoverage}%</strong></span></div>
        <div><span className="audit-icon"><ShieldCheck size={18} /></span><span><small>{copy.decisionPath}</small><strong>{result.model.decisionPath.replaceAll('_', ' ')}</strong></span></div>
      </div>}

      {result.level === 'emergency' && <div className="emergency-actions">
        <a className="button primary emergency-call" href="tel:" aria-describedby="emergency-call-help"><Phone size={18} aria-hidden="true" />{copy.emergencyAction}</a>
        <small id="emergency-call-help">{copy.emergencyActionHelp}</small>
        <a className="button secondary" href="https://www.google.com/search?q=emergency+care" target="_blank" rel="noreferrer"><ExternalLink size={17} aria-hidden="true" />{copy.emergencyCare}</a>
        <small>{copy.emergencyCareHelp}</small>
      </div>}

      <div className="result-grid">
        <section className="result-section reason-section">
          <div className="section-label"><span>{copy.whyThisResult}</span>{result.redFlag && <strong><AlertTriangle size={14} /> {copy.redFlagDetected}</strong>}</div>
          {result.redFlag ? <div className="red-flag-explanation">
            {result.redFlags.map((flag) => <p key={flag.id}><AlertTriangle size={17} aria-hidden="true" />{flag.message}</p>)}
            <small>{copy.scoreOverridden}</small>
          </div> : null}
          <details className="calculation" open={!compact}>
            <summary>{copy.transparentCalculation}<ChevronDown size={17} aria-hidden="true" /></summary>
            <div className="calculation-block">
              <h3>{copy.baseScore}</h3>
              {result.reasons.map((reason) => <div className="calculation-row" key={reason.id}><span><strong>{reason.label}</strong><small>{reason.detail}</small></span><b>+{reason.points}</b></div>)}
              <div className="calculation-total"><span>{copy.baseScore}</span><b>{result.baseScore}</b></div>
            </div>
            <div className="calculation-block">
              <h3>{copy.adjustments}</h3>
              {result.adjustments.length ? result.adjustments.map((adjustment) => <div className="calculation-row" key={adjustment.id}><span><strong>{adjustment.label}</strong><small>{adjustment.detail}</small></span><b>+{adjustment.points}</b></div>) : <p className="calculation-none">—</p>}
            </div>
          </details>
          <div className="score-card">
            <span>{copy.finalScore}</span>
            <strong>{result.score}</strong>
            <div className="score-track" aria-hidden="true"><span style={{ width: `${scorePercent}%` }} /></div>
            <small>{result.level === 'self' ? copy.scoreBandSelf : result.level === 'doctor' ? copy.scoreBandDoctor : copy.scoreBandEmergency}</small>
          </div>
        </section>

        <section className="result-section next-section">
          <span className="section-label">{copy.whatNext}</span>
          <div className="timeframe"><Clock3 size={19} aria-hidden="true" /><span><small>{copy.suggestedTimeframe}</small><strong>{result.timeframe}</strong></span></div>
          <ul className="recommendations">{result.recommendations.map((item) => <li key={item}><CircleCheck size={17} aria-hidden="true" /><span>{item}</span></li>)}</ul>
          
          {result.neuralAnalysis && (
            <div className="timeframe" style={{ marginTop: '24px', flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Gauge size={19} aria-hidden="true" />
                <span>
                  <small>AI SPECIALIST SECOND OPINION</small>
                  <strong>
                    {result.neuralAnalysis.match 
                      ? `Agrees (${result.neuralAnalysis.confidence}% confidence)` 
                      : `Disagrees: Suggests ${result.neuralAnalysis.prediction.toUpperCase()} (${result.neuralAnalysis.confidence}% conf.)`}
                  </strong>
                </span>
              </div>
              {result.neuralAnalysis.message && (
                <p style={{ margin: 0, padding: '12px', background: 'var(--bg)', borderRadius: '12px', boxShadow: 'var(--neu-in)', fontSize: '13px', lineHeight: '1.5', fontStyle: 'italic', color: 'var(--text)' }}>
                  "{result.neuralAnalysis.message}"
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      {!compact && <>
        <div className="safety-message"><AlertTriangle size={18} aria-hidden="true" /><span>{copy.safetyMessage}</span></div>
        <button type="button" className="button primary new-assessment" onClick={onNewAssessment}>{copy.newAssessment}</button>
      </>}
    </section>
  );
}
