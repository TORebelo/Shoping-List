"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MemberAvatars, type MemberBadge } from "@/components/member-avatars";
import { getDb } from "@/lib/firebase/client";
import type { ListDoc, MemberDoc } from "@/lib/domain/types";

function formatClosedAt(closedAt: ListDoc["closedAt"]): string {
  if (!closedAt) return "";
  try {
    const date = (closedAt as unknown as { toDate(): Date }).toDate();
    return date.toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "";
  }
}

export function ListCard({ list }: { list: ListDoc }) {
  const [members, setMembers] = useState<MemberBadge[]>([]);

  useEffect(() => {
    const db = getDb();
    return onSnapshot(
      collection(db, "lists", list.id, "members"),
      (snap) => {
        setMembers(
          snap.docs.map((d) => {
            const m = d.data() as MemberDoc;
            return { uid: m.uid, displayName: m.displayName, color: m.color };
          }),
        );
      },
      (err) => {
        console.warn("[ListCard] members subscription error", err);
        setMembers([]);
      },
    );
  }, [list.id]);

  const isClosed = list.status === "closed";
  const itemSuffix = list.itemCount === 1 ? "item" : "itens";
  const description = isClosed
    ? `${list.itemCount} ${itemSuffix} · fechada ${formatClosedAt(list.closedAt)}`
    : `${list.itemCount} ${itemSuffix} · ativa`;

  return (
    <Link
      href={`/l/${list.id}`}
      className="focus-visible:ring-ring rounded-xl outline-none focus-visible:ring-2"
    >
      <Card
        className={
          "transition hover:ring-foreground/20 " +
          (isClosed ? "opacity-70" : "")
        }
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="truncate">{list.name}</span>
            {isClosed ? (
              <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-xs font-normal">
                fechada
              </span>
            ) : null}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <MemberAvatars members={members} size="sm" />
        </CardContent>
      </Card>
    </Link>
  );
}
