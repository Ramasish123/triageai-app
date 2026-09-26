import { Check } from 'lucide-react';

export function Progress({ stage, copy }) {
  const steps = [
    { id: 'basic', number: '01', label: copy.basicInfo },
    { id: 'symptoms', number: '02', label: copy.symptoms },
    { id: 'details', number: '03', label: copy.details },
    { id: 'review', number: '04', label: copy.review },
    { id: 'result', number: '05', label: copy.resultTitle },
  ];
  const activeIndex = Math.max(0, steps.findIndex((item) => item.id === stage));

  return (
    <ol className="progress" aria-label="Assessment progress">
      {steps.map((item, index) => {
        const isCurrent = index === activeIndex;
        const isDone = index < activeIndex;
        return (
          <li className={`${isCurrent ? 'current' : ''} ${isDone ? 'done' : ''}`} key={item.id} aria-current={isCurrent ? 'step' : undefined}>
            <span className="progress-marker">{isDone ? <Check size={13} aria-hidden="true" /> : item.number}</span>
            <span className="progress-label">{item.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
