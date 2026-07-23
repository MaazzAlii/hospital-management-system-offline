import { getPatients } from '@/app/actions/patient'
import { getMedicines } from '@/app/actions/medicine'
import { SaleForm } from './form'

export const dynamic = 'force-dynamic'

export default async function NewSalePage() {
  const [patients, medicines] = await Promise.all([
    getPatients(),
    getMedicines()
  ])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">New Sale</h1>
      </div>
      
      <SaleForm 
        patients={patients || []} 
        medicines={medicines || []} 
      />
    </div>
  )
}
