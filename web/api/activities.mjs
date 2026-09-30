import { authenticateRequest } from '../server/auth.mjs';
import { loadDashboardData } from '../server/activities.mjs';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = await authenticateRequest(request);
    if (!userId) return response.status(401).json({ error: 'Unauthorized' });

    return response.status(200).json(await loadDashboardData());
  } catch (error) {
    console.error('Could not load the protected activity data:', error);
    return response.status(500).json({ error: 'Could not load activities.' });
  }
}