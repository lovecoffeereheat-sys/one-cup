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
  const NOTION_PAGE_ID = '65089dd5-fd2d-4a4d-8d69-af2c2c5af186';

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

  const makeParagraph = (text) => ({
    object: 'block',
    type: 'paragraph',
    paragraph: { rich_text: [{ type: 'text', text: { content: text } }] }
  });

  const children = [
    makeParagraph(`Date: ${dateStr} at ${timeStr}`),
    makeParagraph(`Focus: ${focusTask || 'this hour'}`),
    makeParagraph(`Energy: ${energyLabels[energy] || energy}`),
    makeParagraph(`Intervals completed: ${intervalsCompleted} of ${totalIntervals}`),
    makeParagraph(`Time worked: ${intervalsCompleted * 10} min`),
  ];
  if (note) children.push(makeParagraph(`Notes: ${note}`));

  try {
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + NOTION_KEY,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: { page_id: NOTION_PAGE_ID },
        properties: {
          title: { title: [{ text: { content: `Session — ${dateStr}` } }] }
        },
        children
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
