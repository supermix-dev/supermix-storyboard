'use client';

import type { RoomData, RoomStatus } from '@/app/page';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Layers } from 'lucide-react';
import { useRouter } from 'next/navigation';

type RoomCardProps = {
  room: RoomData;
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function getStatusConfig(status: RoomStatus) {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      };
    case 'archived':
      return {
        label: 'Archived',
        className: 'bg-muted text-muted-foreground border-transparent',
      };
    case 'draft':
    default:
      return {
        label: 'Draft',
        className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      };
  }
}

export function RoomCard({ room }: RoomCardProps) {
  const router = useRouter();
  const statusConfig = getStatusConfig(room.status);

  const handleClick = () => {
    router.push(`/${room.id}`);
  };

  return (
    <Card
      className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md group"
      onClick={handleClick}
    >
      <div className="aspect-video bg-muted/30 border-b flex items-center justify-center relative">
        <Layers className="size-8 text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors" />
      </div>
      <div className="p-4 space-y-1">
        <h3 className="font-medium truncate">{room.name}</h3>

        <div className="flex items-center gap-2">
          <Badge className={cn('', statusConfig.className)}>
            {statusConfig.label}
          </Badge>
          <p className="text-xs text-muted-foreground">
            Created {formatDate(room.createdAt)}
          </p>
        </div>
      </div>
    </Card>
  );
}
