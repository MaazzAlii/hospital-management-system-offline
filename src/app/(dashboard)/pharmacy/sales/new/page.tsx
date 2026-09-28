import { getPatients } from '@/app/actions/patient'
import { getMedicines } from '@/app/actions/medicine'
import { getClinicSettings } from '@/app/actions/billing'
import { SaleForm } from './form'

export const dynamic = 'force-dynamic'

export default async function NewSalePage() {
  const [patients, medicinesRes, settings] = await Promise.all([
    getPatients(),
    getMedicines(undefined, 1, 1000),
    getClinicSettings(),
  ])

  const medicines = Array.isArray(medicinesRes) ? medicinesRes : (medicinesRes?.medicines || [])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Pharmacy Invoice / Sale</h1>
          <p className="text-sm text-muted-foreground">
            Create a wholesale distributor invoice or retail counter sale with real-time batch stock & expiry tracking.
          </p>
        </div>
      </div>
      
      <SaleForm 
        patients={patients || []} 
        medicines={medicines} 
        settings={settings || { clinicName: 'Life Care Pharmacy' }}
      />
    </div>
  )
}
