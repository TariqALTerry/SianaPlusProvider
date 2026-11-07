import { Navigate } from 'react-router'

/** `/inventory` opens the stock of the switcher's branch. */
export function InventoryIndex() {
  return <Navigate replace to="/inventory/stock" />
}
