"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "./components/theme-toggle"
import { SidebarNavigation } from "./components/sidebar-navigation"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  CheckCircle2,
  Cloud,
  Edit3,
  Eye,
  FileText,
  Grid2X2,
  List,
  Loader2,
  Menu,
  MoreHorizontal,
  Pin,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Star,
  Tag,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { useNotes } from "@/hooks/use-notes"
import type { ClientNote } from "@/lib/notes/mapper"

type View = "all" | "pinned" | "recent" | "favorites" | "trash" | "settings" | "tags"
type Sort = "edited" | "created" | "title"

const colorClasses: Record<string, string> = {
  violet: "border-l-violet-500",
  amber: "border-l-amber-500",
  blue: "border-l-blue-500",
  emerald: "border-l-emerald-500",
  rose: "border-l-rose-500",
  slate: "border-l-slate-400",
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value))

export default function EnhancedTodoApp({ onBackToLanding }: { onBackToLanding?: () => void }) {
  const { darkMode } = useTheme()
  const {
    notes,
    isLoading,
    isMutating,
    authError,
    error,
    createNote,
    editNote,
    togglePin,
    toggleFavorite,
    trashNote,
    restoreNote,
    permanentDeleteNote,
    refreshNotes,
    retry,
  } = useNotes()

  const [view, setView] = useState<View>("all")
  const [query, setQuery] = useState("")
  const [tagFilter, setTagFilter] = useState("all")
  const [sort, setSort] = useState<Sort>("edited")
  const [grid, setGrid] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<ClientNote | null>(null)
  const [viewingNote, setViewingNote] = useState<ClientNote | null>(null)
  const [noteToDelete, setNoteToDelete] = useState<ClientNote | null>(null)
  const [draft, setDraft] = useState({
    title: "",
    content: "",
    tags: "",
    color: "violet",
    pinned: false,
    favorite: false,
  })

  // Keyboard shortcut: Cmd/Ctrl + K to focus search
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        document.getElementById("note-search")?.focus()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const allTags = useMemo(
    () => Array.from(new Set(notes.flatMap((note) => note.tags))).sort(),
    [notes]
  )

  const visibleNotes = useMemo(() => {
    return notes
      .filter((note) => {
        const matchesQuery = `${note.title} ${note.content}`
          .toLowerCase()
          .includes(query.toLowerCase())
        const matchesTag = tagFilter === "all" || note.tags.includes(tagFilter)
        const matchesView =
          view === "trash"
            ? note.trashed
            : !note.trashed &&
              (view === "all" ||
                view === "tags" ||
                (view === "pinned" && note.pinned) ||
                (view === "recent" && Date.now() - new Date(note.updatedAt).getTime() < 604800000) ||
                (view === "favorites" && note.favorite))
        return matchesQuery && matchesTag && matchesView
      })
      .sort((a, b) => {
        if (sort === "title") return a.title.localeCompare(b.title)
        if (sort === "created")
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
  }, [notes, query, tagFilter, view, sort])

  const counts = {
    all: notes.filter((note) => !note.trashed).length,
    pinned: notes.filter((note) => !note.trashed && note.pinned).length,
    recent: notes.filter(
      (note) => !note.trashed && Date.now() - new Date(note.updatedAt).getTime() < 604800000
    ).length,
    favorites: notes.filter((note) => !note.trashed && note.favorite).length,
    trash: notes.filter((note) => note.trashed).length,
  }

  const openNew = () => {
    setEditing(null)
    setDraft({ title: "", content: "", tags: "", color: "violet", pinned: false, favorite: false })
    setEditorOpen(true)
  }

  const openEdit = (note: ClientNote) => {
    setEditing(note)
    setDraft({
      title: note.title,
      content: note.content,
      tags: note.tags.join(", "),
      color: note.color,
      pinned: note.pinned,
      favorite: note.favorite,
    })
    setEditorOpen(true)
  }

  const saveNote = async () => {
    if (!draft.title.trim()) {
      toast.error("Add a title before saving")
      return
    }

    const payload = {
      title: draft.title.trim(),
      content: draft.content.trim(),
      tags: draft.tags
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
      color: draft.color as any,
      pinned: draft.pinned,
      favorite: draft.favorite,
    }

    if (editing) {
      const updated = await editNote(editing.id, payload)
      if (updated) setEditorOpen(false)
    } else {
      const created = await createNote(payload)
      if (created) setEditorOpen(false)
    }
  }

  const handleConfirmPermanentDelete = async () => {
    if (!noteToDelete) return
    const success = await permanentDeleteNote(noteToDelete.id)
    if (success) {
      setNoteToDelete(null)
    }
  }

  const title =
    view === "all"
      ? "All Notes"
      : view === "pinned"
      ? "Pinned"
      : view === "recent"
      ? "Recently Edited"
      : view === "favorites"
      ? "Favorites"
      : view === "trash"
      ? "Trash"
      : view === "tags"
      ? "Tags & Categories"
      : "Settings"

  return (
    <div
      className={cn(
        "min-h-screen bg-gradient-to-br from-violet-50/30 to-purple-50/30 dark:from-slate-950 dark:to-slate-900",
        darkMode && "dark"
      )}
    >
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
        <div className="flex items-center justify-between px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu />
            </Button>
            {onBackToLanding && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBackToLanding}
                aria-label="Back to landing"
              >
                <ArrowLeft />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg">
                <FileText />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">NoteFlow</div>
                <div className="hidden text-xs text-slate-500 sm:block">
                  Capture ideas. Find them instantly.
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              id="new-note-header-btn"
              onClick={openNew}
              disabled={isMutating || isLoading}
              className="hidden rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md sm:flex"
            >
              <Plus data-icon="inline-start" />
              New Note
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200 bg-white/95 p-4 pt-20 backdrop-blur-xl transition-transform dark:border-slate-800 dark:bg-slate-900/95 lg:static lg:z-auto lg:translate-x-0 lg:bg-white/60",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <span className="font-semibold">Navigation</span>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
              <X />
            </Button>
          </div>
          <SidebarNavigation
            activeTab={view}
            onTabChange={(next) => {
              setView(next as View)
              setSidebarOpen(false)
            }}
            stats={counts}
            theme="default"
          />
        </aside>

        {sidebarOpen && (
          <button
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          />
        )}

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 p-4 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {/* View Header */}
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="mb-1 text-sm font-medium text-violet-600 dark:text-violet-400">
                  Your workspace
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {title}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {view === "trash"
                    ? "Restore notes or delete them permanently when you are ready."
                    : view === "settings"
                    ? "Your cloud workspace configuration and synchronization status."
                    : view === "tags"
                    ? "Explore all tags and categorize your thoughts."
                    : "A calm place for the ideas worth keeping."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  id="refresh-notes-button"
                  variant="outline"
                  size="sm"
                  onClick={refreshNotes}
                  disabled={isLoading || isMutating}
                  className="rounded-full"
                  title="Refresh from cloud database"
                >
                  <RefreshCw
                    className={cn("size-3.5", isLoading && "animate-spin")}
                    data-icon="inline-start"
                  />
                  Refresh
                </Button>
                <Button
                  id="new-note-mobile-btn"
                  onClick={openNew}
                  disabled={isMutating || isLoading}
                  className="rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md sm:hidden"
                >
                  <Plus data-icon="inline-start" />
                  New Note
                </Button>
              </div>
            </div>

            {/* Top Stats Overview */}
            <div className="mb-6 grid grid-cols-3 gap-3">
              <Card className="border-0 bg-white/70 shadow-sm dark:bg-slate-900/70">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500">Total notes</p>
                  <p className="mt-1 text-2xl font-bold">{counts.all}</p>
                </CardContent>
              </Card>
              <Card className="border-0 bg-white/70 shadow-sm dark:bg-slate-900/70">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500">Pinned</p>
                  <p className="mt-1 text-2xl font-bold">{counts.pinned}</p>
                </CardContent>
              </Card>
              <Card className="border-0 bg-white/70 shadow-sm dark:bg-slate-900/70">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500">Recently edited</p>
                  <p className="mt-1 text-2xl font-bold">{counts.recent}</p>
                </CardContent>
              </Card>
            </div>

            {/* Error Banner with Retry */}
            {(authError || (error && notes.length === 0)) && (
              <div className="mb-6 flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-900 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
                <div className="flex items-center gap-3">
                  <AlertCircle className="size-5 text-rose-600 dark:text-rose-400 shrink-0" />
                  <p className="text-sm font-medium">{authError || error}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={retry}
                  className="rounded-full border-rose-300 hover:bg-rose-100 dark:border-rose-800 dark:hover:bg-rose-900/50"
                >
                  <RefreshCw className="size-3.5" data-icon="inline-start" />
                  Retry Connection
                </Button>
              </div>
            )}

            {/* Settings View Panel */}
            {view === "settings" && (
              <Card className="border-0 bg-white/80 shadow-md dark:bg-slate-900/80 mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Workspace Cloud Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                    <Cloud className="size-5 text-violet-500" />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        Database Persistence
                      </p>
                      <p className="text-xs text-slate-500">
                        Connected to Supabase PostgreSQL with owner-isolated Row Level Security (RLS).
                      </p>
                    </div>
                    {authError || error ? (
                      <Badge variant="outline" className="border-rose-500 text-rose-600 dark:border-rose-400 dark:text-rose-400">
                        <AlertCircle className="size-3.5 mr-1" />
                        Connection Error
                      </Badge>
                    ) : isLoading ? (
                      <Badge variant="outline" className="border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-400">
                        <Loader2 className="size-3.5 mr-1 animate-spin" />
                        Connecting...
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400">
                        <CheckCircle2 className="size-3.5 mr-1" />
                        Connected
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Active Session</p>
                      <p className="text-xs text-slate-500">
                        Anonymous session established without requiring email registration.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={refreshNotes}>
                      Sync Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tags Overview Panel (when Tags & Categories is clicked) */}
            {view === "tags" && (
              <div className="mb-6 rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  All Active Tags ({allTags.length})
                </p>
                {allTags.length === 0 ? (
                  <p className="text-sm text-slate-500">No tags added yet. Add tags when creating or editing notes.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={tagFilter === "all" ? "default" : "outline"}
                      onClick={() => setTagFilter("all")}
                      className="rounded-full text-xs"
                    >
                      All Tags
                    </Button>
                    {allTags.map((t) => (
                      <Button
                        key={t}
                        size="sm"
                        variant={tagFilter === t ? "default" : "outline"}
                        onClick={() => setTagFilter(t)}
                        className="rounded-full text-xs"
                      >
                        #{t}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Controls Bar: Search, Tag Filter, Sort, Layout */}
            {view !== "settings" && (
              <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/60 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="note-search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search notes..."
                    className="rounded-xl border-0 bg-slate-100/70 pl-10 pr-16 dark:bg-slate-800/70"
                  />
                  {query ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2"
                      onClick={() => setQuery("")}
                      aria-label="Clear search"
                    >
                      <X />
                    </Button>
                  ) : (
                    <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border bg-white px-1.5 py-0.5 text-[10px] text-slate-400 sm:block">
                      ⌘ K
                    </kbd>
                  )}
                </div>

                <Select value={tagFilter} onValueChange={setTagFilter}>
                  <SelectTrigger className="w-full rounded-xl md:w-40">
                    <Tag data-icon="inline-start" />
                    <SelectValue placeholder="All tags" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All tags</SelectItem>
                    {allTags.map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sort} onValueChange={(value) => setSort(value as Sort)}>
                  <SelectTrigger className="w-full rounded-xl md:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="edited">Last edited</SelectItem>
                    <SelectItem value="created">Date created</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                  <Button
                    variant={grid ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setGrid(true)}
                    aria-label="Grid view"
                  >
                    <Grid2X2 />
                  </Button>
                  <Button
                    variant={!grid ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setGrid(false)}
                    aria-label="List view"
                  >
                    <List />
                  </Button>
                </div>
              </div>
            )}

            {/* Note Cards List / Skeleton / Empty State */}
            {isLoading ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-44 rounded-3xl border border-slate-200/60 bg-white/50 p-5 shadow-sm animate-pulse dark:border-slate-800 dark:bg-slate-900/50"
                  >
                    <div className="h-5 w-3/4 bg-slate-200 rounded-lg dark:bg-slate-800 mb-3" />
                    <div className="h-3 w-1/3 bg-slate-200 rounded-md dark:bg-slate-800 mb-4" />
                    <div className="space-y-2">
                      <div className="h-3 w-full bg-slate-200/80 rounded dark:bg-slate-800/80" />
                      <div className="h-3 w-5/6 bg-slate-200/80 rounded dark:bg-slate-800/80" />
                    </div>
                  </div>
                ))}
              </div>
            ) : view !== "settings" && visibleNotes.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white/40 px-6 py-20 text-center dark:border-slate-700 dark:bg-slate-900/30">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300">
                  <Archive />
                </div>
                <h2 className="text-lg font-semibold">
                  {query
                    ? "No notes match your search"
                    : view === "trash"
                    ? "Trash is empty"
                    : "Nothing here yet"}
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
                  {query
                    ? "Try a different title, keyword, or clear the search."
                    : view === "trash"
                    ? "Notes moved to trash will appear here for review or permanent deletion."
                    : "Create a note to give your ideas a place to land."}
                </p>
                {!query && view !== "trash" && (
                  <Button
                    onClick={openNew}
                    disabled={isMutating}
                    className="mt-5 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white"
                  >
                    <Plus data-icon="inline-start" />
                    Create your first note
                  </Button>
                )}
              </div>
            ) : (
              view !== "settings" && (
                <div
                  className={cn(
                    grid ? "grid gap-5 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-3"
                  )}
                >
                  {visibleNotes.map((note) => (
                    <Card
                      key={note.id}
                      className={cn(
                        "group border-0 border-l-4 bg-white/80 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl dark:bg-slate-900/80",
                        colorClasses[note.color] || "border-l-violet-500",
                        !grid && "flex-row"
                      )}
                    >
                      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                        <div className="min-w-0">
                          <CardTitle className="truncate text-base">{note.title}</CardTitle>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {note.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-[10px] font-medium"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Actions for ${note.title}`}
                            >
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewingNote(note)}>
                              <Eye data-icon="inline-start" />
                              View full note
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(note)}>
                              <Edit3 data-icon="inline-start" />
                              Edit note
                            </DropdownMenuItem>

                            {note.trashed ? (
                              <>
                                <DropdownMenuItem onClick={() => restoreNote(note.id)}>
                                  <RotateCcw data-icon="inline-start" />
                                  Restore note
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setNoteToDelete(note)}
                                  className="text-rose-600 focus:text-rose-600 dark:text-rose-400"
                                >
                                  <Trash2 data-icon="inline-start" />
                                  Delete permanently
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem onClick={() => togglePin(note.id)}>
                                  <Pin data-icon="inline-start" />
                                  {note.pinned ? "Unpin" : "Pin"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleFavorite(note.id)}>
                                  <Star data-icon="inline-start" />
                                  {note.favorite ? "Unfavorite" : "Favorite"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => trashNote(note.id)}>
                                  <Trash2 data-icon="inline-start" />
                                  Move to trash
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardHeader>
                      <CardContent
                        className="pt-0 cursor-pointer"
                        onClick={() => setViewingNote(note)}
                      >
                        <p className="line-clamp-4 min-h-20 text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {note.content || "No content yet."}
                        </p>
                        <Separator className="my-4" />
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>{formatDate(note.updatedAt)}</span>
                          <div className="flex gap-2">
                            {note.pinned && <Pin className="text-violet-500" />}
                            {note.favorite && (
                              <Star className="fill-amber-400 text-amber-400" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            )}
          </div>
        </main>
      </div>

      {/* Editor Modal (Create / Edit) */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              {editing ? "Edit note" : "Create a new note"}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Capture an idea, add tags, and sync it to your cloud workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5 py-2">
            <div>
              <Label htmlFor="note-title" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Title
              </Label>
              <Input
                id="note-title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Give your note a clear title"
                className="mt-2 bg-slate-50 dark:bg-slate-800/90 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="note-content" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Content
              </Label>
              <Textarea
                id="note-content"
                value={draft.content}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                placeholder="Start writing..."
                className="mt-2 min-h-48 resize-y leading-7 bg-slate-50 dark:bg-slate-800/90 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="note-tags" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Tags
                </Label>
                <Input
                  id="note-tags"
                  value={draft.tags}
                  onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                  placeholder="ideas, work, personal"
                  className="mt-2 bg-slate-50 dark:bg-slate-800/90 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
                />
                <p className="mt-1 text-xs text-slate-500">Separate tags with commas.</p>
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Note accent
                </Label>
                <Select
                  value={draft.color}
                  onValueChange={(color) => setDraft({ ...draft, color })}
                >
                  <SelectTrigger className="mt-2 bg-slate-50 dark:bg-slate-800/90 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    {Object.keys(colorClasses).map((color) => (
                      <SelectItem key={color} value={color}>
                        {color[0].toUpperCase() + color.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button id="note-cancel-button" variant="outline" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button
              id="note-save-button"
              onClick={saveNote}
              disabled={isMutating}
              className="bg-gradient-to-r from-violet-500 to-purple-600 text-white"
            >
              {isMutating && <Loader2 className="size-4 animate-spin mr-2" />}
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Permanent Deletion */}
      <AlertDialog
        open={Boolean(noteToDelete)}
        onOpenChange={(open) => !open && setNoteToDelete(null)}
      >
        <AlertDialogContent className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. &quot;{noteToDelete?.title}&quot; will be permanently
              removed from your database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel id="cancel-delete-action-btn">Cancel</AlertDialogCancel>
            <AlertDialogAction
              id="confirm-delete-action-btn"
              onClick={handleConfirmPermanentDelete}
              disabled={isMutating}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isMutating && <Loader2 className="size-4 animate-spin mr-2" />}
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Full Note View Modal */}
      <Dialog open={Boolean(viewingNote)} onOpenChange={(open) => !open && setViewingNote(null)}>
        <DialogContent className="max-w-2xl rounded-3xl max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {viewingNote?.pinned && <Pin className="size-4 text-violet-500 shrink-0" />}
              {viewingNote?.favorite && <Star className="size-4 fill-amber-400 text-amber-400 shrink-0" />}
              <DialogTitle className="text-xl font-bold truncate">{viewingNote?.title}</DialogTitle>
            </div>
            <DialogDescription className="flex items-center gap-4 text-xs text-slate-400 pt-1">
              <span>Updated {viewingNote && formatDate(viewingNote.updatedAt)}</span>
              <span>Created {viewingNote && formatDate(viewingNote.createdAt)}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {viewingNote?.tags && viewingNote.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {viewingNote.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">
              {viewingNote?.content || "No content."}
            </p>
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button variant="outline" onClick={() => setViewingNote(null)}>
              Close
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (viewingNote) {
                  const noteToEdit = viewingNote
                  setViewingNote(null)
                  openEdit(noteToEdit)
                }
              }}
            >
              <Edit3 className="size-4 mr-2" />
              Edit Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
