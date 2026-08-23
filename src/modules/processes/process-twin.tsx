"use client";

import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Bot,
  CheckCircle2,
  Cog,
  GitFork,
  MonitorCog,
  User,
} from "lucide-react";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Surface } from "@/components/ui/surface";
import { heroProcess } from "@/modules/demo/aster-data";

type ProcessNodeData = { label: string; minutes: number; nodeType: string };

const nodeIcons = {
  human: User,
  agent: Bot,
  automation: Cog,
  system: MonitorCog,
  decision: GitFork,
  control: CheckCircle2,
} as const;
const nodeColours = {
  human: "#8a641b",
  agent: "#3157d5",
  automation: "#25806a",
  system: "#62655d",
  decision: "#a43d36",
  control: "#733fc0",
} as const;

function ProcessNode({ data }: NodeProps<Node<ProcessNodeData>>) {
  const Icon = nodeIcons[data.nodeType as keyof typeof nodeIcons] ?? Cog;
  const colour =
    nodeColours[data.nodeType as keyof typeof nodeColours] ?? "#62655d";
  return (
    <div className="w-[184px] rounded-md border border-[#d9dad4] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(30,32,28,0.06)]">
      <Handle
        className="!size-2 !border-white"
        position={Position.Left}
        style={{ background: colour }}
        type="target"
      />
      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 grid size-6 shrink-0 place-items-center rounded"
          style={{ background: `${colour}15`, color: colour }}
        >
          <Icon className="size-3.5" />
        </span>
        <div>
          <p className="text-[11px] font-semibold leading-4">{data.label}</p>
          <p className="mt-1 text-[10px] text-[#7a7d74]">
            {data.minutes} min · {data.nodeType}
          </p>
        </div>
      </div>
      <Handle
        className="!size-2 !border-white"
        position={Position.Right}
        style={{ background: colour }}
        type="source"
      />
    </div>
  );
}

function toGraph(
  items: typeof heroProcess.current,
  offset = 0,
): { nodes: Node<ProcessNodeData>[]; edges: Edge[] } {
  const nodes = items.map((item, index) => ({
    id: `${offset}-${item.id}`,
    type: "process",
    position: { x: index * 225, y: 58 },
    data: { label: item.label, minutes: item.minutes, nodeType: item.type },
  }));
  const edges = nodes.slice(0, -1).map((node, index) => ({
    id: `e-${node.id}`,
    source: node.id,
    target: nodes[index + 1]!.id,
    animated: offset === 1,
    style: { stroke: offset === 1 ? "#3157d5" : "#a6a9a0", strokeWidth: 1.5 },
  }));
  return { nodes, edges };
}

export function ProcessTwin() {
  const current = useMemo(() => toGraph(heroProcess.current), []);
  const future = useMemo(() => toGraph(heroProcess.future, 1), []);
  return (
    <div className="space-y-5">
      <div className="grid overflow-hidden rounded-lg border border-[#dedfd9] bg-white sm:grid-cols-4">
        {[
          ["Cycle time", "490 min", "31 min"],
          ["Human effort", "470 min", "15 min"],
          ["Handoffs", "7", "2"],
          ["Source traceability", "Manual", "Automatic"],
        ].map(([label, before, after], index) => (
          <div
            className={`p-5 ${index ? "border-t border-[#e5e6e0] sm:border-l sm:border-t-0" : ""}`}
            key={label}
          >
            <p className="text-xs text-[#777a71]">{label}</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-lg font-semibold text-[#9b4a43]">
                {before}
              </span>
              <span className="text-xs text-[#9a9d94]">→</span>
              <span className="text-lg font-semibold text-[#21806a]">
                {after}
              </span>
            </div>
          </div>
        ))}
      </div>
      <GraphPanel
        label="Current state"
        badge="Manual · 490 min"
        graph={current}
      />
      <GraphPanel
        label="Future state"
        badge="Controlled agentic · 31 min"
        graph={future}
        future
      />
    </div>
  );
}

function GraphPanel({
  label,
  badge,
  graph,
  future = false,
}: {
  label: string;
  badge: string;
  graph: { nodes: Node<ProcessNodeData>[]; edges: Edge[] };
  future?: boolean;
}) {
  return (
    <Surface className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#e4e5df] px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold">{label}</h2>
          <p className="mt-0.5 text-[11px] text-[#777a71]">
            {future
              ? "Human review remains on the critical control path."
              : "Observed workflow reconstructed from evidence."}
          </p>
        </div>
        <Badge tone={future ? "value" : "condition"}>{badge}</Badge>
      </div>
      <div className="h-[220px] bg-[#fbfbf8]">
        <ReactFlow
          edges={graph.edges}
          fitView
          fitViewOptions={{ padding: 0.08 }}
          nodes={graph.nodes}
          nodeTypes={{ process: ProcessNode }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
        >
          <Background color="#d9dad4" gap={18} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </Surface>
  );
}
