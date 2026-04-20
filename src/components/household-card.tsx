"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MemberAvatars, type MemberBadge } from "@/components/member-avatars";
import { getDb } from "@/lib/firebase/client";
import type { HouseholdDoc, ListDoc, MemberDoc } from "@/lib/domain/types";

export function HouseholdCard({ household }: { household: HouseholdDoc }) {
  const [members, setMembers] = useState<MemberBadge[]>([]);
  const [activeList, setActiveList] = useState<ListDoc | null>(null);
  const [itemCount, setItemCount] = useState<number | null>(null);

  useEffect(() => {
    const db = getDb();
    const membersCol = collection(db, "households", household.id, "members");
    const unsubMembers = onSnapshot(membersCol, (snap) => {
      setMembers(
        snap.docs.map((d) => {
          const m = d.data() as MemberDoc;
          return { uid: m.uid, displayName: m.displayName, color: m.color };
        }),
      );
    });
    return unsubMembers;
  }, [household.id]);

  useEffect(() => {
    const db = getDb();
    const activeQuery = query(
      collection(db, "households", household.id, "lists"),
      where("status", "==", "active"),
    );
    return onSnapshot(activeQuery, (snap) => {
      const d = snap.docs[0];
      if (!d) {
        setActiveList(null);
        setItemCount(0);
        return;
      }
      const list = d.data() as ListDoc & { itemCount?: number };
      setActiveList(list);
      setItemCount(list.itemCount ?? 0);
    });
  }, [household.id]);

  return (
    <Link
      href={`/h/${household.id}`}
      className="focus-visible:ring-ring rounded-xl outline-none focus-visible:ring-2"
    >
      <Card className="hover:ring-foreground/20 transition">
        <CardHeader>
          <CardTitle>{household.name}</CardTitle>
          <CardDescription>
            {activeList
              ? `${activeList.title} · ${itemCount ?? 0} ${
                  itemCount === 1 ? "item" : "itens"
                }`
              : "Sem lista ativa"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MemberAvatars members={members} size="sm" />
        </CardContent>
      </Card>
    </Link>
  );
}
