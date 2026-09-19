import { useRef, useState } from 'react'

export type SketchNode = {
  id: string
  label: string
  x: number
  y: number
  kind: 'target' | 'instrument'
  status?: 'none' | 'partial' | 'done' | 'warn'
}

export type SketchEdge = { from: string; to: string }

const STATUS_CLASS: Record<NonNullable<SketchNode['status']>, string> = {
  none: 'sketch-node-none',
  partial: 'sketch-node-partial',
  done: 'sketch-node-done',
  warn: 'sketch-node-warn'
}

/**
 * Odręczny szkic roboczy: domyślny tryb to zaznacz/przesuń. Dodawanie punktu
 * dzieje się tylko przez jednorazowy tryb `addMode` (patrz `+ Punkt` w StationsPanel) -
 * zwykły tap na pustym polu w trybie select nic nie tworzy.
 */
export function SketchCanvas({ nodes, edges, selectedId, addMode, onAddNode, onSelectNode, onMoveNode }: {
  nodes: SketchNode[]
  edges: SketchEdge[]
  selectedId?: string
  addMode: boolean
  onAddNode: (x: number, y: number) => void
  onSelectNode: (id: string) => void
  onMoveNode: (id: string, x: number, y: number) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragId = useRef<string | null>(null)
  const [, forceRender] = useState(0)

  const toSvgPoint = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = clientX; pt.y = clientY
    const p = pt.matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!addMode) return
    const p = toSvgPoint(e.clientX, e.clientY)
    onAddNode(Math.round(p.x), Math.round(p.y))
  }

  const startDrag = (id: string) => (e: React.PointerEvent) => {
    if (addMode) return
    e.stopPropagation()
    onSelectNode(id)
    dragId.current = id
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragId.current) return
    const p = toSvgPoint(e.clientX, e.clientY)
    onMoveNode(dragId.current, Math.round(p.x), Math.round(p.y))
    forceRender((n) => n + 1)
  }

  const endDrag = () => { dragId.current = null }

  const byId = new Map(nodes.map((n) => [n.id, n]))

  return (
    <div className="drawing-card">
      <svg
        ref={svgRef}
        className={`drawing sketch-canvas ${addMode ? 'sketch-add-mode' : ''}`}
        viewBox="0 0 2000 2000"
        role="img"
        aria-label="Szkic orientacyjny"
        onClick={handleCanvasClick}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        {edges.map((edge, i) => {
          const a = byId.get(edge.from); const b = byId.get(edge.to)
          if (!a || !b) return null
          return <line key={i} className="sketch-edge" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        })}
        {nodes.map((n) => (
          <g key={n.id} className="sketch-node-group" onPointerDown={startDrag(n.id)}>
            <circle className="sketch-node-hit" cx={n.x} cy={n.y} r="70" />
            {n.kind === 'target' ? (
              <circle className={`sketch-node ${STATUS_CLASS[n.status ?? 'none']} ${n.id === selectedId ? 'selected' : ''}`} cx={n.x} cy={n.y} r="26" />
            ) : (
              <rect className={`sketch-node sketch-instrument ${n.id === selectedId ? 'selected' : ''}`} x={n.x - 24} y={n.y - 24} width="48" height="48" />
            )}
            <text x={n.x + 36} y={n.y - 36} className="svg-label sketch-label">{n.label}</text>
          </g>
        ))}
      </svg>
      {addMode && <div className="sketch-hint">Tapnij w szkicu, aby dodać punkt — potem wraca tryb zaznaczania.</div>}
    </div>
  )
}
