import { Button } from '@/components/ui/button';

import { SignInButton, SignOutButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { LockIcon } from 'lucide-react';
import Link from 'next/link';
import { MaxWidthContainer } from '../../components/custom/max-width-container';

async function NotAuthorizedPage() {
  const { userId } = await auth();

  return (
    <MaxWidthContainer
      size="sm"
      className="min-h-screen flex items-center justify-center"
    >
      <div className="w-full flex flex-col items-center justify-center gap-2">
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="flex items-center size-9 border rounded-lg bg-muted justify-center">
            <LockIcon className="size-5 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-medium text-center">{`No access`}</h1>
        </div>
        <span className="text-center max-w-sm text-muted-foreground">
          {`You don't have permission to access this page`}
        </span>

        {userId ? (
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex flex-row items-center gap-1">
              <Button
                size="sm"
                asChild
                variant={'outline'}
                className="flex flex-row items-center"
              >
                <Link href="/">Back home</Link>
              </Button>
              <SignOutButton>
                <Button
                  size="sm"
                  variant={'outline'}
                  className="flex flex-row items-center"
                >
                  Sign out
                </Button>
              </SignOutButton>
            </div>
          </div>
        ) : (
          <SignInButton>
            <Button variant={'outline'}>Sign In</Button>
          </SignInButton>
        )}
      </div>
    </MaxWidthContainer>
  );
}

export default NotAuthorizedPage;
