"use client"

import { WorkflowNode } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Trash2, Settings2 } from "lucide-react"

interface PropertiesPanelProps {
  node: WorkflowNode | null
  onClose: () => void
  onUpdateNode: (id: string, data: Partial<WorkflowNode["data"]>) => void
  onDeleteNode: (id: string) => void
}

export function PropertiesPanel({ node, onClose, onUpdateNode, onDeleteNode }: PropertiesPanelProps) {
  if (!node) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <Settings2 className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Select a node to view and edit its properties
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h3 className="font-medium text-foreground">Node Properties</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-auto p-4">
        <div className="space-y-2">
          <Label htmlFor="label">Label</Label>
          <Input
            id="label"
            value={node.data.label}
            onChange={(e) => onUpdateNode(node.id, { label: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={node.data.description || ""}
            onChange={(e) => onUpdateNode(node.id, { description: e.target.value })}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Type</Label>
          <Input value={node.type} disabled className="capitalize" />
        </div>

        {node.type === "agent" && (
          <>
            <div className="space-y-2">
              <Label>Model</Label>
              <Select defaultValue="gpt-4-turbo">
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                  <SelectItem value="azure-openai">Azure OpenAI</SelectItem>
                  <SelectItem value="claude-3">Claude 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Temperature</Label>
              <Input type="number" min="0" max="2" step="0.1" defaultValue="0.7" />
            </div>
          </>
        )}

        {node.type === "condition" && (
          <div className="space-y-2">
            <Label>Condition Expression</Label>
            <Textarea
              placeholder="e.g., priority === 'high'"
              rows={2}
            />
          </div>
        )}

        {node.type === "trigger" && (
          <div className="space-y-2">
            <Label>Trigger Type</Label>
            <Select defaultValue="http">
              <SelectTrigger>
                <SelectValue placeholder="Select trigger type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="http">HTTP Request</SelectItem>
                <SelectItem value="schedule">Schedule</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="border-t border-border p-4">
        <Button
          variant="destructive"
          size="sm"
          className="w-full gap-2"
          onClick={() => onDeleteNode(node.id)}
        >
          <Trash2 className="h-4 w-4" />
          Delete Node
        </Button>
      </div>
    </div>
  )
}
