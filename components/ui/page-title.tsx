import { Heading1 } from '@/components/ui/heading1';
import Image from 'next/image';

function PageTitle({
  title,
  image,
  actions,
}: {
  title: string;
  image?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-row w-full justify-between items-center gap-2">
      <div className="flex flex-row items-center gap-2">
        {image && (
          <Image
            src={image}
            className="size-12 shrink-0 rounded-lg bg-accent object-cover"
            alt="Logo"
            width={300}
            height={300}
          />
        )}
        <Heading1>{title}</Heading1>
      </div>
      {actions && (
        <div className="flex flex-row items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

export { PageTitle };
