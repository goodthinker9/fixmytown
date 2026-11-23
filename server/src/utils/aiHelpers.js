// All Claude calls live here. Each function is self-contained: it builds the
// prompt, calls the API, parses the JSON, and returns a typed result — or
// returns a safe fallback value so the caller never has to handle AI errors.
//
// === How we prompt for valid JSON ===
// 1. We tell the model to reply ONLY with a JSON object (no markdown, no prose).
// 2. We define the exact schema inline in the prompt so the model has no
//    ambiguity about key names or value types.
// 3. We set max_tokens to a small ceiling (the response is tiny) so the model
//    can't ramble and corrupt the JSON.
// 4. We wrap every parse in try/catch and validate the shape ourselves.
//    If anything is wrong, we log it and return the fallback.
//
// === Why this approach beats JSON mode / tool-use for a portfolio project ===
// Anthropic's SDK supports tool_use (structured output), but teaching the
// prompt-based approach is more instructive for interviews — it shows you
// understand the fundamental "text in / text out" nature of LLMs.
// In production you'd use tool_use for guaranteed schemas.

const { getClient } = require('../config/claude');

const TIMEOUT_MS = 10_000; // 10 s — if Claude doesn't respond, skip AI
const MODEL = 'claude-3-haiku-20240307'; // cheapest fast model, good for JSON tasks

// Wraps any Promise in an AbortController-style race with a timeout.
const withTimeout = (promise) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Claude timeout')), TIMEOUT_MS)
    ),
  ]);

// ---------------------------------------------------------------------------
// 1. CLASSIFY REPORT
// Returns { category, priority } based on title + description.
// Falls back to { category: null, priority: 'medium' } on any error.
// ---------------------------------------------------------------------------
const VALID_CATEGORIES = ['water', 'electricity', 'roads', 'garbage', 'safety', 'other'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

async function classifyReport({ title, description }) {
  const fallback = { category: null, priority: 'medium' };
  const claude = getClient();
  if (!claude) return fallback;

  try {
    const response = await withTimeout(
      claude.messages.create({
        model: MODEL,
        max_tokens: 80,
        messages: [
          {
            role: 'user',
            content: `You are classifying community issue reports for a town management app.

Respond with ONLY a JSON object on a single line — no markdown, no explanation.
JSON schema: {"category":"<one of: water|electricity|roads|garbage|safety|other>","priority":"<one of: low|medium|high>"}

Rules:
- category: pick the best fit for the issue.
- priority: high = immediate danger or affects many people; medium = significant inconvenience; low = minor.

Report title: ${JSON.stringify(title)}
Report description: ${JSON.stringify(description)}`,
          },
        ],
      })
    );

    const text = response.content[0]?.text?.trim() ?? '';
    // Strip any accidental markdown code fences the model might add.
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

// ---------------------------------------------------------------------------
// 2. DUPLICATE DETECTION
// Receives the new report and an array of nearby candidates.
// Returns { isDuplicate: bool, matchId: string|null }.
// Falls back to { isDuplicate: false, matchId: null } on any error.
// ---------------------------------------------------------------------------
async function detectDuplicate({ title, description, category, candidates }) {
  const fallback = { isDuplicate: false, matchId: null };
  if (!candidates.length) return fallback;
  const claude = getClient();
  if (!claude) return fallback;

  // Summarise candidates as a compact numbered list to keep the prompt small.
  const candidateList = candidates
    .map((c, i) => `${i + 1}. id:${c.id} — "${c.title}": ${c.description.slice(0, 120)}`)
    .join('\n');

  try {
    const response = await withTimeout(
      claude.messages.create({
        model: MODEL,
        max_tokens: 80,
        messages: [
          {
            role: 'user',
            content: `You are helping detect duplicate community issue reports.

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
      })
    );

    const text = response.content[0]?.text?.trim() ?? '';
    const clean = text.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(clean);

    if (parsed.is_duplicate === true && typeof parsed.match_id === 'string') {
      // Verify the returned id actually exists in our candidate list (never trust AI output blindly).
      const valid = candidates.some((c) => c.id === parsed.match_id);
      if (valid) return { isDuplicate: true, matchId: parsed.match_id };
    }
    return fallback;
  } catch (err) {
    console.warn('[AI duplicate] failed:', err.message);
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// 3. WEEKLY SUMMARY
// Returns a plain-language string summarising the last 7 days of reports.
// Falls back to null so the caller can show a user-visible error.
// ---------------------------------------------------------------------------
async function generateWeeklySummary(stats) {
  const claude = getClient();
  if (!claude) return null;

  const { total_reports, by_category, by_status, avg_hours_to_resolve, by_week } = stats;

  // Find the most recent week count.
  const lastWeekCount = by_week.at(-1)?.count ?? 0;

  try {
    const response = await withTimeout(
      claude.messages.create({
        model: MODEL,
        max_tokens: 400,
        messages: [
          {
            role: 'user',
            content: `You are a town administrator assistant. Write a concise plain-language summary (3-4 short paragraphs) of this week's community issue reports for a weekly briefing email.

Do NOT use markdown. Just plain prose.

Stats:
- Total reports in the system: ${total_reports}
- New reports this week: ${lastWeekCount}
- By category: ${JSON.stringify(by_category)}
- By status: ${JSON.stringify(by_status)}
- Average hours to resolve (all time): ${avg_hours_to_resolve ?? 'not available'}`,
          },
        ],
      })
    );

    return response.content[0]?.text?.trim() ?? null;
  } catch (err) {
    console.warn('[AI summary] failed:', err.message);
    return null;
  }
}

module.exports = { classifyReport, detectDuplicate, generateWeeklySummary };
