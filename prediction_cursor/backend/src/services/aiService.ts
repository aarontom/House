import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface GeneratedMarket {
  title: string;
  description: string;
  category: string;
  suggested_close_days: number;
  resolution_criteria: string;
}

export async function generateMarketFromPrompt(userPrompt: string): Promise<GeneratedMarket> {
  const systemPrompt = `You are a prediction market creation assistant. Your job is to take a user's idea and turn it into a well-structured prediction market.

A prediction market has:
1. A clear YES/NO question as the title
2. A detailed description explaining resolution criteria
3. A category (one of: custom, sports, entertainment, weather, technology, politics, crypto)
4. A suggested duration in days

Rules for good prediction markets:
- The question must be binary (YES or NO outcome)
- The resolution criteria must be unambiguous
- The question should be about a future event
- Include specific dates, numbers, or conditions when relevant
- Make the title compelling and clear

Respond ONLY with valid JSON in this exact format:
{
  "title": "Will [specific event] happen by [date/condition]?",
  "description": "This market resolves YES if [exact conditions]. It resolves NO if [exact opposite conditions]. Resolution will be determined by [source/method].",
  "category": "category_name",
  "suggested_close_days": number,
  "resolution_criteria": "Brief one-line summary of what makes it YES"
}`;

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Create a prediction market for: "${userPrompt}"\n\nRespond with only the JSON, no other text.`,
      },
    ],
    system: systemPrompt,
  });

  // Extract the text content
  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Parse the JSON response
  try {
    // Try to extract JSON from the response (in case there's extra text)
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]) as GeneratedMarket;
    
    // Validate required fields
    if (!parsed.title || !parsed.description || !parsed.category) {
      throw new Error('Missing required fields in generated market');
    }
    
    // Ensure category is valid
    const validCategories = ['custom', 'sports', 'entertainment', 'weather', 'technology', 'politics', 'crypto'];
    if (!validCategories.includes(parsed.category)) {
      parsed.category = 'custom';
    }
    
    // Ensure suggested_close_days is reasonable
    if (!parsed.suggested_close_days || parsed.suggested_close_days < 1) {
      parsed.suggested_close_days = 7;
    }
    if (parsed.suggested_close_days > 365) {
      parsed.suggested_close_days = 365;
    }
    
    return parsed;
  } catch (parseError) {
    console.error('Failed to parse AI response:', content.text);
    throw new Error('Failed to parse AI-generated market. Please try again.');
  }
}

export async function improveMarketDescription(title: string, description: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `Improve this prediction market description to be clearer and more specific.

Title: ${title}
Current Description: ${description}

Provide an improved description that:
1. Clearly states what makes the market resolve YES
2. Clearly states what makes the market resolve NO
3. Specifies any edge cases
4. Is professional but engaging

Respond with ONLY the improved description text, no quotes or explanation.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return content.text.trim();
}
