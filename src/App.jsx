import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  ClipboardCheck,
  Info,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TimerReset,
  Trash2,
} from 'lucide-react';
import { AppHeader, Footer } from './components/AppHeader.jsx';
import { Progress } from './components/Progress.jsx';
import { ResultPanel } from './components/ResultPanel.jsx';
import { SymptomSelector } from './components/SymptomSelector.jsx';
import { SYMPTOMS, getSymptomText, symptomById } from './data/symptoms.js';
import { RED_FLAG_RULES } from './data/redFlags.js';
import { useCopy } from './data/translations.js';
import { calculateTriageAssessment, getAgeLabel, getDurationLabel } from './engine/triageEngine.js';
import { clearHistory, getHistory, getPreferences, removeHistoryRecord, saveHistoryRecord, savePreferences } from './utils/storage.js';

const AGE_OPTIONS = [
  ['under_18', 'under18'],
  ['age_18_39', 'age18to39'],
  ['age_40_64', 'age40to64'],
  ['age_65_plus', 'age65plus'],
];

const DURATION_OPTIONS = [
  ['less_than_24h', 'lessThan24'],
  ['one_to_three_days', 'oneToThree'],
  ['four_to_seven_days', 'fourToSeven'],
  ['more_than_7_days', 'moreThanSeven'],
];

const DEMO_SCENARIOS = [
  {
    id: 'mild',
    titleKey: 'mildCase',
    detailKey: 'demoMildDetail',
    input: { symptomIds: ['mild_headache'], ageGroup: 'age_18_39', answers: {} },
  },
  {
    id: 'doctor',
    titleKey: 'doctorCase',
    detailKey: 'demoDoctorDetail',
    input: { symptomIds: ['fever', 'persistent_cough'], ageGroup: 'age_18_39', answers: { duration: 'four_to_seven_days' } },
  },
  {
    id: 'emergency',
    titleKey: 'emergencyCase',
    detailKey: 'demoEmergencyDetail',
    input: { symptomIds: ['chest_pain', 'shortness_of_breath'], ageGroup: 'age_40_64', answers: { breathingDifficulty: 'some' } },
  },
];

const SAFETY_CHECKS = [
  ['severe_allergic_reaction', 'safetyAllergic'],
  ['active_seizure', 'safetySeizure'],
  ['hard_to_wake', 'safetyWake'],
  ['blue_grey_lips', 'safetyBlue'],
];

function emptyAssessment() {
  return { ageGroup: '', symptomIds: [], answers: { duration: '', breathingDifficulty: '', safetyFlags: [], safetyReviewed: false } };
}

function normaliseRoute(pathname) {
  if (pathname === '/assessment') return '/assessment';
  if (pathname === '/history') return '/history';
  if (pathname === '/privacy') return '/privacy';
  if (pathname === '/demo') return '/demo';
  return '/';
}

