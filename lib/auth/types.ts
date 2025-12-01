import type { auth } from '@clerk/nextjs/server';

export type MeProps = {
  id: string;
  email: string;
  timezone: string;
  admin: boolean;
};

export type AuthObject = Awaited<ReturnType<typeof auth>>;
