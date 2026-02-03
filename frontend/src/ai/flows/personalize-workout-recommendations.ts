'use server';

/**
 * @fileOverview This file defines a Genkit flow to personalize workout recommendations based on user performance data and goals.
 *
 * @exported
 * - `personalizeWorkoutRecommendations`: A function that takes user performance data and goals as input and returns personalized workout recommendations.
 * - `PersonalizeWorkoutRecommendationsInput`: The input type for the `personalizeWorkoutRecommendations` function.
 * - `PersonalizeWorkoutRecommendationsOutput`: The output type for the `personalizeWorkoutRecommendations` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizeWorkoutRecommendationsInputSchema = z.object({
  performanceData: z
    .string()
    .describe(
      'A JSON string containing the user’s historical workout performance data, including exercises, sets, reps, weight, and dates.'
    ),
  goals: z
    .string()
    .describe(
      'A JSON string containing the user’s fitness goals, such as muscle gain, weight loss, or improved endurance. Include target body parts.'
    ),
});

export type PersonalizeWorkoutRecommendationsInput = z.infer<
  typeof PersonalizeWorkoutRecommendationsInputSchema
>;

const PersonalizeWorkoutRecommendationsOutputSchema = z.object({
  workoutRecommendations: z
    .string()
    .describe(
      'A JSON string containing personalized workout recommendations, including exercises, sets, reps, and rest times, tailored to the user’s performance data and goals.'
    ),
});

export type PersonalizeWorkoutRecommendationsOutput = z.infer<
  typeof PersonalizeWorkoutRecommendationsOutputSchema
>;

export async function personalizeWorkoutRecommendations(
  input: PersonalizeWorkoutRecommendationsInput
): Promise<PersonalizeWorkoutRecommendationsOutput> {
  return personalizeWorkoutRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizeWorkoutRecommendationsPrompt',
  input: {
    schema: PersonalizeWorkoutRecommendationsInputSchema,
  },
  output: {
    schema: PersonalizeWorkoutRecommendationsOutputSchema,
  },
  prompt: `You are an expert personal trainer specializing in creating personalized workout routines.

You will receive the user's performance data and fitness goals. Based on this information, you will generate a personalized workout routine that is tailored to the user's specific needs and objectives.

Ensure that the workout routine is safe, effective, and challenging. Consider the user's experience level and any physical limitations they may have.

Output a JSON string containing the workout recommendations.  The JSON should contain an array of objects, each representing an exercise.

Each exercise object should contain the exercise name, sets, reps, and rest time.

Example:

{
  "workoutRecommendations": "[{\"exercise\": \"Bench Press\", \"sets\": 3, \"reps\": 8, \"restTime\": \"60 seconds\"}, {\"exercise\": \"Squats\", \"sets\": 3, \"reps\": 8, \"restTime\": \"60 seconds\"}]"
}

User Performance Data: {{{performanceData}}}

User Goals: {{{goals}}}
`,
});

const personalizeWorkoutRecommendationsFlow = ai.defineFlow(
  {
    name: 'personalizeWorkoutRecommendationsFlow',
    inputSchema: PersonalizeWorkoutRecommendationsInputSchema,
    outputSchema: PersonalizeWorkoutRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
