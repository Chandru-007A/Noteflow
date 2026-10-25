"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Archive, Clock3, FileText, Heart, Pin, Settings, Tag } from "lucide-react"

type Stats = { all: number; pinned: number; recent: number; favorites: number; trash: number }
export function SidebarNavigation({ activeTab, onTabChange, stats }: { activeTab: string; onTabChange: (tab: string) => void; stats: Stats; theme?: string }) {
  const items = [
    { id: "all", label: "All Notes", icon: FileText, count: stats.all },
    { id: "pinned", label: "Pinned", icon: Pin, count: stats.pinned },
    { id: "recent", label: "Recently Edited", icon: Clock3, count: stats.recent },
    { id: "favorites", label: "Favorites", icon: Heart, count: stats.favorites },
    { id: "trash", label: "Trash", icon: Archive, count: stats.trash },
  ]
  return <nav className="flex flex-col gap-1"><p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Workspace</p>{items.map(({ id, label, icon: Icon, count }) => <Button key={id} variant={activeTab === id ? "default" : "ghost"} onClick={() => onTabChange(id)} className={cn("h-10 w-full justify-start gap-3 rounded-xl", activeTab === id && "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md")}><Icon data-icon="inline-start" /><span className="flex-1 text-left">{label}</span><Badge variant={activeTab === id ? "secondary" : "outline"} className="text-xs">{count}</Badge></Button>)}<div className="my-4 h-px bg-slate-200 dark:bg-slate-800" /><Button variant={activeTab === "settings" ? "default" : "ghost"} onClick={() => onTabChange("settings")} className="h-10 w-full justify-start gap-3 rounded-xl"><Settings data-icon="inline-start" />Settings</Button><Button variant="ghost" onClick={() => onTabChange("tags")} className="h-10 w-full justify-start gap-3 rounded-xl"><Tag data-icon="inline-start" />Tags & Categories</Button></nav>
}
