import { symptomById, getSymptomText } from '../data/symptoms.js';
import { getTriggeredRedFlags, RED_FLAG_RULES, SAFETY_FLAG_IDS } from '../data/redFlags.js';

export const AGE_GROUPS = ['under_18', 'age_18_39', 'age_40_64', 'age_65_plus'];
export const DURATIONS = ['less_than_24h', 'one_to_three_days', 'four_to_seven_days', 'more_than_7_days'];
export const ENGINE_VERSION = '2.1.0';

const AGE_LABELS = {
  under_18: { en: 'Under 18', bn: '১৮ বছরের কম' },
  age_18_39: { en: '18–39', bn: '১৮–৩৯' },
  age_40_64: { en: '40–64', bn: '৪০–৬৪' },
  age_65_plus: { en: '65+', bn: '৬৫+' },
};

const DURATION_LABELS = {
  less_than_24h: { en: 'Less than 24 hours', bn: '২৪ ঘণ্টার কম' },
  one_to_three_days: { en: '1–3 days', bn: '১–৩ দিন' },
  four_to_seven_days: { en: '4–7 days', bn: '৪–৭ দিন' },
  more_than_7_days: { en: 'More than 7 days', bn: '৭ দিনের বেশি' },
};

const RECOMMENDATIONS = {
  self: {
    timeframe: { en: 'Monitor at home', bn: 'বাড়িতে পর্যবেক্ষণ করুন' },
    items: {
      en: [
        'Rest and monitor how you feel.',
        'Stay hydrated as appropriate for you.',
        'Reassess if symptoms persist, worsen, or new warning signs appear.',
      ],
      bn: [
        'বিশ্রাম নিন এবং কেমন লাগছে তা পর্যবেক্ষণ করুন।',
        'আপনার জন্য উপযুক্তভাবে পর্যাপ্ত তরল পান করুন।',
        'উপসর্গ থেকে গেলে, বেড়ে গেলে বা নতুন সতর্কতা দেখা দিলে আবার মূল্যায়ন করুন।',
      ],
    },
  },
  doctor: {
    timeframe: { en: 'Within 24–48 hours', bn: '২৪–৪৮ ঘণ্টার মধ্যে' },
    items: {
      en: [
        'Arrange medical advice within about 24–48 hours.',
        'Seek care sooner if symptoms become significantly worse or new warning signs appear.',
        'Take note of symptom changes to share with a clinician.',
      ],
      bn: [
        'প্রায় ২৪–৪৮ ঘণ্টার মধ্যে চিকিৎসকের পরামর্শ নেওয়ার ব্যবস্থা করুন।',
        'উপসর্গ অনেক বেড়ে গেলে বা নতুন সতর্কতা দেখা দিলে আরও আগে চিকিৎসা নিন।',
        'চিকিৎসককে জানাতে উপসর্গের পরিবর্তনগুলো লিখে রাখুন।',
      ],
    },
  },
  emergency: {
    timeframe: { en: 'Now', bn: 'এখনই' },
    items: {
      en: [
        'Contact local emergency services or go to the nearest emergency department now.',
        'Do not drive yourself if you are severely unwell, faint, confused, or struggling to breathe.',
        'If possible, ask someone to stay with you while help is arranged.',
      ],
      bn: [
        'এখনই স্থানীয় জরুরি সেবার সঙ্গে যোগাযোগ করুন বা নিকটস্থ জরুরি বিভাগে যান।',
        'খুব অসুস্থ, অজ্ঞান, বিভ্রান্ত বা শ্বাস নিতে কষ্ট হলে নিজে গাড়ি চালাবেন না।',
        'সম্ভব হলে সাহায্যের ব্যবস্থা হওয়ার সময় কাউকে পাশে থাকতে বলুন।',
      ],
    },
  },
};

function text(value, language) {
  return value[language] || value.en;
}

function localized(language, en, bn) {
  return language === 'bn' ? bn : en;
}

/**
 * Validates the small, non-identifying assessment payload. The server calls
 * this before calculating; the client also uses the pure engine for graceful
 * local fallback if its optional service cannot be reached.
 */
export function validateTriageInput(input) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, errors: ['Assessment input must be an object.'] };
  }

  const { symptomIds, ageGroup, answers = {} } = input;
  if (!Array.isArray(symptomIds) || symptomIds.length === 0) {
    errors.push('Select at least one symptom.');
  } else if (symptomIds.some((id) => typeof id !== 'string' || !symptomById.has(id))) {
    errors.push('One or more selected symptoms are not recognized.');
  }
  if (!AGE_GROUPS.includes(ageGroup)) {
    errors.push('Choose a valid age group.');
  }
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    errors.push('Answers must be an object.');
  } else {
    if (answers.duration !== undefined && !DURATIONS.includes(answers.duration)) {
      errors.push('Choose a valid symptom duration.');
    }
    if (answers.breathingDifficulty !== undefined && !['none', 'some', 'significant'].includes(answers.breathingDifficulty)) {
      errors.push('Choose a valid breathing answer.');
    }
    if (answers.suddenOnset !== undefined && typeof answers.suddenOnset !== 'boolean') {
      errors.push('The sudden-onset answer must be true or false.');
    }
    if (answers.safetyFlags !== undefined && (!Array.isArray(answers.safetyFlags) || answers.safetyFlags.some((id) => !SAFETY_FLAG_IDS.includes(id)))) {
      errors.push('One or more emergency warning-sign answers are not recognized.');
    }
  }
  return { valid: errors.length === 0, errors };
}

