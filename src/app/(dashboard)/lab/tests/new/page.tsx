import { LabTestForm } from './form'
import { getLabCategories } from '@/app/actions/lab-test'

export const dynamic = 'force-dynamic'

export default async function NewLabTestPage() {
  const categories = await getLabCategories()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Add Lab Test</h1>
      </div>
      
      <LabTestForm initialCategories={categories} />
    </div>
  )
}
