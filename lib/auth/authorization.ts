import { AuthObject } from './types';

export function hasAppAccess(authInfo: AuthObject, userId: string | null) {
  if (userId === null) {
    return false;
  }

  const public_metadata = authInfo?.sessionClaims
    ?.public_metadata as UserPublicMetadata;

  if (public_metadata?.bridge_access === 'admin') {
    return true;
  } else if (public_metadata?.bridge_access === 'member') {
    return true;
  } else {
    return false;
  }
}

export function hasAdminAccess(authInfo: AuthObject) {
  const public_metadata = authInfo?.sessionClaims
    ?.public_metadata as UserPublicMetadata;

  return public_metadata?.bridge_access === 'admin';
}
