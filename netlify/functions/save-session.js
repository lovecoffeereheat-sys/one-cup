exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const NOTION_KEY = process.env.NOTION_API_KEY;
  const DATABASE_ID = '65089dd5-fd2d-4a4d-8d69-af2c2c5af186';

  if (!NOTION_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Notion key not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const { dateStr, timeStr, focusTask, energy, intervalsCompleted, totalIntervals, note } = body;

  const energyLabels = {
    empty: 'empty cup',
    half: 'half a cup',
    full: 'fresh pour',
    unpredictable: 'unpredictable'
  };

  const properties = {
    'Session': { title: [{ type: 'text', text: { content: `${new Date(dateStr).toLocaleDateString('en-CA', {month: 'long', day: 'numeric'})} — ${focusTask || 'this hour'}` } }] },
    'Focus': { rich_text: [{ type: 'text', text: { content: focusTask || 'this hour' } }] },
    'Energy': { select: { name: energyLabels[energy] || energy } },
    'Intervals': { select: { name: `${intervalsCompleted} / ${totalIntervals}` } },
    'Time Worked': { number: intervalsCompleted * 10 },
    'Date': { date: { start: dateStr } },
  };

  if (note) {
    properties['Notes'] = { rich_text: [{ type: 'text', text: { content: note } }] };
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
      return { statusCode: 502, headers, body: JSON.stringify({ error: err.message || 'Notion error ' + res.status }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

