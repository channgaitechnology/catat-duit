const crypto = require('crypto');

const MAX_SUBJECT_LENGTH = 150;
const MAX_MESSAGE_LENGTH = 5000;

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  };
}

function secretsMatch(provided, expected) {
  if (typeof provided !== 'string') return false;
  const a = crypto.createHash('sha256').update(provided).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeSubject(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\r\n\t]+/g, ' ').trim().slice(0, MAX_SUBJECT_LENGTH);
}

function describeRecord(body) {
  const record = body.record && typeof body.record === 'object' ? body.record : {};
  const lines = [`Data baru${body.table ? ` pada tabel ${body.table}` : ''}:`];
  for (const [key, value] of Object.entries(record)) {
    const text = value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value);
    lines.push(`- ${key}: ${text}`);
  }
  return lines.join('\n');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const webhookSecret = process.env.NOTIFY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return jsonResponse(500, {
      error: 'Server configuration error: NOTIFY_WEBHOOK_SECRET must be set in Netlify environment variables.'
    });
  }

  const headers = event.headers || {};
  const providedSecret = headers['x-webhook-secret'] || headers['X-Webhook-Secret'];
  if (!secretsMatch(providedSecret, webhookSecret)) {
    return jsonResponse(401, { error: 'Unauthorized: Invalid webhook secret' });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;

  if (!resendApiKey || !adminEmail) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Server configuration error: RESEND_API_KEY and ADMIN_NOTIFY_EMAIL must be set in Netlify environment variables.'
      })
    };
  }

  let body = {};
  try {
    if (event.body) {
      body = JSON.parse(event.body);
    }
  } catch (err) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON payload' })
    };
  }

  const subject = sanitizeSubject(body.subject) || 'Notifikasi Baru Catat Duit';
  const message = typeof body.message === 'string' && body.message
    ? body.message
    : (body.record ? describeRecord(body) : 'Ada aktivitas baru pada aplikasi Catat Duit.');
  const safeMessage = message.slice(0, MAX_MESSAGE_LENGTH);
  const fromAddress = process.env.RESEND_FROM_EMAIL || 'Catat Duit <onboarding@resend.dev>';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [adminEmail],
        subject: subject,
        text: safeMessage,
        html: `
          <div style="font-family: sans-serif; line-height: 1.5; color: #202b23; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #496333; margin-top: 0;">Catat Duit — Notifikasi Admin</h2>
            <p>${escapeHtml(safeMessage).replace(/\n/g, '<br/>')}</p>
            <hr style="border: 0; border-top: 1px solid #e2e8e0; margin: 20px 0;" />
            <small style="color: #889489;">Dikirim otomatis oleh Netlify Functions & Resend untuk Catat Duit.</small>
          </div>
        `
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to send email via Resend', details: data })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, id: data.id })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error while sending notification', message: err.message })
    };
  }
};
