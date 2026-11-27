/**
 * aiHelpers.js — All Claude API calls.
 *
 * Changes (Backend-2):
 *   - Removed Promise.race timeout wrapper.
 *   - Each claude.messages.create() call now passes `signal: AbortSignal.timeout(TIMEOUT_MS)`
 *     directly to the Anthropic SDK. This actually cancels the in-flight HTTP
 *     request when the timeout fires; Promise.race only cancelled the JS promise,
 *     leaving the underlying request running and consuming Anthropic quota.
 *   - AbortSignal.timeout() is built-in from Node 17.3+. We keep a manual
 *     AbortController fallback for older environments.
 */
const { getClient } = require('../config/claude');
const env = require('../config/env');

const TIMEOUT_MS = 10_000;
const MODEL      = env.AI_MODEL;

/** Returns an AbortSignal that fires after `ms` milliseconds. */
function timeoutSignal(ms) {
  if (typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  // Fallback for Node < 17.3
  const controller = new AbortController();
  setTimeout(() => controller.abort(new Error('Claude timeout')), ms);
  return controller.signal;
}

// ── 1. CLASSIFY REPORT ───────────────────────────────────────────────────────
const VALID_CATEGORIES = ['water', 'electricity', 'roads', 'garbage', 'safety', 'other'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

async function classifyReport({ title, description }) {
  const fallback = { category: null, priority: 'medium' };
  const claude = getClient();
  if (!claude) return fallback;

  try {
    const response = await claude.messages.create({
      model: MODEL,
      max_tokens: 80,
      signal: timeoutSignal(TIMEOUT_MS),
      messages: [
        {
          role: 'user',
          content:
`You are classifying community issue reports for a town management app.

Respond with ONLY a JSON object on a single line — no markdown, no explanation.
JSON schema: {"category":"<one of: water|electricity|roads|garbage|safety|other>","priority":"<one of: low|medium|high>"}

Rules:
- category: pick the best fit for the issue.
- priority: high = immediate danger or affects many people; medium = significant inconvenience; low = minor.

Report title: ${JSON.stringify(title)}
Report description: ${JSON.stringify(description)}`,
        },
      ],
    });

    const text  = response.content[0]?.text?.trim() ?? '';
    const clean = text.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(clean);

    const category = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : null;
    const priority = VALID_PRIORITIES.includes(parsed.priority) ? parsed.priority : 'medium';
    return { category, priority };
  } catch (err) {
    console.warn('[AI classify] failed:', err.message);
    return fallback;
  }
}

// ── 2. DUPLICATE DETECTION ───────────────────────────────────────────────────
async function detectDuplicate({ title, description, category, candidates }) {
  const fallback = { isDuplicate: false, matchId: null };
  if (!candidates.length) return fallback;
  const claude = getClient();
  if (!claude) return fallback;

  const candidateList = candidates
    .map((c, i) => `${i + 1}. id:${c.id} — "${c.title}": ${c.description.slice(0, 120)}`)
    .join('\n');

  try {
    const response = await claude.messages.create({
      model: MODEL,
      max_tokens: 80,
      signal: timeoutSignal(TIMEOUT_MS),
      messages: [
        {
          role: 'user',
          content:
`You are helping detect duplicate community issue reports.

A new report has been submitted. Decide if it is LIKELY describing the same physical issue as any of the existing nearby reports.
"Likely" means same location, same problem — not just the same category.

Respond with ONLY a JSON object on a single line — no markdown, no explanation.
JSON schema: {"is_duplicate":true|false,"match_id":"<id from the list, or null>"}

New report (category: ${category}):
Title: ${JSON.stringify(title)}
Description: ${JSON.stringify(description)}

Existing nearby reports (same category, within 200 m, last 30 days):
${candidateList}`,
        },
      ],
    });

    const text  = response.content[0]?.text?.trim() ?? '';
    const clean = text.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(clean);

    if (parsed.is_duplicate === true && typeof parsed.match_id === 'string') {
      const valid = candidates.some((c) => c.id === parsed.match_id);
      if (valid) return { isDuplicate: true, matchId: parsed.match_id };
    }
    return fallback;
  } catch (err) {
    console.warn('[AI duplicate] failed:', err.message);
    return fallback;
  }
}

// ── 3. WEEKLY SUMMARY ────────────────────────────────────────────────────────
async function generateWeeklySummary(stats) {
  const claude = getClient();
  if (!claude) return null;

  const { total_reports, by_category, by_status, avg_hours_to_resolve, by_week } = stats;
  const lastWeekCount = by_week.at(-1)?.count ?? 0;

  try {
    const response = await claude.messages.create({
      model: MODEL,
      max_tokens: 400,
      signal: timeoutSignal(TIMEOUT_MS),
      messages: [
        {
          role: 'user',
          content:
`You are a town administrator assistant. Write a concise plain-language summary (3-4 short paragraphs) of this week's community issue reports for a weekly briefing email.

Do NOT use markdown. Just plain prose.

Stats:
- Total reports in the system: ${total_reports}
- New reports this week: ${lastWeekCount}
- By category: ${JSON.stringify(by_category)}
- By status: ${JSON.stringify(by_status)}
- Average hours to resolve (all time): ${avg_hours_to_resolve ?? 'not available'}`,
        },
      ],
    });

    return response.content[0]?.text?.trim() ?? null;
  } catch (err) {
    console.warn('[AI summary] failed:', err.message);
    return null;
  }
}

module.exports = { classifyReport, detectDuplicate, generateWeeklySummary };
