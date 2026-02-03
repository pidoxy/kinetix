'use server';

/**
 * @fileOverview Summarizes the user's exercise performance, highlighting areas of improvement and overall progress.
 *
 * - generateExerciseSummary - A function that generates the exercise summary.
 * - GenerateExerciseSummaryInput - The input type for the generateExerciseSummary function.
 * - GenerateExerciseSummaryOutput - The return type for the generateExerciseSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateExerciseSummaryInputSchema = z.object({
  exerciseType: z.string().describe('The type of exercise performed (e.g., squats, push-ups).'),
  sessionData: z.string().describe('Data from the session, including reps, sets, form ratings, and any other metrics collected in JSON format.'),
  userGoals: z.string().describe('The fitness goals of the user in JSON format.'),
});
export type GenerateExerciseSummaryInput = z.infer<typeof GenerateExerciseSummaryInputSchema>;

const GenerateExerciseSummaryOutputSchema = z.object({
  summary: z.string().describe('A detailed summary of the exercise session, performance, areas of improvement, and progress towards user goals.'),
});
export type GenerateExerciseSummaryOutput = z.infer<typeof GenerateExerciseSummaryOutputSchema>;

export async function generateExerciseSummary(input: GenerateExerciseSummaryInput): Promise<GenerateExerciseSummaryOutput> {
  return generateExerciseSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateExerciseSummaryPrompt',
  input: {schema: GenerateExerciseSummaryInputSchema},
  output: {schema: GenerateExerciseSummaryOutputSchema},
  prompt: `You are an AI-powered fitness coach providing personalized exercise summaries.

  Based on the exercise type, session data, and user goals, create a comprehensive summary of the user's performance.

  Exercise Type: {{{exerciseType}}}
  Session Data: {{{sessionData}}}
  User Goals: {{{userGoals}}}

  Highlight areas of improvement, provide specific feedback, and showcase overall progress toward their fitness goals.
  The output MUST be formatted as a paragraph.
  `,
});

const generateExerciseSummaryFlow = ai.defineFlow(
  {
    name: 'generateExerciseSummaryFlow',
    inputSchema: GenerateExerciseSummaryInputSchema,
    outputSchema: GenerateExerciseSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
