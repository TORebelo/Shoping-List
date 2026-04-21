import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";

export type MemberBadge = {
  uid: string;
  displayName: string;
  color: string;
};

export function MemberAvatars({
  members,
  size = "default",
}: {
  members: MemberBadge[];
  size?: "sm" | "default" | "lg";
}) {
  return (
    <AvatarGroup>
      {members.slice(0, 4).map((m) => (
        <Avatar
          key={m.uid}
          size={size}
          title={m.displayName}
          aria-label={m.displayName}
        >
          <AvatarFallback
            style={{ backgroundColor: m.color, color: "white" }}
          >
            {m.displayName.trim().charAt(0).toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
      ))}
    </AvatarGroup>
  );
}