function createRecordId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `assessment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatHistoryTime(value, language) {
  try {
    return new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
  } catch {
    return '';
  }
}

function historyDayLabel(value, copy, language) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return copy.today;
  if (date.toDateString() === yesterday.toDateString()) return copy.yesterday;
  return new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export default function App() {
  const initialPreferences = useMemo(() => getPreferences(), []);
  const [language, setLanguage] = useState(initialPreferences.language === 'bn' ? 'bn' : 'en');
  const [theme, setTheme] = useState(initialPreferences.theme === 'light' ? 'light' : 'dark');
  const [route, setRoute] = useState(() => normaliseRoute(window.location.pathname));
  const [wizard, setWizard] = useState('basic');
  const [assessment, setAssessment] = useState(emptyAssessment);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(getHistory);
  const [serviceNotice, setServiceNotice] = useState('');
  const copy = useCopy(language);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = language === 'bn' ? 'bn' : 'en';
    savePreferences({ language, theme });
  }, [language, theme]);

  useEffect(() => {
    const onPopState = () => setRoute(normaliseRoute(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((destination) => {
    const [rawPath, rawHash] = destination.split('#');
    const path = rawPath || '/';
    const target = normaliseRoute(path);
    const href = `${target}${rawHash ? `#${rawHash}` : ''}`;
    if (`${window.location.pathname}${window.location.hash}` !== href) window.history.pushState({}, '', href);
    setRoute(target);
    window.requestAnimationFrame(() => {
      if (rawHash) document.getElementById(rawHash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }, []);

  const startAssessment = useCallback(() => {
    setAssessment(emptyAssessment());
    setResult(null);
    setServiceNotice('');
    setWizard('basic');
    navigate('/assessment');
  }, [navigate]);

  const toggleSymptom = useCallback((id) => {
    setAssessment((current) => ({
      ...current,
      symptomIds: current.symptomIds.includes(id) ? current.symptomIds.filter((item) => item !== id) : [...current.symptomIds, id],
    }));
  }, []);

  const selectedSymptoms = useMemo(() => assessment.symptomIds.map((id) => symptomById.get(id)).filter(Boolean), [assessment.symptomIds]);
  const needsDuration = selectedSymptoms.some((symptom) => symptom.followUps.includes('duration'));
  const needsBreathing = selectedSymptoms.some((symptom) => symptom.followUps.includes('breathingDifficulty'));
  const detailsComplete = Boolean(assessment.answers.safetyReviewed) && (!needsDuration || Boolean(assessment.answers.duration)) && (!needsBreathing || Boolean(assessment.answers.breathingDifficulty));

  const normalisedInput = useCallback(() => ({
    symptomIds: assessment.symptomIds,
    ageGroup: assessment.ageGroup,
    answers: {
      ...(needsDuration && assessment.answers.duration ? { duration: assessment.answers.duration } : {}),
      ...(needsBreathing && assessment.answers.breathingDifficulty ? { breathingDifficulty: assessment.answers.breathingDifficulty } : {}),
      safetyFlags: Array.isArray(assessment.answers.safetyFlags) ? assessment.answers.safetyFlags : [],
    },
  }), [assessment, needsBreathing, needsDuration]);

  const completeAnalysis = useCallback(async () => {
    const input = normalisedInput();
    const localResult = calculateTriageAssessment(input, { language });
    let nextResult = localResult;
    let nextNotice = '';
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 3500);
      const response = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, language }),
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
      if (!response.ok) throw new Error('Triage service unavailable');
      const apiResult = await response.json();
      if (!apiResult.valid) throw new Error('Triage service rejected a valid assessment');
      nextResult = apiResult;
    } catch {
      nextNotice = copy.optionalServiceUnavailable;
    }

    setResult(nextResult);
    setServiceNotice(nextNotice);
    const record = {
      id: createRecordId(),
      createdAt: new Date().toISOString(),
      input,
      result: {
        level: nextResult.level,
        score: nextResult.score,
        redFlag: nextResult.redFlag,
        scoreOverridden: nextResult.scoreOverridden,
      },
    };
    setHistory(saveHistoryRecord(record));
    setWizard('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [copy.optionalServiceUnavailable, language, normalisedInput]);

  const openHistoryRecord = useCallback((record) => {
    const stored = {
      ageGroup: record.input.ageGroup,
      symptomIds: record.input.symptomIds.filter((id) => symptomById.has(id)),
      answers: { duration: '', breathingDifficulty: '', safetyFlags: [], safetyReviewed: true, ...record.input.answers },
    };
    const historicalResult = calculateTriageAssessment(stored, { language });
    if (!historicalResult.valid) return;
    setAssessment(stored);
    setResult(historicalResult);
    setServiceNotice('');
    setWizard('result');
    navigate('/assessment');
  }, [language, navigate]);

  const clearAllHistory = useCallback(() => {
    clearHistory();
    setHistory([]);
  }, []);

  const deleteHistoryRecord = useCallback((id) => {
    setHistory(removeHistoryRecord(id));
  }, []);

  const content = route === '/demo' ? <DemoPage copy={copy} language={language} onStartAssessment={startAssessment} onNavigate={navigate} />
    : route === '/history' ? <HistoryPage copy={copy} language={language} history={history} onOpen={openHistoryRecord} onClear={clearAllHistory} onDelete={deleteHistoryRecord} onStartAssessment={startAssessment} />
      : route === '/privacy' ? <PrivacyPage copy={copy} onStartAssessment={startAssessment} />
        : route === '/assessment' ? <AssessmentPage
          copy={copy}
          language={language}
          stage={wizard}
          assessment={assessment}
          selectedSymptoms={selectedSymptoms}
          needsDuration={needsDuration}
          needsBreathing={needsBreathing}
          detailsComplete={detailsComplete}
          result={result}
          serviceNotice={serviceNotice}
          onSetAssessment={setAssessment}
          onToggleSymptom={toggleSymptom}
          onStage={setWizard}
          onCompleteAnalysis={completeAnalysis}
          onNewAssessment={startAssessment}
        />
          : <HomePage copy={copy} onStartAssessment={startAssessment} onNavigate={navigate} />;

  return (
    <div className="app-shell">
      <AppHeader copy={copy} language={language} theme={theme} currentRoute={route} onLanguageChange={setLanguage} onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} onNavigate={navigate} onRestart={startAssessment} />
      <main>{content}</main>
      <Footer copy={copy} onNavigate={navigate} />
    </div>
  );
}

function HomePage({ copy, onStartAssessment, onNavigate }) {
  return <>
    <section className="home-hero page-width">
      <div className="hero-copy">
        <span className="eyebrow">{copy.heroEyebrow}</span>
        <h1>{copy.heroTitleStart} <em>{copy.heroTitleAccent}</em></h1>
        <p>{copy.heroText}</p>
        <div className="hero-actions">
          <button type="button" className="button primary" onClick={onStartAssessment}>{copy.startAssessment}<ArrowRight size={18} /></button>
          <button type="button" className="button secondary" onClick={() => onNavigate('/#how-it-works')}>{copy.howItWorks}<ChevronRight size={17} /></button>
        </div>
        <div className="hero-metrics" aria-label={copy.modelStrength}>
          <span><strong>{SYMPTOMS.length}</strong><small>{copy.symptomRules}</small></span>
          <span><strong>{RED_FLAG_RULES.length}</strong><small>{copy.emergencyChecks}</small></span>
          <span><strong>100%</strong><small>{copy.explainableLogic}</small></span>
        </div>
        <div className="hero-disclaimer" id="disclaimer"><Info size={18} aria-hidden="true" /><span>{copy.disclaimer}</span></div>
      </div>
      <div className="hero-signal" aria-label={copy.productPromise}>
        <div className="signal-orbit orbit-one" />
        <div className="signal-orbit orbit-two" />
        <div className="signal-core"><ShieldCheck size={42} aria-hidden="true" /><span>{copy.productPromise}</span></div>
        <span className="signal-label label-one">01 <small>{copy.explainable}</small></span>
        <span className="signal-label label-two">02 <small>{copy.fast}</small></span>
        <span className="signal-label label-three">03 <small>{copy.private}</small></span>
      </div>
    </section>

    <section className="principles page-width" aria-label={copy.productPromise}>
      <article><span className="principle-icon teal"><ClipboardCheck size={22} /></span><h2>{copy.explainable}</h2><p>{copy.explainableText}</p></article>
      <article><span className="principle-icon gold"><TimerReset size={22} /></span><h2>{copy.fast}</h2><p>{copy.fastText}</p></article>
      <article><span className="principle-icon plum"><LockKeyhole size={22} /></span><h2>{copy.private}</h2><p>{copy.privateText}</p></article>
    </section>

    <section className="how-it-works page-width" id="how-it-works">
      <div className="how-intro"><span className="eyebrow">{copy.howItWorks}</span><h2>{copy.howTitle}</h2><p>{copy.howText}</p></div>
      <ol>
        <li><span>01</span><div><h3>{copy.howOneTitle}</h3><p>{copy.howOneText}</p></div></li>
        <li><span>02</span><div><h3>{copy.howTwoTitle}</h3><p>{copy.howTwoText}</p></div></li>
        <li><span>03</span><div><h3>{copy.howThreeTitle}</h3><p>{copy.howThreeText}</p></div></li>
      </ol>
    </section>
  </>;
}

function AssessmentPage({
  copy,
  language,
  stage,
  assessment,
  selectedSymptoms,
  needsDuration,
  needsBreathing,
  detailsComplete,
  result,
  serviceNotice,
  onSetAssessment,
  onToggleSymptom,
  onStage,
  onCompleteAnalysis,
  onNewAssessment,
}) {
  const updateAnswers = (key, value) => onSetAssessment((current) => ({ ...current, answers: { ...current.answers, [key]: value } }));
  const goAfterSymptoms = () => {
    if (!assessment.symptomIds.length) return;
    onStage('details');
  };
  const showDetails = true;

  return <section className="assessment page-width">
    {stage !== 'analyzing' && <Progress stage={stage === 'result' ? 'result' : stage} copy={copy} />}
    {stage === 'basic' && <BasicInfoStep copy={copy} assessment={assessment} onSetAssessment={onSetAssessment} onNext={() => onStage('symptoms')} />}
    {stage === 'symptoms' && <SymptomStep copy={copy} language={language} assessment={assessment} onToggle={onToggleSymptom} onBack={() => onStage('basic')} onNext={goAfterSymptoms} />}
    {stage === 'details' && <DetailsStep copy={copy} assessment={assessment} needsDuration={needsDuration} needsBreathing={needsBreathing} complete={detailsComplete} onUpdateAnswers={updateAnswers} onBack={() => onStage('symptoms')} onNext={() => onStage('review')} />}
    {stage === 'review' && <ReviewStep copy={copy} language={language} assessment={assessment} selectedSymptoms={selectedSymptoms} needsDuration={needsDuration} needsBreathing={needsBreathing} complete={Boolean(assessment.ageGroup && assessment.symptomIds.length && (!showDetails || detailsComplete))} onEdit={onStage} onBack={() => onStage(showDetails ? 'details' : 'symptoms')} onAnalyze={() => onStage('analyzing')} />}
    {stage === 'analyzing' && <AnalysisStep copy={copy} onComplete={onCompleteAnalysis} />}
    {stage === 'result' && result && <ResultPanel copy={copy} result={result} serviceNotice={serviceNotice} onNewAssessment={onNewAssessment} />}
  </section>;
}

function BasicInfoStep({ copy, assessment, onSetAssessment, onNext }) {
  return <div className="step-content narrow-content">
    <span className="eyebrow">01 · {copy.basicInfo}</span>
    <h1>{copy.basicInfo}</h1>
    <p className="step-lead">{copy.basicInfoIntro}</p>
    <div className="privacy-brief"><LockKeyhole size={18} aria-hidden="true" /><span>{copy.privacyBrief}</span></div>
    <fieldset className="choice-fieldset">
      <legend>{copy.ageGroup}</legend>
      <div className="choice-grid age-grid">
        {AGE_OPTIONS.map(([id, label]) => <button type="button" key={id} className={`choice-card ${assessment.ageGroup === id ? 'selected' : ''}`} aria-pressed={assessment.ageGroup === id} onClick={() => onSetAssessment((current) => ({ ...current, ageGroup: id }))}>{copy[label]}{assessment.ageGroup === id && <Check size={18} aria-hidden="true" />}</button>)}
      </div>
    </fieldset>
    <StepNav onNext={onNext} nextText={copy.continue} nextDisabled={!assessment.ageGroup} />
  </div>;
}

function SymptomStep({ copy, language, assessment, onToggle, onBack, onNext }) {
  const selectedCount = assessment.symptomIds.length;
  return <div className="step-content">
    <div className="step-heading-row"><div><span className="eyebrow">02 · {copy.symptoms}</span><h1>{copy.symptoms}</h1><p className="step-lead">{copy.symptomIntro}</p></div><span className="selection-count">{selectedCount} {copy.symptomsSelected}</span></div>
    <SymptomSelector copy={copy} language={language} selectedIds={assessment.symptomIds} onToggle={onToggle} />
    {!selectedCount && <div className="selection-empty"><Info size={19} aria-hidden="true" /><span><strong>{copy.noSymptomsSelectedTitle}</strong><small>{copy.noSymptomsSelectedText}</small></span></div>}
    <StepNav onBack={onBack} backText={copy.back} onNext={onNext} nextText={copy.continue} nextDisabled={!selectedCount} />
  </div>;
}

function DetailsStep({ copy, assessment, needsDuration, needsBreathing, complete, onUpdateAnswers, onBack, onNext }) {
  const safetyFlags = Array.isArray(assessment.answers.safetyFlags) ? assessment.answers.safetyFlags : [];
  const toggleSafetyFlag = (id) => {
    const next = safetyFlags.includes(id) ? safetyFlags.filter((item) => item !== id) : [...safetyFlags, id];
    onUpdateAnswers('safetyFlags', next);
    onUpdateAnswers('safetyReviewed', true);
  };
  const clearSafetyFlags = () => {
    onUpdateAnswers('safetyFlags', []);
    onUpdateAnswers('safetyReviewed', true);
  };
  return <div className="step-content narrow-content">
    <span className="eyebrow">03 · {copy.details}</span>
    <h1>{copy.details}</h1>
    <p className="step-lead">{copy.detailsIntro}</p>
    <fieldset className="choice-fieldset details-fieldset safety-check">
      <legend>{copy.safetyCheckTitle}</legend>
      <p>{copy.safetyCheckHelp}</p>
      <div className="option-stack">
        {SAFETY_CHECKS.map(([id, label]) => <OptionButton key={id} label={copy[label]} selected={safetyFlags.includes(id)} danger onClick={() => toggleSafetyFlag(id)} />)}
        <button type="button" className={`option-button safe-option ${assessment.answers.safetyReviewed && safetyFlags.length === 0 ? 'selected' : ''}`} aria-pressed={assessment.answers.safetyReviewed && safetyFlags.length === 0} onClick={clearSafetyFlags}><span>{copy.safetyNone}</span>{assessment.answers.safetyReviewed && safetyFlags.length === 0 && <Check size={18} aria-hidden="true" />}</button>
      </div>
      {safetyFlags.length > 0 && <div className="safety-inline-warning"><AlertTriangle size={17} />{copy.safetyFlagSelected}</div>}
    </fieldset>
    {needsDuration && <fieldset className="choice-fieldset details-fieldset">
      <legend>{copy.durationQuestion}</legend><p>{copy.durationHelp}</p>
      <div className="option-stack">{DURATION_OPTIONS.map(([id, label]) => <OptionButton key={id} label={copy[label]} selected={assessment.answers.duration === id} onClick={() => onUpdateAnswers('duration', id)} />)}</div>
    </fieldset>}
    {needsBreathing && <fieldset className="choice-fieldset details-fieldset">
      <legend>{copy.breathingQuestion}</legend><p>{copy.breathingHelp}</p>
      <div className="option-stack"><OptionButton label={copy.breathingNone} selected={assessment.answers.breathingDifficulty === 'none'} onClick={() => onUpdateAnswers('breathingDifficulty', 'none')} /><OptionButton label={copy.breathingSome} selected={assessment.answers.breathingDifficulty === 'some'} onClick={() => onUpdateAnswers('breathingDifficulty', 'some')} /><OptionButton label={copy.breathingSignificant} selected={assessment.answers.breathingDifficulty === 'significant'} danger onClick={() => onUpdateAnswers('breathingDifficulty', 'significant')} /></div>
    </fieldset>}
    <StepNav onBack={onBack} backText={copy.back} onNext={onNext} nextText={copy.continue} nextDisabled={!complete} />
  </div>;
}

function OptionButton({ label, selected, danger = false, onClick }) {
  return <button type="button" className={`option-button ${selected ? 'selected' : ''} ${danger ? 'danger-option' : ''}`} aria-pressed={selected} onClick={onClick}><span>{label}</span>{selected && <Check size={18} aria-hidden="true" />}</button>;
}

function ReviewStep({ copy, language, assessment, selectedSymptoms, needsDuration, needsBreathing, complete, onEdit, onBack, onAnalyze }) {
  return <div className="step-content narrow-content">
    <span className="eyebrow">04 · {copy.review}</span>
    <h1>{copy.review}</h1>
    <p className="step-lead">{copy.reviewIntro}</p>
    <div className="review-card">
      <ReviewLine label={copy.ageGroup} value={getAgeLabel(assessment.ageGroup, language)} onEdit={() => onEdit('basic')} editLabel={copy.edit} />
      <div className="review-line review-symptoms"><div><span>{copy.symptoms}</span><ul>{selectedSymptoms.map((symptom) => <li key={symptom.id}>{getSymptomText(symptom, language).name}</li>)}</ul></div><button type="button" onClick={() => onEdit('symptoms')}>{copy.edit}</button></div>
      {needsDuration && <ReviewLine label={copy.durationQuestion} value={getDurationLabel(assessment.answers.duration, language) || copy.notAnswered} onEdit={() => onEdit('details')} editLabel={copy.edit} />}
      {needsBreathing && <ReviewLine label={copy.breathingQuestion} value={assessment.answers.breathingDifficulty === 'none' ? copy.breathingNone : assessment.answers.breathingDifficulty === 'some' ? copy.breathingSome : assessment.answers.breathingDifficulty === 'significant' ? copy.breathingSignificant : copy.notAnswered} onEdit={() => onEdit('details')} editLabel={copy.edit} />}
      <ReviewLine label={copy.safetyCheckTitle} value={(assessment.answers.safetyFlags || []).length ? `${assessment.answers.safetyFlags.length} ${copy.safetyFlagsReported}` : copy.safetyNone} onEdit={() => onEdit('details')} editLabel={copy.edit} />
    </div>
    {!complete && <div className="form-error"><AlertTriangle size={18} aria-hidden="true" />{copy.missingAnswers}</div>}
    <StepNav onBack={onBack} backText={copy.back} onNext={onAnalyze} nextText={copy.analyze} nextDisabled={!complete} />
  </div>;
}

function ReviewLine({ label, value, onEdit, editLabel }) {
  return <div className="review-line"><div><span>{label}</span><strong>{value}</strong></div><button type="button" onClick={onEdit}>{editLabel}</button></div>;
}

function AnalysisStep({ copy, onComplete }) {
  const checks = [copy.analysisOne, copy.analysisTwo, copy.analysisThree, copy.analysisFour, copy.analysisFive];
  const [done, setDone] = useState(0);
  useEffect(() => {
    let active = true;
    const timers = checks.map((_, index) => window.setTimeout(() => {
      if (!active) return;
      setDone(index + 1);
      if (index === checks.length - 1) window.setTimeout(() => active && onComplete(), 330);
    }, 180 + index * 240));
    return () => {
      active = false;
      timers.forEach(window.clearTimeout);
    };
  }, [checks.length, onComplete]);
  return <div className="analysis-view narrow-content" aria-live="polite">
    <span className="analysis-symbol"><Sparkles size={27} aria-hidden="true" /></span>
    <span className="eyebrow">TRIAGEAI</span><h1>{copy.analysisTitle}</h1><p>{copy.analysisSubtitle}</p>
    <ol className="analysis-checks">{checks.map((check, index) => <li key={check} className={index < done ? 'done' : index === done ? 'checking' : ''}><span>{index < done ? <Check size={16} aria-hidden="true" /> : <i />}</span>{check}</li>)}</ol>
  </div>;
}

function StepNav({ onBack, backText, onNext, nextText, nextDisabled = false }) {
  return <div className="step-nav">{onBack ? <button type="button" className="button secondary" onClick={onBack}><ArrowLeft size={17} />{backText}</button> : <span />}{onNext && <button type="button" className="button primary" onClick={onNext} disabled={nextDisabled}>{nextText}<ArrowRight size={17} /></button>}</div>;
}

function HistoryPage({ copy, language, history, onOpen, onClear, onDelete, onStartAssessment }) {
  const [confirming, setConfirming] = useState(false);
  const [filter, setFilter] = useState('all');
  const visibleHistory = filter === 'all' ? history : history.filter((item) => item.result.level === filter);
  const grouped = useMemo(() => visibleHistory.reduce((groups, item) => {
    const label = historyDayLabel(item.createdAt, copy, language);
    groups[label] = groups[label] || [];
    groups[label].push(item);
    return groups;
  }, {}), [copy, visibleHistory, language]);
  const levelTitle = (level) => level === 'emergency' ? copy.emergencyTitle : level === 'doctor' ? copy.doctorTitle : copy.selfTitle;

  return <section className="standard-page history-page page-width">
    <span className="eyebrow">LOCAL STORAGE</span><h1>{copy.assessmentHistory}</h1><p className="page-lead">{copy.historyIntro}</p>
    {!history.length ? <div className="empty-history"><ClipboardCheck size={34} aria-hidden="true" /><h2>{copy.noHistory}</h2><p>{copy.noHistoryText}</p><button type="button" className="button primary" onClick={onStartAssessment}>{copy.startAssessment}<ArrowRight size={17} /></button></div> : <>
      <div className="history-toolbar"><span>{copy.filterHistory}</span><div className="history-filters">{['all','self','doctor','emergency'].map((item) => <button type="button" key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item === 'all' ? copy.filterAll : levelTitle(item)}</button>)}</div></div>
      {!visibleHistory.length && <div className="history-filter-empty">{copy.noHistoryFilter}</div>}
      <div className="history-groups">{Object.entries(grouped).map(([day, records]) => <section className="history-group" key={day}><h2>{day}</h2>{records.map((record) => <div className="history-record-wrap" key={record.id}><button className="history-record" type="button" onClick={() => onOpen(record)} aria-label={`${copy.openAssessment}: ${levelTitle(record.result.level)}`}><time>{formatHistoryTime(record.createdAt, language)}</time><span><strong>{levelTitle(record.result.level)}</strong><small>{record.input.symptomIds.map((id) => symptomById.has(id) ? getSymptomText(symptomById.get(id), language).name : id).join(' · ')}</small></span><ChevronRight size={19} aria-hidden="true" /></button><button type="button" className="history-delete" onClick={() => onDelete(record.id)} aria-label={copy.deleteAssessment}><Trash2 size={16} /></button></div>)}</section>)}</div>
      {!confirming ? <button type="button" className="button danger-button" onClick={() => setConfirming(true)}>{copy.clearHistory}</button> : <div className="confirm-clear" role="alert"><div><strong>{copy.confirmClear}</strong><p>{copy.confirmClearText}</p></div><div><button type="button" className="button secondary" onClick={() => setConfirming(false)}>{copy.cancel}</button><button type="button" className="button danger-button" onClick={() => { onClear(); setConfirming(false); }}>{copy.confirm}</button></div></div>}
    </>}
  </section>;
}

function PrivacyPage({ copy, onStartAssessment }) {
  return <section className="standard-page privacy-page page-width">
    <span className="eyebrow">{copy.navPrivacy.toUpperCase()}</span><h1>{copy.privacyTitle}</h1><p className="page-lead">{copy.privacyLead}</p>
    <div className="privacy-grid">
      <article><span><LockKeyhole size={22} /></span><h2>{copy.privacyStorageTitle}</h2><p>{copy.privacyStorageText}</p></article>
      <article><span><ShieldCheck size={22} /></span><h2>{copy.privacyNoTrackingTitle}</h2><p>{copy.privacyNoTrackingText}</p></article>
      <article><span><Stethoscope size={22} /></span><h2>{copy.privacyServiceTitle}</h2><p>{copy.privacyServiceText}</p></article>
    </div>
    <div className="privacy-note"><AlertTriangle size={19} aria-hidden="true" />{copy.privacyNote}</div>
    <button type="button" className="button primary" onClick={onStartAssessment}>{copy.startAssessment}<ArrowRight size={17} /></button>
  </section>;
}

function DemoPage({ copy, language, onStartAssessment, onNavigate }) {
  const [selectedId, setSelectedId] = useState('');
  const [phase, setPhase] = useState(-1);
  const [demoResult, setDemoResult] = useState(null);
  const selectedScenario = DEMO_SCENARIOS.find((scenario) => scenario.id === selectedId);
  const phases = [copy.demoSymptoms, copy.demoRules, copy.demoExplanation, copy.demoResult];

  useEffect(() => {
    if (!selectedScenario) return undefined;
    setPhase(0);
    setDemoResult(null);
    const timers = [
      window.setTimeout(() => setPhase(1), 380),
      window.setTimeout(() => setPhase(2), 820),
      window.setTimeout(() => { setPhase(3); setDemoResult(calculateTriageAssessment(selectedScenario.input, { language })); }, 1260),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [language, selectedScenario]);

  return <section className="demo-page page-width">
    <span className="eyebrow">PRESENTATION FLOW</span><h1>{copy.demoTitle}</h1><p className="page-lead">{copy.demoLead}</p>
    <div className="demo-scenarios">{DEMO_SCENARIOS.map((scenario) => <article className={selectedId === scenario.id ? 'active' : ''} key={scenario.id}><span className={`demo-number ${scenario.id}`}>{scenario.id === 'mild' ? '01' : scenario.id === 'doctor' ? '02' : '03'}</span><h2>{copy[scenario.titleKey]}</h2><p>{copy[scenario.detailKey]}</p><button type="button" className="button secondary" onClick={() => setSelectedId(scenario.id)}>{copy.loadScenario}<ArrowRight size={16} /></button></article>)}</div>
    <div className="demo-stage">
      {!selectedScenario ? <div className="demo-empty"><Sparkles size={28} aria-hidden="true" /><p>{copy.demoReady}</p></div> : <>
        <ol className="demo-timeline">{phases.map((item, index) => <li key={item} className={index <= phase ? 'active' : ''}><span>{index < phase ? <Check size={14} aria-hidden="true" /> : String(index + 1).padStart(2, '0')}</span>{item}</li>)}</ol>
        <div className="demo-selected"><span>{copy.demoSymptoms}</span><strong>{selectedScenario.input.symptomIds.map((id) => getSymptomText(symptomById.get(id), language).name).join(' · ')}</strong></div>
        {demoResult && <ResultPanel copy={copy} result={demoResult} compact onNewAssessment={onStartAssessment} />}
      </>}
    </div>
    <div className="demo-actions"><button type="button" className="button secondary" onClick={() => { setSelectedId(''); setPhase(-1); setDemoResult(null); }}><RotateCcw size={17} />{copy.resetDemo}</button><button type="button" className="button primary" onClick={onStartAssessment}>{copy.startAssessment}<ArrowRight size={17} /></button><button type="button" className="text-button" onClick={() => onNavigate('/')}>{copy.returnHome}</button></div>
  </section>;
}
