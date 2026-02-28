"use client"

import { cn } from "@/lib/utils"
import { categories } from "@/lib/mock-data"

interface SidebarProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
}

export function Sidebar({ selectedCategory, onCategoryChange }: SidebarProps) {
  return (
    <aside className="w-56 shrink-0 border-r border-border">
      <nav className="sticky top-14 p-4">
        <ul className="space-y-1">
          {categories.map((category) => (
            <li key={category}>
              <button
                onClick={() => onCategoryChange(category)}
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                  selectedCategory === category
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                {category}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
