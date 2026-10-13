const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getImapConfig() {
  const required = [
    'IMAP_HOST',
    'IMAP_USER',
    'IMAP_PASS'
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing environment variable: $`{key}`);
    }
  }

  return {
    host: process.env.IMAP_HOST,
    port: Number(process.env.IMAP_PORT || 993),
    secure: process.env.IMAP_SECURE !== 'false',
    auth: {
      user: process.env.IMAP_USER,
      pass: process.env.IMAP_PASS
    },
    logger: false
  };
}

function extractCode(text) {
  const patterns = [
    /\bverification code\D{0,30}(\d{6})\b/i,
    /\bsecurity code\D{0,30}(\d{6})\b/i,
    /\bone-time code\D{0,30}(\d{6})\b/i,
    /\bcode\D{0,20}(\d{6})\b/i,
    /\b(\d{6})\b/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }

  return null;
}

async function getVerificationCode({
  email,
  since = new Date(),
  timeoutMs = Number(
    process.env.EMAIL_WAIT_TIMEOUT_MS || 120000
  )
}) {
  const client = new ImapFlow(getImapConfig());

  const deadline = Date.now() + timeoutMs;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    await client.connect();
    await client.mailboxOpen('INBOX');

    while (Date.now() < deadline) {
      const uids = await client.search({
        since,
        to: normalizedEmail
      }, { uid: true });

      if (uids.length) {
        const newestUid = Math.max(...uids);

        for await (const message of client.fetch(
          [newestUid],
          {
            uid: true,
            envelope: true,
            source: true,
            internalDate: true
          },
          { uid: true }
        )) {
          const receivedAt =
            message.internalDate || new Date(0);

          if (receivedAt < since) continue;

          const parsed = await simpleParser(message.source);
          const recipients = (parsed.to?.value || [])
            .map((item) => item.address?.toLowerCase())
            .filter(Boolean);

          if (!recipients.includes(normalizedEmail)) {
            continue;
          }

          const text = [
            parsed.subject || '',
            parsed.text || '',
            parsed.html
              ? String(parsed.html).replace(/<[^>]*>/g, ' ')
              : ''
          ].join('\n');

          const code = extractCode(text);

          if (code) return code;
        }
      }

      await sleep(2500);
    }

    throw new Error('Timed out waiting for a verification email.');
  } finally {
    if (client.usable) {
      await client.logout().catch(() => {});
    }
  }
}

module.exports = { getVerificationCode };
