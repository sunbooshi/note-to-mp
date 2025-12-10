import React, { useState } from "react";
import { HamburgerMenuIcon, CheckIcon } from "@radix-ui/react-icons"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LoadingOrb } from "./Loading";
import { TFile } from "obsidian";

export enum NoteItemStatus {
  Init,
  Rendering,
  Done,
}

export interface NoteItem {
  note: TFile;
  id: string;
  title: string;
  status: NoteItemStatus;
}

const SortableItem = ({ item }: { item: NoteItem }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    padding: "12px",
    marginBottom: "8px",
    background: "#fff",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,.12)",
    transform: CSS.Translate.toString(transform),
    transition,
    cursor: "grab",
    display: "flex",
    alignItems: "center",
  };

  const spacer = <div style={{ width: 10 }}></div>;
  let content = <></>;
  if (item.status == NoteItemStatus.Init) {
    content = (<><HamburgerMenuIcon /> {spacer} <div>{item.title}</div></>);
  }
  else if (item.status == NoteItemStatus.Rendering) {
    content = (<><LoadingOrb fontSize={14} width={15} height={15} /> {spacer} <div>{item.title}</div></>);
  }
  else if (item.status == NoteItemStatus.Done) {
    content = (<><CheckIcon /> {spacer} <div>{item.title}</div></>);
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {content}
    </div>
  );
};

export default function NoteList({ items, setItems, disable }: { items: NoteItem[], setItems: (items: NoteItem[]) => void, disable: boolean }) {
  const sensors = useSensors(useSensor(PointerSensor));
  
  const list = items.map((item) => (
    <SortableItem key={item.id} item={item} />
  ));

  if (disable) {
    return (
      <>
      {list}
      </>
    );
  }

  return (
    <DndContext
      sensors={disable ? [] : sensors}
      collisionDetection={closestCenter}
      onDragEnd={(event) => {
        const { active, over } = event;
        if (over !== null && active.id !== over.id) {
          const oldIndex = items.findIndex(item => item.id === active.id)
          const newIndex = items.findIndex(item => item.id === over.id);
          setItems(arrayMove(items, oldIndex, newIndex));
        }
      }}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {list}
      </SortableContext>
    </DndContext>
  );
}