function calculateAdjustments(symptoms, input, language) {
  const adjustments = [];
  const ids = new Set(symptoms.map((symptom) => symptom.id));
  const duration = input.answers?.duration;

  // Duration only affects the symptoms that explicitly ask it. These are
  // transparent product rules rather than diagnostic claims.
  if (ids.has('fever') && ['four_to_seven_days', 'more_than_7_days'].includes(duration)) {
    adjustments.push({
      id: 'fever_duration',
      type: 'duration',
      points: 2,
      label: localized(language, 'Fever duration adjustment', 'জ্বরের সময়কাল সমন্বয়'),
      detail: localized(
        language,
        `Fever has lasted ${text(DURATION_LABELS[duration], language).toLowerCase()}, so the model adds 2 points.`,
        `জ্বর ${text(DURATION_LABELS[duration], language)} ধরে আছে, তাই মডেলে ২ পয়েন্ট যোগ হয়েছে।`,
      ),
    });
  }
  if (ids.has('persistent_cough') && duration === 'more_than_7_days') {
    adjustments.push({
      id: 'cough_duration',
      type: 'duration',
      points: 2,
      label: localized(language, 'Persistent-cough duration adjustment', 'স্থায়ী কাশির সময়কাল সমন্বয়'),
      detail: localized(
        language,
        'A persistent cough reported for more than 7 days adds 2 points.',
        '৭ দিনের বেশি স্থায়ী কাশির জন্য ২ পয়েন্ট যোগ হয়েছে।',
      ),
    });
  }
  if (input.ageGroup === 'age_65_plus') {
    adjustments.push({
      id: 'age_65_plus',
      type: 'age',
      points: 1,
      label: localized(language, 'Age-group adjustment', 'বয়স-ভিত্তিক সমন্বয়'),
      detail: localized(
        language,
        'The model adds 1 point for the 65+ age group to encourage earlier non-emergency advice.',
        'জরুরি নয় এমন অবস্থায় দ্রুত পরামর্শ উৎসাহিত করতে ৬৫+ বয়সের জন্য মডেলে ১ পয়েন্ট যোগ হয়।',
      ),
    });
  }
  return adjustments;
}

/**
 * Deterministic, explainable triage calculation. This returns guidance—not a
 * diagnosis—and deliberately exposes each rule contribution to the UI/API.
 */
export function calculateTriageAssessment(input, options = {}) {
  const language = options.language === 'bn' ? 'bn' : 'en';
  const validation = validateTriageInput(input);
  if (!validation.valid) {
    return {
      valid: false,
      errors: validation.errors,
      level: null,
      score: null,
      redFlag: false,
      reasons: [],
      adjustments: [],
      redFlags: [],
      recommendations: [],
    };
  }

  const uniqueIds = [...new Set(input.symptomIds)];
  const selectedSymptoms = uniqueIds.map((id) => symptomById.get(id));
  const reasons = selectedSymptoms.map((symptom) => {
    const copy = getSymptomText(symptom, language);
    return {
      id: symptom.id,
      type: 'symptom',
      label: copy.name,
      detail: copy.description,
      points: symptom.weight,
    };
  });
  const baseScore = reasons.reduce((total, reason) => total + reason.points, 0);
  const adjustments = calculateAdjustments(selectedSymptoms, input, language);
  const score = baseScore + adjustments.reduce((total, adjustment) => total + adjustment.points, 0);
  const matchingRedFlags = getTriggeredRedFlags(uniqueIds, input.answers || {}).map((rule) => ({
    id: rule.id,
    message: text(rule.message, language),
  }));
  const redFlag = matchingRedFlags.length > 0;
  const level = redFlag ? 'emergency' : score >= 8 ? 'emergency' : score >= 4 ? 'doctor' : 'self';
  const guidance = RECOMMENDATIONS[level];
  const expectedFollowUps = [...new Set(selectedSymptoms.flatMap((symptom) => symptom.followUps))];
  const answeredFollowUps = expectedFollowUps.filter((key) => input.answers?.[key] !== undefined && input.answers?.[key] !== '');
  const inputCoverage = expectedFollowUps.length ? Math.round((answeredFollowUps.length / expectedFollowUps.length) * 100) : 100;
  const decisionPath = redFlag ? 'red_flag_override' : score >= 8 ? 'score_emergency' : score >= 4 ? 'score_doctor' : 'score_self';

  return {
    valid: true,
    errors: [],
    level,
    score,
    baseScore,
    redFlag,
    scoreOverridden: redFlag,
    redFlags: matchingRedFlags,
    reasons,
    adjustments,
    selectedSymptoms: selectedSymptoms.map((symptom) => ({
      id: symptom.id,
      ...getSymptomText(symptom, language),
      category: symptom.category,
      weight: symptom.weight,
    })),
    input: {
      symptomIds: uniqueIds,
      ageGroup: input.ageGroup,
      ageLabel: text(AGE_LABELS[input.ageGroup], language),
      answers: { ...input.answers },
      durationLabel: input.answers?.duration ? text(DURATION_LABELS[input.answers.duration], language) : null,
    },
    timeframe: text(guidance.timeframe, language),
    recommendations: guidance.items[language] || guidance.items.en,
    model: {
      engineVersion: ENGINE_VERSION,
      decisionPath,
      inputCoverage,
      symptomRulesEvaluated: selectedSymptoms.length,
      emergencyRulesEvaluated: RED_FLAG_RULES.length,
      adjustmentsApplied: adjustments.length,
      deterministic: true,
    },
  };
}

export function getAgeLabel(ageGroup, language = 'en') {
  return AGE_LABELS[ageGroup] ? text(AGE_LABELS[ageGroup], language) : '';
}

export function getDurationLabel(duration, language = 'en') {
  return DURATION_LABELS[duration] ? text(DURATION_LABELS[duration], language) : '';
}
