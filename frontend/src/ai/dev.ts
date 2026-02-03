import { config } from 'dotenv';
config();

import '@/ai/flows/generate-exercise-summary.ts';
import '@/ai/flows/personalize-workout-recommendations.ts';
import '@/ai/flows/provide-real-time-form-correction.ts';