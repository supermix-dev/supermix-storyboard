import { groq } from 'next-sanity';

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

