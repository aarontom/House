import { Router } from 'express';
import { generateMarketFromPrompt, improveMarketDescription } from '../services/aiService';

const router = Router();

/**
 * Generate a market from a natural language prompt
 */
router.post('/generate-market', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Please provide a prompt describing your prediction market idea',
      });
    }

    if (prompt.length < 10) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Please provide a more detailed description (at least 10 characters)',
      });
    }

    if (prompt.length > 1000) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Prompt is too long (max 1000 characters)',
      });
    }

    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({
        error: 'ConfigurationError',
        message: 'AI service is not configured. Please set ANTHROPIC_API_KEY.',
      });
    }

    const generatedMarket = await generateMarketFromPrompt(prompt);

    res.json({
      success: true,
      market: generatedMarket,
    });
  } catch (error: any) {
    console.error('AI generation error:', error);
    
    // Handle specific API errors
    if (error.status === 401) {
      return res.status(503).json({
        error: 'ConfigurationError',
        message: 'Invalid API key. Please check your ANTHROPIC_API_KEY.',
      });
    }
    
    if (error.status === 429) {
      return res.status(429).json({
        error: 'RateLimitError',
        message: 'Too many requests. Please try again in a moment.',
      });
    }

    res.status(500).json({
      error: 'AIError',
      message: error.message || 'Failed to generate market. Please try again.',
    });
  }
});

/**
 * Improve an existing market description
 */
router.post('/improve-description', async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Please provide both title and description',
      });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({
        error: 'ConfigurationError',
        message: 'AI service is not configured. Please set ANTHROPIC_API_KEY.',
      });
    }

    const improvedDescription = await improveMarketDescription(title, description);

    res.json({
      success: true,
      description: improvedDescription,
    });
  } catch (error: any) {
    console.error('AI improvement error:', error);
    res.status(500).json({
      error: 'AIError',
      message: error.message || 'Failed to improve description. Please try again.',
    });
  }
});

/**
 * Health check for AI service
 */
router.get('/status', (req, res) => {
  const isConfigured = !!process.env.ANTHROPIC_API_KEY;
  
  res.json({
    enabled: isConfigured,
    message: isConfigured 
      ? 'AI service is configured and ready' 
      : 'AI service is not configured (missing ANTHROPIC_API_KEY)',
  });
});

export default router;
