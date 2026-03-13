/* eslint-disable @next/next/no-img-element */
"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Connection,
  Controls,
  Edge,
  MiniMap,
  Node,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";

type Note = {
  id: string;
  title: string;
  body: string;
  category: string;
};

type NoteEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

type GraphPersisted = {
  nodes: Node[];
  edges: Edge[];
};

const STORAGE_KEY = "pkb-graph-v1";

// Seed data roughly matching the assignment CSV
const seedNotes: Note[] = [
  {
    id: "1",
    title: "React",
    body: "JavaScript library for building user interfaces using components.",
    category: "Frontend",
  },
  {
    id: "2",
    title: "Next.js",
    body: "React framework with SSR, routing, and API support built-in.",
    category: "Frontend",
  },
  {
    id: "3",
    title: "TypeScript",
    body: "Typed superset of JavaScript that compiles to plain JavaScript.",
    category: "Language",
  },
  {
    id: "4",
    title: "State Management",
    body: "Patterns for managing shared application state (Context, Zustand, Redux).",
    category: "Frontend",
  },
  {
    id: "5",
    title: "Component Design",
    body: "Principles for building reusable, maintainable, and accessible UI components.",
    category: "Frontend",
  },
  {
    id: "6",
    title: "UI Patterns",
    body: "Common UI patterns like navigation, layout, loading, and empty states.",
    category: "UX",
  },
  {
    id: "7",
    title: "Testing",
    body: "Unit, integration, and end-to-end testing strategies for frontend apps.",
    category: "Quality",
  },
  {
    id: "8",
    title: "Styling",
    body: "CSS-in-JS, utility-first CSS, and modern styling approaches.",
    category: "Frontend",
  },
];

const seedEdges: NoteEdge[] = [
  { id: "e1-2", source: "1", target: "2", label: "framework for" },
  { id: "e3-1", source: "3", target: "1", label: "used with" },
  { id: "e4-1", source: "4", target: "1", label: "supports" },
  { id: "e5-1", source: "5", target: "1", label: "built with" },
  { id: "e6-5", source: "6", target: "5", label: "applies to" },
  { id: "e7-1", source: "7", target: "1", label: "tests" },
  { id: "e8-5", source: "8", target: "5", label: "styles" },
];

type NoteFormState = {
  id: string | null;
  title: string;
  body: string;
  category: string;
};

type EdgeFormState = {
  id: string | null;
  source: string;
  target: string;
  label: string;
};

function buildInitialNodes(): Node[] {
  const radius = 220;
  const centerX = 0;
  const centerY = 0;

  return seedNotes.map((note, index) => {
    const angle = (index / seedNotes.length) * Math.PI * 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    return {
      id: note.id,
      position: { x, y },
      data: {
        label: note.title,
        note,
      },
      type: "default",
    } as Node;
  });
}

function buildInitialEdges(): Edge[] {
  return seedEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: "default",
    label: edge.label,
  }));
}

