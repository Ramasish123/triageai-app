# TriageAI 2.1 feature expansion

## Added
- Emergency warning-sign checklist before result calculation.
- Four new emergency override rules: severe allergic reaction, active/repeated seizure, difficult to wake/unresponsive, and blue/grey lips or face.
- Result actions: copy, native share, print, and download a plain-text summary.
- More detailed audit panel with engine version, rules checked, input coverage, and decision path.
- History filters for all / self-care / clinician / emergency outcomes.
- Delete individual history records as well as clearing all history.
- Responsive styling for the new controls and print-friendly result pages.
- English and Bengali labels for all new user-facing features.
- Engine bumped to v2.1.0 with input validation for emergency checklist values.

## Verification
- 21 deterministic engine tests pass.
- A production Vite build was not completed in the execution container because dependency installation timed out. Run `npm install` and `npm run build` locally.
