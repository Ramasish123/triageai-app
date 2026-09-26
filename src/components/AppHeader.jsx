import { Activity, FlaskConical, History, Languages, Moon, RotateCcw, Shield, Sun } from 'lucide-react';

export function AppHeader({
  copy,
  language,
  theme,
  currentRoute,
  onLanguageChange,
  onToggleTheme,
  onNavigate,
  onRestart,
}) {
  const navigate = (event, route) => {
    event.preventDefault();
    onNavigate(route);
  };

  return (
    <header className="app-header">
      <a className="brand" href="/" onClick={(event) => navigate(event, '/')} aria-label="TriageAI home">
        <span className="brand-mark" aria-hidden="true"><Activity size={20} strokeWidth={2.2} /></span>
        <span>
          <strong>TriageAI</strong>
          <small>{copy.brandTagline}</small>
        </span>
      </a>

      <nav className="header-actions" aria-label={copy.appMenu}>
        <label className="language-control" title={copy.languageLabel}>
          <Languages aria-hidden="true" size={17} />
          <span className="sr-only">{copy.languageLabel}</span>
          <select value={language} onChange={(event) => onLanguageChange(event.target.value)} aria-label={copy.languageLabel}>
            <option value="en">EN</option>
            <option value="bn">বাংলা</option>
          </select>
        </label>
        <button className="header-icon" type="button" onClick={onToggleTheme} aria-label={theme === 'dark' ? copy.switchToLight : copy.switchToDark} title={theme === 'dark' ? copy.switchToLight : copy.switchToDark}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <a className={`header-link ${currentRoute === '/history' ? 'current' : ''}`} href="/history" onClick={(event) => navigate(event, '/history')}>
          <History size={17} aria-hidden="true" />
          <span>{copy.navHistory}</span>
        </a>
        <button className="header-icon restart-button" type="button" onClick={onRestart} aria-label={copy.restart} title={copy.restart}>
          <RotateCcw size={17} />
        </button>
        <a className={`header-icon demo-link ${currentRoute === '/demo' ? 'current' : ''}`} href="/demo" onClick={(event) => navigate(event, '/demo')} aria-label={copy.navDemo} title={copy.navDemo}>
          <FlaskConical size={17} />
        </a>
      </nav>
    </header>
  );
}

export function Footer({ copy, onNavigate }) {
  const navigate = (event, route) => {
    event.preventDefault();
    onNavigate(route);
  };

  return (
    <footer className="site-footer">
      <div className="footer-brand"><Shield size={17} aria-hidden="true" /><span><strong>TriageAI</strong><small>{copy.footerGuidance}</small></span></div>
      <div className="footer-links">
        <a href="/privacy" onClick={(event) => navigate(event, '/privacy')}>{copy.navPrivacy}</a>
        <a href="/#how-it-works" onClick={(event) => navigate(event, '/#how-it-works')}>{copy.howItWorks}</a>
        <a href="/#disclaimer" onClick={(event) => navigate(event, '/#disclaimer')}>{copy.disclaimer.split('.')[0]}</a>
      </div>
      <small className="footer-credit">{copy.builtFor}</small>
    </footer>
  );
}
