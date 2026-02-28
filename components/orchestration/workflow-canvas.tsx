"use client"

import { useCallback, useRef, useState } from "react"
import { WorkflowNode, WorkflowEdge } from "@/lib/types"
import { WorkflowNodeCard } from "./workflow-node"
import { cn } from "@/lib/utils"

interface WorkflowCanvasProps {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  selectedNode: string | null
  onSelectNode: (id: string | null) => void
  onUpdateNode: (id: string, position: { x: number; y: number }) => void
  onAddNode: (type: WorkflowNode["type"], position: { x: number; y: number }) => void
}

export function WorkflowCanvas({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
  onUpdateNode,
  onAddNode,
}: WorkflowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const canvasRect = canvasRef.current?.getBoundingClientRect()
      if (!canvasRect) return

      const x = e.clientX - canvasRect.left
      const y = e.clientY - canvasRect.top

      // Check if we're dropping from palette or moving existing node
      const nodeType = e.dataTransfer.getData("nodeType") as WorkflowNode["type"]
      if (nodeType) {
        onAddNode(nodeType, { x, y })
      } else if (draggedNodeId) {
        onUpdateNode(draggedNodeId, { x, y })
        setDraggedNodeId(null)
      }
    },
    [draggedNodeId, onAddNode, onUpdateNode]
  )

  const handleNodeDragStart = useCallback((nodeId: string) => {
    return (e: React.DragEvent) => {
      setDraggedNodeId(nodeId)
      e.dataTransfer.setData("text/plain", nodeId)
    }
  }, [])

  // Calculate SVG path for edges
  const getEdgePath = (source: WorkflowNode, target: WorkflowNode) => {
    const sourceX = source.position.x + 160 // node width
    const sourceY = source.position.y + 30 // center of node
    const targetX = target.position.x
    const targetY = target.position.y + 30

    const midX = (sourceX + targetX) / 2

    return `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`
  }

  return (
    <div
      ref={canvasRef}
      className={cn(
        "relative h-full w-full overflow-auto bg-background",
        "bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)]",
        "bg-[size:24px_24px]"
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => onSelectNode(null)}
    >
      {/* Edges */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              className="fill-muted-foreground"
            />
          </marker>
        </defs>
        {edges.map((edge) => {
          const sourceNode = nodes.find((n) => n.id === edge.source)
          const targetNode = nodes.find((n) => n.id === edge.target)
          if (!sourceNode || !targetNode) return null

          return (
            <g key={edge.id}>
              <path
                d={getEdgePath(sourceNode, targetNode)}
                fill="none"
                className="stroke-muted-foreground"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
              {edge.label && (
                <text
                  x={(sourceNode.position.x + 160 + targetNode.position.x) / 2}
                  y={(sourceNode.position.y + targetNode.position.y) / 2 + 25}
                  className="fill-muted-foreground text-xs"
                  textAnchor="middle"
                >
                  {edge.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Nodes */}
      {nodes.map((node) => (
        <WorkflowNodeCard
          key={node.id}
          node={node}
          isSelected={selectedNode === node.id}
          onSelect={() => onSelectNode(node.id)}
          onDragStart={handleNodeDragStart(node.id)}
        />
      ))}

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">Drag components here to build your workflow</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start with a Trigger, add Agents and Tools, connect with Conditions
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
