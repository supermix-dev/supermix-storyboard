'use client';
import { Check, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SITE_DESCRIPTION_SHORT } from '../../../lib/constants';
import { toast } from '../../../lib/toast';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { Input } from '../../ui/input';
import { subscribe } from './actions';

function getNextMidnightUTC(): Date {
  const now = new Date();
  const nextMidnight = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0
    )
  );
  return nextMidnight;
}

function getTimeRemaining(targetDate: Date): {
  hours: number;
  minutes: number;
  seconds: number;
} {
  const now = new Date();
  const difference = targetDate.getTime() - now.getTime();

  if (difference <= 0) {
    return { hours: 0, minutes: 0, seconds: 0 };
  }

  const hours = Math.floor(difference / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  return { hours, minutes, seconds };
}

function Countdown() {
  const [timeRemaining, setTimeRemaining] = useState(() => {
    const nextMidnight = getNextMidnightUTC();
    return getTimeRemaining(nextMidnight);
  });

  useEffect(() => {
    const updateCountdown = () => {
      const nextMidnight = getNextMidnightUTC();
      setTimeRemaining(getTimeRemaining(nextMidnight));
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (value: number): string => {
    return String(value).padStart(2, '0');
  };

  return (
    <div className="font-medium text-sm text-foreground whitespace-nowrap">
      New links in{' '}
      <span className="tabular-nums">
        {formatTime(timeRemaining.hours)}:{formatTime(timeRemaining.minutes)}:
        {formatTime(timeRemaining.seconds)}
      </span>
    </div>
  );
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function EmailForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isValid = email.trim() !== '' && isValidEmail(email.trim());

  const handleSubmit = async () => {
    if (!isValid) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await subscribe(email.trim());
      if (!error) {
        setSuccess(true);
        setEmail('');
        toast.success('Subscribed', { position: 'top-center' });
      }
    } catch {
      // Error handled silently
      setEmail('');
      toast.error('There was an error subscribing', { position: 'top-center' });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="flex flex-col w-full relative items-center gap-3 p-6 bg-accent">
        <div className="absolute -top-4.5 left-1/2 -translate-x-1/2 px-3 py-1.5 items-center justify-center flex flex-col bg-background rounded-lg border">
          <Countdown />
        </div>
        <div className="flex flex-row items-center gap-3 mt-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20">
            <Check className="size-4 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-md text-center text-foreground font-medium">
            You&apos;re subscribed!
          </p>
        </div>
      </Card>
    );
  }
  return (
    <Card className="flex flex-col w-full relative items-center gap-3 p-6 bg-accent">
      <div className="absolute -top-4.5 left-1/2 -translate-x-1/2 px-3 py-1.5 items-center justify-center flex flex-col bg-background rounded-lg border">
        <Countdown />
      </div>
      <p className="text-m mt-1 text-center text-foreground">
        {SITE_DESCRIPTION_SHORT}
      </p>
      <div className="flex w-full flex-col items-center gap-2 sm:flex-row sm:items-stretch">
        <Input
          className="w-full md:h-10 text-md md:text-base bg-background"
          placeholder="Add your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button
          onClick={handleSubmit}
          variant="default"
          className="disabled:opacity-100 h-10 text-base md:w-auto w-full disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-foreground disabled:text-background"
          disabled={loading || !isValid}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            'Subscribe for Free'
          )}
        </Button>
      </div>
    </Card>
  );
}

export default EmailForm;
