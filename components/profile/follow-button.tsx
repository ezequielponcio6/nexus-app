"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleFollow } from "@/actions/follow";
import { toast } from "sonner";

export function FollowButton({
  targetId,
  initialFollowing,
}: {
  targetId: string;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [, startTransition] = useTransition();

  function handleClick() {
    const next = !following;
    setFollowing(next);

    startTransition(async () => {
      try {
        await toggleFollow(targetId, following);
      } catch {
        setFollowing(following);
        toast.error("Não foi possível concluir a ação.");
      }
    });
  }

  return (
    <Button variant={following ? "outline" : "default"} size="sm" onClick={handleClick}>
      {following ? "Seguindo" : "Seguir"}
    </Button>
  );
}
