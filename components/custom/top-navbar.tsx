'use client';

import type { StoryboardSceneProps } from '@/app/actions/storyboards';
import type { RoomStatus } from '@/app/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ShadeAssetProps } from '@/lib/shade/shade.types';
import type { Presence, UserMeta } from '@/liveblocks.config';
import type { User } from '@liveblocks/client';
import {
  Check,
  Figma,
  Grid,
  Home,
  List,
  Pencil,
  Play,
  Settings,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { cn } from '../../lib/utils';
import { ButtonGroup } from '../ui/button-group';

type ViewMode = 'list' | 'grid' | 'preview';

type TopNavbarProps = {
  asset: ShadeAssetProps | null;
  storyboards: StoryboardSceneProps[];
  connectionCount: number;
  others: readonly User<Presence, UserMeta>[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onOpenExportDialog?: () => void;
  roomStatus?: RoomStatus;
  onStatusChange?: (status: RoomStatus) => void;
  roomName?: string;
  onNameChange?: (name: string) => void;
};

export function TopNavbar({
  asset,
  storyboards,
  connectionCount,
  others,
  viewMode,
  onViewModeChange,
  onOpenExportDialog,
  roomStatus,
  onStatusChange,
  roomName,
  onNameChange,
}: TopNavbarProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(roomName || '');

  const handleStartEditing = useCallback(() => {
    setEditedName(roomName || '');
    setIsEditingName(true);
  }, [roomName]);

  const handleSaveName = useCallback(() => {
    if (editedName.trim() && onNameChange) {
      onNameChange(editedName.trim());
    }
    setIsEditingName(false);
  }, [editedName, onNameChange]);

  const handleCancelEditing = useCallback(() => {
    setEditedName(roomName || '');
    setIsEditingName(false);
  }, [roomName]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSaveName();
      } else if (e.key === 'Escape') {
        handleCancelEditing();
      }
    },
    [handleSaveName, handleCancelEditing]
  );
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-6">
        {/* Left section: Brand + Room name */}
        <div className="flex items-center gap-2">
          <Link href="/">
            <Home className="size-5" />
          </Link>
          {/* Editable Room Name */}
          {roomName !== undefined && (
            <>
              <div className="h-4 w-px bg-border mx-2" />
              {isEditingName ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="h-7 w-48 text-sm"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={handleSaveName}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={handleCancelEditing}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleStartEditing}
                  className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors group"
                >
                  <span className="truncate max-w-[200px]">{roomName}</span>
                  <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                </button>
              )}
            </>
          )}
          {/* Room Status Selector */}
          {roomStatus && onStatusChange && (
            <>
              <Combobox
                className="w-32"
                options={[
                  { value: 'draft', label: 'Draft', icon: null },
                  { value: 'active', label: 'Active', icon: null },
                  { value: 'archived', label: 'Archived', icon: null },
                ]}
                value={roomStatus}
                setValue={(val) => onStatusChange(val as RoomStatus)}
                size="sm"
                searchable={false}
                selector={
                  <Badge variant="outline" className="capitalize">
                    {roomStatus}
                  </Badge>
                }
              />
            </>
          )}
        </div>

        {/* Right section: Connection status, Collaborators, Export */}
        <div className="flex items-center gap-2">
          {/* Connection Status */}
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-muted-foreground text-xs">Connected</span>
            </div>
          </div>
          {others.length > 0 && (
            <div className="flex items-center -space-x-2">
              {others.slice(0, 5).map((user, index) => (
                <div
                  key={`${user.id}-${index}`}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-background"
                  style={{ backgroundColor: user.info?.color }}
                  title={user.info?.name ?? 'Anonymous'}
                >
                  {user.info?.name?.charAt(0).toUpperCase() ?? '?'}
                </div>
              ))}
              {others.length > 5 && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 border-background bg-muted text-muted-foreground">
                  +{others.length - 5}
                </div>
              )}
            </div>
          )}
          {/* View Mode Toggle */}
          {storyboards.length > 0 && (
            <ButtonGroup>
              {[
                { id: 'list' as const, label: 'List', icon: List },
                { id: 'grid' as const, label: 'Grid', icon: Grid },
              ].map((option) => (
                <Button
                  key={option.id}
                  type="button"
                  size="sm"
                  variant={'outline'}
                  className={cn(
                    viewMode === option.id
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => onViewModeChange(option.id)}
                >
                  <option.icon className="size-3.5" /> {option.label}
                </Button>
              ))}
            </ButtonGroup>
          )}
          <Button
            size="xs"
            variant="outline"
            onClick={() => onViewModeChange('preview')}
          >
            <Play className="size-3.5 fill-foreground" />
            Preview
          </Button>

          {/* Export Button */}
          {storyboards.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="gap-2"
              onClick={onOpenExportDialog}
            >
              <Figma className="size-3.5" />
              Export
            </Button>
          )}

          <SettingsMenu asset={asset} />
        </div>
      </div>
    </nav>
  );
}

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '../ui/badge';
import { Combobox } from '../ui/combobox';

function SettingsMenu({ asset }: { asset: ShadeAssetProps | null }) {
  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button size="sm" variant="outline" className="p-0 size-8">
            <Settings className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Settings</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link
              href={
                asset
                  ? `https://app.shade.inc/supermix/f/SM-${asset.path
                      .split('/')
                      .slice(0, -1)
                      .join('/')}`
                  : ''
              }
              target="_blank"
            >
              {asset && (
                <span
                  className="text-sm text-muted-foreground truncate max-w-[200px]"
                  title={asset.name}
                >
                  {asset.name}
                </span>
              )}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
