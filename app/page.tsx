import Day from '@/components/blocks/day';
import EmailForm from '@/components/blocks/email-form/email-form';
import { Logo } from '@/components/custom/logo';
import { CREATOR_NAME, CREATOR_TWITTER_URL } from '@/lib/constants';
import Image from 'next/image';
import Link from 'next/link';
import { MaxWidthContainer } from '../components/custom/max-width-container';

function getUTCDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Home() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  const todayUTC = getUTCDateString(today);
  const yesterdayUTC = getUTCDateString(yesterday);

  return (
    <MaxWidthContainer
      size="sm"
      className="flex min-h-screen justify-center font-sans"
    >
      <main className="flex w-full flex-col items-center px-6 pb-24 pt-12">
        <div className="flex w-full flex-col items-center gap-4 text-center justify-center">
          <div className="flex w-full flex-col items-center gap-5">
            <Logo className="max-w-64 w-full" />
          </div>

          <div className="flex flex-row items-center gap-2">
            <Image
              src="/hiten.jpg"
              alt={CREATOR_NAME}
              width={32}
              height={32}
              className="rounded-full size-8"
            />

            <span className="text-sm text-muted-foreground">
              Curated by{' '}
              <Link
                href={CREATOR_TWITTER_URL}
                target="_blank"
                className="text-primary underline"
              >
                {CREATOR_NAME}
              </Link>
            </span>
          </div>
        </div>

        <div className="mt-12 w-full flex flex-col items-start">
          <EmailForm />
        </div>
        <div className="mt-12 flex w-full flex-col items-start gap-6">
          <Day label="Today" date={todayUTC} />
          <Day label="Yesterday" date={yesterdayUTC} />
        </div>
      </main>
    </MaxWidthContainer>
  );
}
