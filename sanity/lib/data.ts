import { groq } from 'next-sanity';
import type { DayEntry } from '../../types/day';
import { sanityFetch } from './fetch';

export const dayQuery = groq`
  *[_type == "day" && date == $date][0]{
    date,
    items[]{
      _key,
      title,
      image,
      url
    }
  }
`;

export const latestDayQuery = groq`
  *[_type == "day"] | order(date desc) [0]{
    date,
    items[]{
      _key,
      title,
      image,
      url
    }
  }
`;

export async function getDay(date: string) {
  return sanityFetch<DayEntry | null>({
    query: dayQuery,
    params: { date },
    revalidate: 60 * 30, // refresh every 30 minutes
  });
}

export async function getLatestDay() {
  return sanityFetch<DayEntry | null>({
    query: latestDayQuery,
    revalidate: 60 * 30, // refresh every 30 minutes
  });
}
