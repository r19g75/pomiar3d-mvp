export type LaserReading = {
  valueMm: number
  receivedAt: string
  raw?: unknown
}

export interface LaserAdapter {
  id: string
  label: string
  isSupported(): boolean
  connect(): Promise<void>
  disconnect(): Promise<void>
  onReading(callback: (reading: LaserReading) => void): () => void
}

// MVP deliberately contains no vendor-specific protocol.
// Add adapters under this directory only after documenting the BLE GATT protocol
// of a concrete device. The rest of the app must depend on LaserAdapter, never
// directly on Bosch/Leica/vendor APIs.
