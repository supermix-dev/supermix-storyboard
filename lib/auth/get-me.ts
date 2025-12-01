import { auth, currentUser } from '@clerk/nextjs/server';

import { hasAdminAccess } from './authorization';
import type { MeProps } from './types';

export async function getMe(): Promise<MeProps> {
  const [user, authInfo] = await Promise.all([currentUser(), auth()]);

  const id = user?.id;
  if (!id) {
    throw new Error('User ID is required');
  }

  const email = user?.emailAddresses[0].emailAddress || '';
  const timezone = (user?.publicMetadata?.timezone as string) || 'UTC';
  const admin = hasAdminAccess(authInfo);
  return {
    id,
    timezone,
    email,
    admin,
  };
}
