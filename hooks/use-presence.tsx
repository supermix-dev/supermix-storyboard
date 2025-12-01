'use client';

import {
  useMyPresence,
  useOthers,
  useSelf,
  useUpdateMyPresence,
} from '@/liveblocks.config';

export function usePresence() {
  const [myPresence] = useMyPresence();
  const updateMyPresence = useUpdateMyPresence();
  const others = useOthers();
  const self = useSelf();

  // Get all users including self
  const allUsers = [
    ...(self
      ? [
          {
            id: self.id,
            info: self.info,
            presence: self.presence,
            isSelf: true,
          },
        ]
      : []),
    ...others.map((other) => ({
      id: other.id,
      info: other.info,
      presence: other.presence,
      isSelf: false,
    })),
  ];

  // Get users currently viewing a specific storyboard
  const getUsersViewingStoryboard = (storyboardId: string) => {
    return others.filter(
      (user) => user.presence?.selectedStoryboardId === storyboardId
    );
  };

  // Update which storyboard the current user is viewing
  const setSelectedStoryboard = (storyboardId: string | null) => {
    updateMyPresence({ selectedStoryboardId: storyboardId });
  };

  // Update cursor position
  const setCursor = (cursor: { x: number; y: number } | null) => {
    updateMyPresence({ cursor });
  };

  return {
    myPresence,
    self,
    others,
    allUsers,
    getUsersViewingStoryboard,
    setSelectedStoryboard,
    setCursor,
    connectionCount: others.length + 1,
  };
}

// Avatar component for displaying user presence
export function UserAvatar({
  name,
  color,
  avatar,
  size = 'md',
}: {
  name: string;
  color: string;
  avatar?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className={`${sizeClasses[size]} rounded-full ring-2`}
        style={{ outlineColor: color }}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-medium ring-2 ring-background`}
      style={{ backgroundColor: color }}
      title={name}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