export default function Home() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [noteForm, setNoteForm] = useState<NoteFormState>({
    id: null,
    title: "",
    body: "",
    category: "",
  });

  const [edgeForm, setEdgeForm] = useState<EdgeFormState>({
    id: null,
    source: "",
    target: "",
    label: "",
  });

  // Load from localStorage (or seed)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as GraphPersisted;
        if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
          setNodes(parsed.nodes);
          setEdges(parsed.edges);
          return;
        }
      }
    } catch {
      // ignore and fall back to seed
    }

    setNodes(buildInitialNodes());
    setEdges(buildInitialEdges());
  }, [setEdges, setNodes]);

  // Persist to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload: GraphPersisted = { nodes, edges };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [nodes, edges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds: Edge[]) =>
        addEdge(
          {
            ...connection,
            type: "default",
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  const selectedNode = useMemo(
    () => nodes.find((n: Node) => n.id === selectedNodeId),
    [nodes, selectedNodeId],
  );

  const handleNodeClick = useCallback(
    (_: unknown, node: Node) => {
      setSelectedNodeId(node.id);
      const note = (node.data as any)?.note as Note | undefined;
      setNoteForm({
        id: node.id,
        title: note?.title ?? "",
        body: note?.body ?? "",
        category: note?.category ?? "",
      });
    },
    [],
  );

  const handleNewNote = () => {
    setSelectedNodeId(null);
    setNoteForm({
      id: null,
      title: "",
      body: "",
      category: "",
    });
  };

  const handleNoteChange = (
    field: keyof Omit<NoteFormState, "id">,
    value: string,
  ) => {
    setNoteForm((prev: NoteFormState) => ({ ...prev, [field]: value }));
  };

  const handleSaveNote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { id, title, body, category } = noteForm;
    if (!title.trim()) return;

    if (id) {
      setNodes((prev: Node[]) =>
        prev.map((node: Node) => {
          if (node.id !== id) return node;
          const note: Note = {
            id,
            title: title.trim(),
            body: body.trim(),
            category: category.trim() || "Uncategorized",
          };
          return {
            ...node,
            data: {
              ...(node.data || {}),
              label: note.title,
              note,
            },
          };
        }),
      );
    } else {
      const newId = Date.now().toString();
      const note: Note = {
        id: newId,
        title: title.trim(),
        body: body.trim(),
        category: category.trim() || "Uncategorized",
      };
      const newNode: Node = {
        id: newId,
        position: { x: 0, y: 0 },
        data: {
          label: note.title,
          note,
        },
        type: "default",
      };
      setNodes((prev: Node[]) => [...prev, newNode]);
      setSelectedNodeId(newId);
      setNoteForm((prev) => ({ ...prev, id: newId }));
    }
  };

  const handleDeleteSelectedNote = () => {
    if (!selectedNodeId) return;
    const idToDelete = selectedNodeId;
    setNodes((prev: Node[]) => prev.filter((n: Node) => n.id !== idToDelete));
    setEdges((prev: Edge[]) =>
      prev.filter(
        (e: Edge) => e.source !== idToDelete && e.target !== idToDelete,
      ),
    );
    setSelectedNodeId(null);
    setNoteForm({
      id: null,
      title: "",
      body: "",
      category: "",
    });
  };

  const handleEdgeChange = (
    field: keyof Omit<EdgeFormState, "id">,
    value: string,
  ) => {
    setEdgeForm((prev: EdgeFormState) => ({ ...prev, [field]: value }));
  };

  const handleSaveEdge = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { id, source, target, label } = edgeForm;
    if (!source || !target || source === target) return;

    if (id) {
      setEdges((prev: Edge[]) =>
        prev.map((edge: Edge) =>
          edge.id === id
            ? {
                ...edge,
                source,
                target,
                label: label.trim() || undefined,
              }
            : edge,
        ),
      );
    } else {
      const newId = `e-${Date.now()}`;
      const newEdge: Edge = {
        id: newId,
        source,
        target,
        type: "default",
        label: label.trim() || undefined,
      };
      setEdges((prev: Edge[]) => [...prev, newEdge]);
      setEdgeForm((prev: EdgeFormState) => ({ ...prev, id: newId }));
    }
  };

  const handleResetGraph = () => {
    setNodes(buildInitialNodes());
    setEdges(buildInitialEdges());
    setSelectedNodeId(null);
    setNoteForm({ id: null, title: "", body: "", category: "" });
    setEdgeForm({ id: null, source: "", target: "", label: "" });
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const allNoteOptions = useMemo(
    () =>
      nodes.map((node: Node) => {
        const note = (node.data as any)?.note as Note | undefined;
        return {
          id: node.id,
          title: note?.title ?? node.id,
        };
      }),
    [nodes],
  );

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50">
      <header className="border-b border-zinc-800 bg-zinc-950/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-zinc-50 sm:text-xl">
              Personal Knowledge Base Graph
            </h1>
            <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
              Explore topics and relationships visually. Click nodes to edit,
              or use the forms to add new notes and links.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetGraph}
            className="inline-flex items-center justify-center rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900"
          >
            Reset to seed graph
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6 lg:flex-row">
        <section className="relative flex-1 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            fitView
            fitViewOptions={{ padding: 0.2 }}
          >
            <Background color="#27272a" gap={16} />
            <MiniMap
              pannable
              zoomable
              nodeColor="#c4b5fd"
              maskColor="rgba(24,24,27,0.8)"
            />
            <Controls />
          </ReactFlow>
        </section>

        <aside className="flex w-full flex-col gap-4 lg:w-80">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-zinc-100">
                {selectedNode ? "Edit note" : "Create note"}
              </h2>
              <button
                type="button"
                onClick={handleNewNote}
                className="text-xs font-medium text-violet-300 hover:text-violet-200"
              >
                New
              </button>
            </div>
            <form
              className="space-y-3"
              onSubmit={handleSaveNote}
              autoComplete="off"
            >
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  Title
                </label>
                <input
                  type="text"
                  value={noteForm.title}
                  onChange={(e) => handleNoteChange("title", e.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-50 outline-none ring-0 transition focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
                  placeholder="React components"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  Category
                </label>
                <input
                  type="text"
                  value={noteForm.category}
                  onChange={(e) => handleNoteChange("category", e.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-50 outline-none ring-0 transition focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
                  placeholder="Frontend, testing…"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  Details
                </label>
                <textarea
                  value={noteForm.body}
                  onChange={(e) => handleNoteChange("body", e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-50 outline-none ring-0 transition focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
                  placeholder="What is this concept about?"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="submit"
                  className="inline-flex flex-1 items-center justify-center rounded-md bg-violet-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!noteForm.title.trim()}
                >
                  {noteForm.id ? "Save changes" : "Add note"}
                </button>
                {selectedNode && (
                  <button
                    type="button"
                    onClick={handleDeleteSelectedNote}
                    className="inline-flex items-center justify-center rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-red-500 hover:bg-red-500/10 hover:text-red-200"
                  >
                    Delete
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <h2 className="mb-3 text-sm font-semibold text-zinc-100">
              Relationships
            </h2>
            <form
              className="space-y-3"
              onSubmit={handleSaveEdge}
              autoComplete="off"
            >
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  From
                </label>
                <select
                  value={edgeForm.source}
                  onChange={(e) => handleEdgeChange("source", e.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-50 outline-none ring-0 transition focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
                >
                  <option value="">Select note…</option>
                  {allNoteOptions.map((note: { id: string; title: string }) => (
                    <option key={note.id} value={note.id}>
                      {note.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  To
                </label>
                <select
                  value={edgeForm.target}
                  onChange={(e) => handleEdgeChange("target", e.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-50 outline-none ring-0 transition focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
                >
                  <option value="">Select note…</option>
                  {allNoteOptions.map((note: { id: string; title: string }) => (
                    <option key={note.id} value={note.id}>
                      {note.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  Relationship label
                </label>
                <input
                  type="text"
                  value={edgeForm.label}
                  onChange={(e) => handleEdgeChange("label", e.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-50 outline-none ring-0 transition focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
                  placeholder="e.g. depends on, related to"
                />
              </div>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-50 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={
                  !edgeForm.source ||
                  !edgeForm.target ||
                  edgeForm.source === edgeForm.target
                }
              >
                {edgeForm.id ? "Save relationship" : "Add relationship"}
              </button>
            </form>

            <div className="mt-4 max-h-40 space-y-1 overflow-y-auto pr-1">
              {edges.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  No relationships yet. Add one above.
                </p>
              ) : (
                edges.map((edge: Edge) => {
                  const source = allNoteOptions.find(
                    (note: { id: string; title: string }) =>
                      note.id === edge.source,
                  );
                  const target = allNoteOptions.find(
                    (note: { id: string; title: string }) =>
                      note.id === edge.target,
                  );
                  return (
                    <div
                      key={edge.id}
                      className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-[11px]"
                    >
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium text-zinc-50">
                            {source?.title ?? edge.source}
                          </span>
                          <span className="text-zinc-500">→</span>
                          <span className="truncate text-zinc-100">
                            {target?.title ?? edge.target}
                          </span>
                        </div>
                        {edge.label && (
                          <p className="truncate text-[10px] text-zinc-400">
                            {edge.label}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        className="ml-2 text-[10px] font-medium text-violet-300 hover:text-violet-200"
                        onClick={() =>
                          setEdgeForm({
                            id: edge.id,
                            source: edge.source,
                            target: edge.target,
                            label: edge.label ?? "",
                          })
                        }
                      >
                        Edit
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
