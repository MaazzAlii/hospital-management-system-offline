import { ReturnForm } from './form'

export const dynamic = 'force-dynamic'

export default function NewReturnPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Process Return</h1>
      </div>
      
      <ReturnForm />
    </div>
  )
}
