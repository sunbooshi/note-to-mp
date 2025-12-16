import React, { useState } from "react";
import { HamburgerMenuIcon, CheckIcon } from "@radix-ui/react-icons"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor, // 添加 TouchSensor
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style: React.CSSProperties = {
    padding: "12px",
    marginBottom: "8px",
    background: "#fff",
    borderRadius: "8px",
    boxShadow: isDragging 
      ? "0 5px 15px rgba(0,0,0,.3)" // 拖拽时增加阴影
      : "0 1px 3px rgba(0,0,0,.12)", // 正常状态下较小的阴影
    transform: CSS.Translate.toString(transform),
    transition,
    cursor: "grab",
    display: "flex",
    alignItems: "center",
    // 添加移动端友好的样式
    touchAction: "none", // 防止触摸滚动干扰拖拽
    // 拖拽时的视觉反馈
    zIndex: isDragging ? 1000 : "auto",
    position: "relative",
    // 移动端优化
    userSelect: "none",
    WebkitUserSelect: "none",
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
  // 添加对移动端触摸传感器的支持
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 稍微增加激活距离，改善移动端体验
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // 触摸延迟250ms后激活拖拽
        tolerance: 5, // 触摸容忍度
      },
    })
  );
  
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
        {/* 为拖拽容器添加移动端友好的样式 */}
        <div style={{ 
          touchAction: "pan-y", // 允许垂直滚动但阻止水平滚动和缩放
          minHeight: "100%" 
        }}>
          {list}
        </div>
      </SortableContext>
    </DndContext>
  );
}