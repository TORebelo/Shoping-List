"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MemberAvatars, type MemberBadge } from "@/components/member-avatars";
import { relativeTimePt } from "@/lib/format";
import { getDb } from "@/lib/firebase/client";
import type { ItemDoc, ListDoc, MemberDoc } from "@/lib/domain/types";

const PREVIEW_ITEMS = 4;

export function ListCard({ list }: { list: ListDoc }) {
  const [members, setMembers] = useState<MemberBadge[]>([]);
  const [preview, setPreview] = useState<ItemDoc[]>([]);

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

  useEffect(() => {
    const db = getDb();
    return onSnapshot(
      query(
        collection(db, "lists", list.id, "items"),
        orderBy("createdAt", "asc"),
        limit(PREVIEW_ITEMS),
      ),
      (snap) => {
        setPreview(snap.docs.map((d) => d.data() as ItemDoc));
      },
      (err) => {
        console.warn("[ListCard] items preview error", err);
        setPreview([]);
      },
    );
  }, [list.id]);

  const isClosed = list.status === "closed";
  const itemSuffix = list.itemCount === 1 ? "item" : "itens";
  const when = relativeTimePt(
    isClosed && list.closedAt ? list.closedAt : list.createdAt,
  );

  return (
    <Link
      href={`/l/${list.id}`}
      className="focus-visible:ring-ring block rounded-xl outline-none focus-visible:ring-2"
    >
      <Card
        className={
          "transition hover:-translate-y-px hover:ring-foreground/20 " +
          (isClosed ? "opacity-70 grayscale-[20%]" : "")
        }
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="truncate text-base">{list.name}</CardTitle>
            {isClosed ? (
              <span className="bg-muted text-muted-foreground shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                fechada
              </span>
            ) : null}
          </div>
          <CardDescription>
            {list.itemCount} {itemSuffix}
            {when ? <span className="mx-1.5 opacity-40">·</span> : null}
            {when}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {preview.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {preview.slice(0, PREVIEW_ITEMS).map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2 min-w-0"
                >
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.addedByColor }}
                    aria-hidden
                  />
                  <span
                    className={
                      "truncate " +
                      (item.checked
                        ? "text-muted-foreground line-through"
                        : "")
                    }
                  >
                    {item.name}
                  </span>
                </li>
              ))}
              {list.itemCount > PREVIEW_ITEMS ? (
                <li className="text-muted-foreground pl-3 text-xs">
                  + {list.itemCount - PREVIEW_ITEMS} mais…
                </li>
              ) : null}
            </ul>
          ) : list.itemCount === 0 ? (
            <p className="text-muted-foreground text-xs italic">Sem itens</p>
          ) : null}
          <MemberAvatars members={members} size="sm" />
        </CardContent>
      </Card>
    </Link>
  );
}
