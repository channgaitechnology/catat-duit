exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const webhookSecret = process.env.NOTIFY_WEBHOOK_SECRET;
  if (webhookSecret) {
    const providedSecret = event.headers['x-webhook-secret'] || event.headers['X-Webhook-Secret'];
    if (providedSecret !== webhookSecret) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized: Invalid webhook secret' })
      };
    }
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

  const subject = body.subject || 'Notifikasi Baru Catat Duit';
  const message = body.message || (body.record ? `Data baru: ${JSON.stringify(body.record)}` : 'Ada aktivitas baru pada aplikasi Catat Duit.');
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
        html: `
          <div style="font-family: sans-serif; line-height: 1.5; color: #202b23; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #496333; margin-top: 0;">Catat Duit — Notifikasi Admin</h2>
            <p>${message.replace(/\n/g, '<br/>')}</p>
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
