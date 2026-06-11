export default async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  const NOTION_KEY = process.env.NOTION_API_KEY;
  const DATABASE_ID = '65089dd5-fd2d-4a4d-8d69-af2c2c5af186';

  if (!NOTION_KEY) {
    return new Response(JSON.stringify({ error: 'Notion key not configured' }), { status: 500, headers });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400, headers });
  }

  const { dateStr, timeStr, focusTask, energy, intervalsCompleted, totalIntervals, note } = body;

  const energyLabels = {
    empty: 'empty cup',
    half: 'half a cup',
    full: 'fresh pour',
    unpredictable: 'unpredictable'
  };

  const properties = {
    'Session': { title: [{ type: 'text', text: { content: `Session — ${dateStr}` } }] },
    'Focus': { rich_text: [{ text: { content: focusTask || 'this hour' } }] },
    'Energy': { select: { name: energyLabels[energy] || energy } },
    'Intervals': { select: { name: `${intervalsCompleted} / ${totalIntervals}` } },
    'Time Worked': { number: intervalsCompleted * 10 },
    const properties = {     'Session': { title: [{ type: 'text', text: { content: `Session — ${dateStr}` } }] },     'Focus': { rich_text: [{ type: 'text', text: { content: focusTask || 'this hour' } }] },     'Energy': { select: { name: energyLabels[energy] || energy } },     'Intervals': { select: { name: `${intervalsCompleted} / ${totalIntervals}` } },     'Time Worked': { number: intervalsCompleted * 10 },     'Date': { date: { start: dateStr } }, };
  };

  if (note) {
    properties['Notes'] = { rich_text: [{ text: { content: note } }] };
  }

  try {
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + NOTION_KEY,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: { database_id: DATABASE_ID },
        properties
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: err.message || 'Notion error ' + res.status }), { status: 502, headers });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
};

export const config = { path: '/api/save-session' };
