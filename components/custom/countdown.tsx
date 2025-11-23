'use client';

import { useEffect, useState } from 'react';

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

export function Countdown() {
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
    <div className="text-sm text-muted-foreground">
      Next update in:{' '}
      <span className="font-medium text-foreground">
        {formatTime(timeRemaining.hours)}:{formatTime(timeRemaining.minutes)}:
        {formatTime(timeRemaining.seconds)}
      </span>
    </div>
  );
}
