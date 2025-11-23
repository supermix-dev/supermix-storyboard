import { SITE_TITLE } from '../../../lib/constants';

export default function StudioHead() {
  return (
    <>
      <title>Sanity Studio | {SITE_TITLE}</title>
      <meta name="robots" content="noindex" />
    </>
  );
}
