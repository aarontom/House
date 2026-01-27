import { Router } from 'express';
import db from '../db/database';

const router = Router();

/**
 * Get all market templates
 */
router.get('/', (req, res) => {
  try {
    const { category } = req.query;

    let query = 'SELECT * FROM templates';
    const params: any[] = [];

    if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }

    query += ' ORDER BY name ASC';

    const templates = db.prepare(query).all(...params) as any[];

    const templatesWithParsedLogic = templates.map(t => ({
      ...t,
      resolution_logic: JSON.parse(t.resolution_logic)
    }));

    res.json(templatesWithParsedLogic);
  } catch (error: any) {
    res.status(500).json({ error: 'DatabaseError', message: error.message });
  }
});

/**
 * Get a single template by ID
 */
router.get('/:id', (req, res) => {
  try {
    const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id) as any;

    if (!template) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'Template not found'
      });
    }

    res.json({
      ...template,
      resolution_logic: JSON.parse(template.resolution_logic)
    });
  } catch (error: any) {
    res.status(500).json({ error: 'DatabaseError', message: error.message });
  }
});

/**
 * Get template categories
 */
router.get('/meta/categories', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT DISTINCT category FROM templates ORDER BY category
    `).all() as any[];

    res.json(categories.map(c => c.category));
  } catch (error: any) {
    res.status(500).json({ error: 'DatabaseError', message: error.message });
  }
});

export default router;
