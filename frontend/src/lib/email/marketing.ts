/**
 * Adds a newsletter subscriber to the Brevo contact list used for promotional campaigns.
 * Campaigns themselves are written and sent from the Brevo dashboard, which also handles
 * unsubscribe links. Set BREVO_API_KEY and BREVO_LIST_ID to switch this on.
 */
export async function addToMarketingList(email: string): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  const listId = Number(process.env.BREVO_LIST_ID);
  if (!apiKey || !listId) return false;
  try {
    const res = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ email, listIds: [listId], updateEnabled: true }),
    });
    if (!res.ok) console.error('[brevo] add contact failed:', res.status);
    return res.ok;
  } catch (err: any) {
    console.error('[brevo] add contact failed:', err?.message);
    return false;
  }
}
