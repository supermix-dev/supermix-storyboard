'use client';

import { createRoom } from '@/app/actions/rooms';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { InputWrapper } from '../ui/input-wrapper';

type CreateRoomDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateRoomDialog({
  open,
  onOpenChange,
}: CreateRoomDialogProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [assetPath, setAssetPath] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please enter a name for your storyboard');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const { id } = await createRoom(
        name.trim(),
        assetPath.trim() || undefined
      );
      router.push(`/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isCreating) {
      handleCreate();
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setName('');
      setAssetPath('');
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="min-w-md w-full">
        <DialogHeader>
          <DialogTitle>Create New Storyboard</DialogTitle>
          <DialogClose onClick={handleClose} />
        </DialogHeader>
        <div className="space-y-6">
          <InputWrapper label="Storyboard Name">
            <Input
              id="room-name"
              placeholder="My Storyboard"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isCreating}
              autoFocus
            />
          </InputWrapper>

          <InputWrapper label="Shade Asset Path (optional)">
            <Input
              id="asset-path"
              placeholder="e.g. project/asset-name"
              value={assetPath}
              onChange={(e) => setAssetPath(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isCreating}
            />
          </InputWrapper>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !name.trim()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
