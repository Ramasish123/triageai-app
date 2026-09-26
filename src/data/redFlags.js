/** Explicit emergency patterns. These rules are deliberately narrow and are
 * evaluated before the normal score. */
export const SAFETY_FLAG_IDS = ['severe_allergic_reaction', 'active_seizure', 'hard_to_wake', 'blue_grey_lips'];

export const RED_FLAG_RULES = [
  {
    id: 'chest_pain_and_breathlessness',
    symptomIds: ['chest_pain', 'shortness_of_breath'],
    message: {
      en: 'Chest pain or pressure and shortness of breath were selected together.',
      bn: 'বুকের ব্যথা বা চাপ এবং শ্বাসকষ্ট একসঙ্গে নির্বাচিত হয়েছে।',
    },
  },
  {
    id: 'sudden_confusion',
    symptomIds: ['sudden_confusion'],
    message: {
      en: 'Sudden confusion was selected.',
      bn: 'হঠাৎ বিভ্রান্তি নির্বাচিত হয়েছে।',
    },
  },
  {
    id: 'severe_bleeding',
    symptomIds: ['severe_bleeding'],
    message: {
      en: 'Severe bleeding was selected.',
      bn: 'অতিরিক্ত রক্তপাত নির্বাচিত হয়েছে।',
    },
  },
  {
    id: 'one_sided_weakness',
    symptomIds: ['one_sided_weakness'],
    message: {
      en: 'Sudden one-sided weakness was selected.',
      bn: 'হঠাৎ শরীরের এক পাশ দুর্বল হওয়া নির্বাচিত হয়েছে।',
    },
  },
  {
    id: 'loss_of_consciousness',
    symptomIds: ['loss_of_consciousness'],
    message: {
      en: 'Fainting or loss of consciousness was selected.',
      bn: 'অজ্ঞান হওয়া বা জ্ঞান হারানোর কথা নির্বাচিত হয়েছে।',
    },
  },

  {
    id: 'severe_allergic_reaction',
    symptomIds: [],
    answerIncludes: { key: 'safetyFlags', value: 'severe_allergic_reaction' },
    message: {
      en: 'A severe allergic reaction warning sign was reported.',
      bn: 'গুরুতর অ্যালার্জিক প্রতিক্রিয়ার সতর্কতা জানানো হয়েছে।',
    },
  },
  {
    id: 'active_seizure',
    symptomIds: [],
    answerIncludes: { key: 'safetyFlags', value: 'active_seizure' },
    message: {
      en: 'An active or repeated seizure warning sign was reported.',
      bn: 'চলমান বা বারবার খিঁচুনির সতর্কতা জানানো হয়েছে।',
    },
  },
  {
    id: 'hard_to_wake',
    symptomIds: [],
    answerIncludes: { key: 'safetyFlags', value: 'hard_to_wake' },
    message: {
      en: 'Difficulty staying awake or being woken was reported.',
      bn: 'জেগে থাকতে বা জাগাতে অসুবিধার কথা জানানো হয়েছে।',
    },
  },
  {
    id: 'blue_grey_lips',
    symptomIds: [],
    answerIncludes: { key: 'safetyFlags', value: 'blue_grey_lips' },
    message: {
      en: 'Blue or grey lips/face were reported.',
      bn: 'ঠোঁট বা মুখ নীল/ধূসর হওয়ার কথা জানানো হয়েছে।',
    },
  },
  {
    id: 'severe_breathing_difficulty',
    symptomIds: ['shortness_of_breath'],
    answer: { key: 'breathingDifficulty', value: 'significant' },
    message: {
      en: 'Significant difficulty breathing was reported.',
      bn: 'উল্লেখযোগ্য শ্বাসকষ্টের কথা জানানো হয়েছে।',
    },
  },
];

export function getTriggeredRedFlags(symptomIds, answers = {}) {
  const selected = new Set(symptomIds);
  return RED_FLAG_RULES.filter((rule) => {
    const symptomsMatch = rule.symptomIds.every((id) => selected.has(id));
    const answerMatches = !rule.answer || answers[rule.answer.key] === rule.answer.value;
    const answerIncludes = !rule.answerIncludes || (Array.isArray(answers[rule.answerIncludes.key]) && answers[rule.answerIncludes.key].includes(rule.answerIncludes.value));
    return symptomsMatch && answerMatches && answerIncludes;
  });
}
