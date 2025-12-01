'use client';

import type { RoomData, RoomStatus } from '@/app/page';
import { CreateRoomDialog } from '@/components/custom/create-room-dialog';
import { RoomCard } from '@/components/custom/room-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty } from '@/components/ui/empty';
import { Layers } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Combobox } from '../components/ui/combobox';

type StatusFilter = 'active' | RoomStatus;

type RoomDashboardProps = {
  initialRooms: RoomData[];
};

export function RoomDashboard({ initialRooms }: RoomDashboardProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  const filteredRooms = useMemo(() => {
    if (statusFilter === 'active') {
      // Show both draft and active
      return initialRooms.filter(
        (room) => room.status === 'draft' || room.status === 'active'
      );
    }
    return initialRooms.filter((room) => room.status === statusFilter);
  }, [initialRooms, statusFilter]);

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-3">
            Supermix<Badge variant="outline">Storyboard</Badge>
          </h1>
          <div className="flex items-center gap-3">
            <Combobox
              options={[
                { value: 'active', label: 'All Active', icon: null },
                { value: 'draft', label: 'Draft only', icon: null },
                { value: 'archived', label: 'Archived', icon: null },
              ]}
              value={statusFilter}
              setValue={(value) => setStatusFilter(value as StatusFilter)}
              size="sm"
            />
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="gap-2"
              variant="outline"
              size="sm"
            >
              New Storyboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-6 py-8">
        {initialRooms.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Empty
              icon={Layers}
              title="No storyboards yet"
              description="Create your first storyboard to get started. Share the URL with collaborators to edit together in real-time."
              actions={[
                {
                  label: 'Create Storyboard',
                  onClick: () => setCreateDialogOpen(true),
                  variant: 'default',
                },
              ]}
            />
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Empty
              icon={Layers}
              title="No storyboards found"
              description={`No ${
                statusFilter === 'active' ? 'active or draft' : statusFilter
              } storyboards. Try changing the filter.`}
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredRooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        )}
      </main>

      {/* Create room dialog */}
      <CreateRoomDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
