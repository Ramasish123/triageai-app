/**
 * Symptom definitions are intentionally data-only.  The UI renders this list
 * and the rule engine reads it, so a new symptom can be added without changing
 * either screen logic or the API scoring code.
 */
export const SYMPTOMS = [
  {
    id: 'mild_headache',
    category: 'general',
    weight: 1,
    followUps: [],
    redFlag: false,
    name: { en: 'Mild headache', bn: 'হালকা মাথাব্যথা' },
    description: { en: 'A mild, non-sudden pain or pressure in the head.', bn: 'হঠাৎ শুরু হয়নি এমন হালকা মাথাব্যথা বা চাপ।' },
  },
  {
    id: 'fever',
    category: 'general',
    weight: 1,
    followUps: ['duration'],
    redFlag: false,
    name: { en: 'Fever', bn: 'জ্বর' },
    description: { en: 'Feeling unusually hot or having a raised temperature.', bn: 'অস্বাভাবিক গরম লাগা বা শরীরের তাপমাত্রা বেড়ে যাওয়া।' },
  },
  {
    id: 'fatigue',
    category: 'general',
    weight: 1,
    followUps: [],
    redFlag: false,
    name: { en: 'Fatigue', bn: 'অস্বাভাবিক ক্লান্তি' },
    description: { en: 'Unusual tiredness or low energy.', bn: 'অস্বাভাবিক ক্লান্তি বা শক্তি কম লাগা।' },
  },
  {
    id: 'persistent_cough',
    category: 'respiratory',
    weight: 2,
    followUps: ['duration'],
    redFlag: false,
    name: { en: 'Persistent cough', bn: 'স্থায়ী কাশি' },
    description: { en: 'A cough that continues or keeps returning.', bn: 'বারবার ফিরে আসে বা থামছে না এমন কাশি।' },
  },
  {
    id: 'sore_throat',
    category: 'respiratory',
    weight: 1,
    followUps: [],
    redFlag: false,
    name: { en: 'Sore throat', bn: 'গলা ব্যথা' },
    description: { en: 'Irritation, scratchiness, or pain in the throat.', bn: 'গলায় জ্বালা, খসখস ভাব বা ব্যথা।' },
  },
  {
    id: 'shortness_of_breath',
    category: 'respiratory',
    weight: 4,
    followUps: ['breathingDifficulty'],
    redFlag: false,
    name: { en: 'Shortness of breath', bn: 'শ্বাসকষ্ট' },
    description: { en: 'Difficulty breathing or feeling unusually breathless.', bn: 'শ্বাস নিতে কষ্ট হওয়া বা অস্বাভাবিক হাঁপ ধরা।' },
  },
  {
    id: 'chest_pain',
    category: 'cardiac',
    weight: 5,
    followUps: ['breathingDifficulty'],
    redFlag: false,
    name: { en: 'Chest pain or pressure', bn: 'বুকের ব্যথা বা চাপ' },
    description: { en: 'Pain, pressure, or tightness in the chest.', bn: 'বুকে ব্যথা, চাপ বা টান লাগা।' },
  },
  {
    id: 'repeated_vomiting',
    category: 'gastrointestinal',
    weight: 3,
    followUps: ['duration'],
    redFlag: false,
    name: { en: 'Repeated vomiting', bn: 'বারবার বমি' },
    description: { en: 'Vomiting repeatedly or struggling to keep fluids down.', bn: 'বারবার বমি হওয়া বা তরল খাবার ধরে রাখতে কষ্ট হওয়া।' },
  },
  {
    id: 'abdominal_pain',
    category: 'gastrointestinal',
    weight: 2,
    followUps: ['duration'],
    redFlag: false,
    name: { en: 'Abdominal pain', bn: 'পেটব্যথা' },
    description: { en: 'Pain or discomfort in the stomach or abdomen.', bn: 'পেট বা উদরের ব্যথা কিংবা অস্বস্তি।' },
  },
  {
    id: 'sudden_confusion',
    category: 'neurological',
    weight: 0,
    followUps: [],
    redFlag: true,
    name: { en: 'Sudden confusion', bn: 'হঠাৎ বিভ্রান্তি' },
    description: { en: 'New confusion, unusual behavior, or trouble thinking clearly.', bn: 'নতুন করে বিভ্রান্তি, অস্বাভাবিক আচরণ বা পরিষ্কারভাবে ভাবতে কষ্ট।' },
  },
  {
    id: 'one_sided_weakness',
    category: 'neurological',
    weight: 0,
    followUps: [],
    redFlag: true,
    name: { en: 'Sudden one-sided weakness', bn: 'হঠাৎ শরীরের এক পাশ দুর্বল হওয়া' },
    description: { en: 'New weakness or numbness affecting one side of the body.', bn: 'শরীরের এক পাশে নতুন দুর্বলতা বা অবশ ভাব।' },
  },
  {
    id: 'loss_of_consciousness',
    category: 'neurological',
    weight: 0,
    followUps: [],
    redFlag: true,
    name: { en: 'Fainting or loss of consciousness', bn: 'অজ্ঞান হওয়া বা জ্ঞান হারানো' },
    description: { en: 'Passing out or unexpectedly losing consciousness.', bn: 'হঠাৎ অজ্ঞান হয়ে যাওয়া বা জ্ঞান হারানো।' },
  },
  {
    id: 'severe_bleeding',
    category: 'injury',
    weight: 0,
    followUps: [],
    redFlag: true,
    name: { en: 'Severe bleeding', bn: 'অতিরিক্ত রক্তপাত' },
    description: { en: 'Heavy bleeding that is difficult to control.', bn: 'অনেক রক্তপাত যা বন্ধ করা কঠিন।' },
  },
  {
    id: 'new_rash',
    category: 'other',
    weight: 1,
    followUps: [],
    redFlag: false,
    name: { en: 'New rash', bn: 'নতুন র‍্যাশ' },
    description: { en: 'A new unexplained rash or change in the skin.', bn: 'ত্বকে নতুন, অজানা র‍্যাশ বা পরিবর্তন।' },
  },
];

export const CATEGORIES = [
  { id: 'general', label: { en: 'General', bn: 'সাধারণ' } },
  { id: 'respiratory', label: { en: 'Respiratory', bn: 'শ্বাসতন্ত্র' } },
  { id: 'neurological', label: { en: 'Neurological', bn: 'স্নায়বিক' } },
  { id: 'cardiac', label: { en: 'Cardiac', bn: 'হৃদ্‌যন্ত্র' } },
  { id: 'gastrointestinal', label: { en: 'Gastrointestinal', bn: 'পাচনতন্ত্র' } },
  { id: 'injury', label: { en: 'Injury / trauma', bn: 'আঘাত / ট্রমা' } },
  { id: 'other', label: { en: 'Other', bn: 'অন্যান্য' } },
];

export const symptomById = new Map(SYMPTOMS.map((symptom) => [symptom.id, symptom]));

export function getSymptomText(symptom, language = 'en') {
  return {
    name: symptom.name[language] || symptom.name.en,
    description: symptom.description[language] || symptom.description.en,
  };
}

export function toPublicSymptoms(language = 'en') {
  return SYMPTOMS.map((symptom) => ({
    id: symptom.id,
    category: symptom.category,
    weight: symptom.weight,
    followUps: symptom.followUps,
    redFlag: symptom.redFlag,
    ...getSymptomText(symptom, language),
  }));
}
