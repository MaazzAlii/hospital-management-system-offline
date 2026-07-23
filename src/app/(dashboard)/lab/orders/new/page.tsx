import { LabOrderForm } from './form'
import { getLabTests } from '@/app/actions/lab-test'
import { getPatients } from '@/app/actions/patient'

export const dynamic = 'force-dynamic'

export default async function NewLabOrderPage() {
  const tests = await getLabTests()
  const patients = await getPatients()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">New Lab Order</h1>
      </div>
      
      <LabOrderForm tests={tests} patients={patients} />
    </div>
  )
}
