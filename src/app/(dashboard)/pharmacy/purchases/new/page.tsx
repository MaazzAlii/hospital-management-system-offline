import { getSuppliers } from '@/app/actions/supplier'
import { getMedicines } from '@/app/actions/medicine'
import { PurchaseForm } from './form'

export const dynamic = 'force-dynamic'

export default async function NewPurchasePage() {
  const [suppliers, medicines] = await Promise.all([
    getSuppliers(),
    getMedicines()
  ])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">New Purchase</h1>
      </div>
      
      <PurchaseForm 
        suppliers={suppliers || []} 
        medicines={medicines || []} 
      />
    </div>
  )
}
