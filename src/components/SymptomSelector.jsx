import { useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { CATEGORIES, getSymptomText, SYMPTOMS } from '../data/symptoms.js';

export function SymptomSelector({ copy, language, selectedIds, onToggle }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const normalizedQuery = query.trim().toLocaleLowerCase(language === 'bn' ? 'bn' : 'en');
  const matchingSymptoms = useMemo(() => {
    return SYMPTOMS.filter((symptom) => {
      const { name, description } = getSymptomText(symptom, language);
      const text = `${name} ${description}`.toLocaleLowerCase(language === 'bn' ? 'bn' : 'en');
      return (category === 'all' || symptom.category === category) && (!normalizedQuery || text.includes(normalizedQuery));
    });
  }, [category, language, normalizedQuery]);

  return (
    <div className="symptom-selector">
      <div className="search-row">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">{copy.searchSymptoms}</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.searchPlaceholder} type="search" />
          {query && <button type="button" onClick={() => setQuery('')} aria-label={copy.clearSearch}><X size={16} /></button>}
        </label>
      </div>
      <div className="category-tabs" role="toolbar" aria-label={copy.symptoms}>
        <button type="button" className={category === 'all' ? 'selected' : ''} aria-pressed={category === 'all'} onClick={() => setCategory('all')}>{copy.allCategories}</button>
        {CATEGORIES.map((item) => <button type="button" key={item.id} className={category === item.id ? 'selected' : ''} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.label[language] || item.label.en}</button>)}
      </div>
      {matchingSymptoms.length ? (
        <div className="symptom-grid" aria-label={copy.symptoms}>
          {matchingSymptoms.map((symptom) => {
            const selected = selectedIds.includes(symptom.id);
            const text = getSymptomText(symptom, language);
            const categoryText = CATEGORIES.find((item) => item.id === symptom.category)?.label[language] || symptom.category;
            return <button type="button" key={symptom.id} className={`symptom-card ${selected ? 'selected' : ''} ${symptom.redFlag ? 'red-flag' : ''}`} aria-pressed={selected} onClick={() => onToggle(symptom.id)}>
              <span className="symptom-check" aria-hidden="true">{selected && <Check size={15} />}</span>
              <span className="symptom-copy"><span className="symptom-name">{text.name}</span><span className="symptom-description">{text.description}</span><span className="symptom-category">{categoryText}</span></span>
              {symptom.redFlag && <span className="warning-label">!</span>}
            </button>;
          })}
        </div>
      ) : <div className="empty-search"><Search size={22} aria-hidden="true" /><p>{copy.noSymptomsFound}</p></div>}
    </div>
  );
}
