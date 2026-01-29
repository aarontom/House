import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getYesPrice, getNoPrice, initializeMarketStateWithProbability } from '../services/ammEngine';

const DB_PATH = join(__dirname, '../../data/prediction_market.db');

// Ensure data directory exists
import { mkdirSync } from 'fs';
try {
  mkdirSync(join(__dirname, '../../data'), { recursive: true });
} catch (e) {
  // Directory exists
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase() {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);
  console.log('Database schema initialized');
  
  // Seed default data
  seedDefaultData();
}

function seedDefaultData() {
  // Check if demo user exists
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get('demo');
  if (existingUser) {
    console.log('Default data already exists');
    return;
  }

  // Create demo user
  const demoUserId = uuidv4();
  const passwordHash = bcrypt.hashSync('demo123', 10);
  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, balance)
    VALUES (?, ?, ?, ?, ?)
  `).run(demoUserId, 'demo', 'demo@example.com', passwordHash, 1000);

  // Create market templates
  const templates = [
    {
      id: uuidv4(),
      name: 'Crypto Price Threshold',
      category: 'crypto',
      description: 'Will a cryptocurrency be above/below a price threshold?',
      resolution_source: 'https://api.coingecko.com/api/v3/simple/price?ids={coin}&vs_currencies=usd',
      resolution_logic: JSON.stringify({ path: '{coin}.usd' }),
      default_duration_hours: 24
    },
    {
      id: uuidv4(),
      name: 'Weather Condition',
      category: 'weather',
      description: 'Will a specific weather condition occur?',
      resolution_source: 'https://api.openweathermap.org/data/2.5/weather?q={city}&appid={apikey}',
      resolution_logic: JSON.stringify({ path: 'weather[0].main' }),
      default_duration_hours: 24
    },
    {
      id: uuidv4(),
      name: 'Custom Yes/No',
      category: 'custom',
      description: 'Create a custom yes/no market with manual resolution',
      resolution_source: 'manual',
      resolution_logic: JSON.stringify({ path: 'manual' }),
      default_duration_hours: 168
    }
  ];

  const insertTemplate = db.prepare(`
    INSERT INTO templates (id, name, category, description, resolution_source, resolution_logic, default_duration_hours)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const t of templates) {
    insertTemplate.run(t.id, t.name, t.category, t.description, t.resolution_source, t.resolution_logic, t.default_duration_hours);
  }

  // Create additional sample users for more realistic markets
  const sarahId = uuidv4();
  const mikeId = uuidv4();
  const jessicaId = uuidv4();
  
  db.prepare(`INSERT INTO users (id, username, email, password_hash, balance) VALUES (?, ?, ?, ?, ?)`)
    .run(sarahId, 'sarah_hosts', 'sarah@house.bet', passwordHash, 1000);
  db.prepare(`INSERT INTO users (id, username, email, password_hash, balance) VALUES (?, ?, ?, ?, ?)`)
    .run(mikeId, 'mike_events', 'mike@house.bet', passwordHash, 1000);
  db.prepare(`INSERT INTO users (id, username, email, password_hash, balance) VALUES (?, ?, ?, ?, ?)`)
    .run(jessicaId, 'jessica_bets', 'jessica@house.bet', passwordHash, 1000);

  // Create sample markets with LMSR-compatible initial states
  const now = new Date();
  const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const inFiveDays = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const inTwoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  // For LMSR: liquidity_pool is the 'b' parameter
  // Starting at 0,0 gives 50/50 odds. Use initializeMarketStateWithProbability for other odds.
  const liquidity = 100;

  // Various starting probabilities for realistic markets
  const prob50 = { total_yes_shares: 0, total_no_shares: 0, liquidity_pool: liquidity };
  const prob65 = initializeMarketStateWithProbability(liquidity, 0.65);
  const prob35 = initializeMarketStateWithProbability(liquidity, 0.35);
  const prob70 = initializeMarketStateWithProbability(liquidity, 0.70);
  const prob45 = initializeMarketStateWithProbability(liquidity, 0.45);
  const prob55 = initializeMarketStateWithProbability(liquidity, 0.55);

  // Consumer-focused markets - everyday predictions people care about
  const markets = [
    {
      id: uuidv4(),
      template_id: templates[2].id,
      title: 'Will it snow in NYC this weekend?',
      description: 'Resolves YES if any measurable snowfall (0.1" or more) is recorded in Central Park between Friday 6pm and Sunday midnight ET. Will post weather updates throughout the week.',
      category: 'weather',
      resolution_source: 'manual',
      resolution_criteria: JSON.stringify({ path: 'manual', operator: 'equals', value: true, description: 'Measurable snow in Central Park' }),
      created_by: sarahId,
      closes_at: inFiveDays.toISOString(),
      total_yes_shares: prob35.total_yes_shares,
      total_no_shares: prob35.total_no_shares,
      liquidity_pool: liquidity,
      status: 'open'
    },
    {
      id: uuidv4(),
      template_id: templates[2].id,
      title: 'Will the Seahawks win the Super Bowl 2026?',
      description: 'Market resolves YES if the Seattle Seahawks win Super Bowl LX. Following the team through playoffs - will post updates on injuries and game analysis.',
      category: 'sports',
      resolution_source: 'manual',
      resolution_criteria: JSON.stringify({ path: 'manual', operator: 'equals', value: true, description: 'Seahawks win Super Bowl LX' }),
      created_by: mikeId,
      closes_at: new Date('2026-02-15').toISOString(),
      total_yes_shares: prob45.total_yes_shares,
      total_no_shares: prob45.total_no_shares,
      liquidity_pool: liquidity,
      status: 'open'
    },
    {
      id: uuidv4(),
      template_id: templates[2].id,
      title: 'Will Taylor Swift announce a new album this month?',
      description: 'Resolves YES if Taylor Swift officially announces a new studio album before end of January 2026. Tracking her social media and tour dates for hints!',
      category: 'entertainment',
      resolution_source: 'manual',
      resolution_criteria: JSON.stringify({ path: 'manual', operator: 'equals', value: true, description: 'Official album announcement by Taylor Swift' }),
      created_by: jessicaId,
      closes_at: new Date('2026-01-31').toISOString(),
      total_yes_shares: prob55.total_yes_shares,
      total_no_shares: prob55.total_no_shares,
      liquidity_pool: liquidity,
      status: 'open'
    },
    {
      id: uuidv4(),
      template_id: templates[2].id,
      title: 'Will my package arrive before Friday?',
      description: 'I ordered something from Amazon on Monday with standard shipping. Market resolves YES if it arrives by Friday 5pm. Tracking number updates will be posted!',
      category: 'custom',
      resolution_source: 'manual',
      resolution_criteria: JSON.stringify({ path: 'manual', operator: 'equals', value: true, description: 'Package delivered before Friday 5pm' }),
      created_by: demoUserId,
      closes_at: inFiveDays.toISOString(),
      total_yes_shares: prob70.total_yes_shares,
      total_no_shares: prob70.total_no_shares,
      liquidity_pool: liquidity,
      status: 'open'
    },
    {
      id: uuidv4(),
      template_id: templates[2].id,
      title: 'Will I finish my marathon under 4 hours?',
      description: 'Running the LA Marathon on Feb 9th. Been training for 6 months - current best is 4:15. Will post training updates and race day tracking!',
      category: 'custom',
      resolution_source: 'manual',
      resolution_criteria: JSON.stringify({ path: 'manual', operator: 'equals', value: true, description: 'Official chip time under 4:00:00' }),
      created_by: mikeId,
      closes_at: new Date('2026-02-09').toISOString(),
      total_yes_shares: prob35.total_yes_shares,
      total_no_shares: prob35.total_no_shares,
      liquidity_pool: liquidity,
      status: 'open'
    },
    {
      id: uuidv4(),
      template_id: templates[2].id,
      title: 'Will our office hit Q1 sales target?',
      description: 'Our team needs to close $500K in Q1. Currently at $180K with 2 months left. Will update with weekly progress reports!',
      category: 'custom',
      resolution_source: 'manual',
      resolution_criteria: JSON.stringify({ path: 'manual', operator: 'equals', value: true, description: 'Q1 sales >= $500,000' }),
      created_by: sarahId,
      closes_at: new Date('2026-03-31').toISOString(),
      total_yes_shares: prob50.total_yes_shares,
      total_no_shares: prob50.total_no_shares,
      liquidity_pool: liquidity,
      status: 'open'
    },
    {
      id: uuidv4(),
      template_id: templates[2].id,
      title: 'Will the new iPhone be announced at WWDC?',
      description: 'Apple WWDC 2026 is coming up. Will Apple announce a new iPhone at the event? Following all the tech leaks and rumors!',
      category: 'technology',
      resolution_source: 'manual',
      resolution_criteria: JSON.stringify({ path: 'manual', operator: 'equals', value: true, description: 'New iPhone announced at WWDC 2026' }),
      created_by: jessicaId,
      closes_at: new Date('2026-06-15').toISOString(),
      total_yes_shares: prob65.total_yes_shares,
      total_no_shares: prob65.total_no_shares,
      liquidity_pool: liquidity,
      status: 'open'
    },
    {
      id: uuidv4(),
      template_id: templates[2].id,
      title: 'Will my friend show up on time to dinner?',
      description: 'Meeting my friend Alex for dinner on Saturday at 7pm. Alex is notorious for being late. Resolves YES if they arrive by 7:15pm. Will livestream the wait!',
      category: 'custom',
      resolution_source: 'manual',
      resolution_criteria: JSON.stringify({ path: 'manual', operator: 'equals', value: true, description: 'Alex arrives by 7:15pm' }),
      created_by: demoUserId,
      closes_at: inTwoDays.toISOString(),
      total_yes_shares: prob35.total_yes_shares,
      total_no_shares: prob35.total_no_shares,
      liquidity_pool: liquidity,
      status: 'open'
    }
  ];

  const insertMarket = db.prepare(`
    INSERT INTO markets (id, template_id, title, description, category, resolution_source, resolution_criteria, created_by, closes_at, total_yes_shares, total_no_shares, liquidity_pool, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPriceHistory = db.prepare(`
    INSERT INTO price_history (id, market_id, yes_price, no_price, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const m of markets) {
    insertMarket.run(
      m.id, m.template_id, m.title, m.description, m.category,
      m.resolution_source, m.resolution_criteria, m.created_by,
      m.closes_at, m.total_yes_shares, m.total_no_shares, m.liquidity_pool, m.status
    );

    // Add initial price history using LMSR prices
    const marketState = {
      total_yes_shares: m.total_yes_shares,
      total_no_shares: m.total_no_shares,
      liquidity_pool: m.liquidity_pool
    };
    const yesPrice = getYesPrice(marketState);
    const noPrice = getNoPrice(marketState);
    insertPriceHistory.run(uuidv4(), m.id, yesPrice, noPrice, now.toISOString());
  }

  // Add sample market updates for some markets
  const insertUpdate = db.prepare(`
    INSERT INTO market_updates (id, market_id, user_id, update_type, content, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Add updates to a few markets
  const snowMarket = markets[0];
  const marathonMarket = markets[4];
  const salesMarket = markets[5];

  // Weather updates
  insertUpdate.run(uuidv4(), snowMarket.id, snowMarket.created_by, 'progress', 
    '📊 Weather update: Current forecast showing 40% chance of snow this weekend. Temperature expected to drop to 28°F on Saturday.',
    new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
  );
  insertUpdate.run(uuidv4(), snowMarket.id, snowMarket.created_by, 'text',
    'Watching the models closely - European model showing more moisture than GFS. Stay tuned!',
    new Date(now.getTime() - 30 * 60 * 1000).toISOString()
  );

  // Marathon updates
  insertUpdate.run(uuidv4(), marathonMarket.id, marathonMarket.created_by, 'progress',
    '🏃 Training update: Just ran 18 miles at 9:05 pace! Feeling good about sub-4. Two weeks to go.',
    new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  );
  insertUpdate.run(uuidv4(), marathonMarket.id, marathonMarket.created_by, 'text',
    'Slight calf tightness after today\'s run. Taking tomorrow off and doing ice/stretching. Should be fine.',
    new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  );

  // Sales updates
  insertUpdate.run(uuidv4(), salesMarket.id, salesMarket.created_by, 'progress',
    '📈 Week 4 update: Closed $45K this week! Total now at $225K. Pipeline looking strong for February.',
    new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString()
  );

  console.log('Seeded default data: demo user, templates, sample markets, and updates');
}

export default db;
