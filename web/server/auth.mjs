import { verifyToken } from '@clerk/backend';

export async function authenticateRequest(request, secretKey = process.env.CLERK_SECRET_KEY) {
  if (!secretKey) throw new Error('CLERK_SECRET_KEY is not configured.');

  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return null;

  try {
    const claims = await verifyToken(authorization.slice('Bearer '.length), { secretKey });
    return typeof claims.sub === 'string' ? claims.sub : null;
  } catch {
    return null;
  }
}