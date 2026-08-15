'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle, Loader2, ShieldAlert, CheckSquare, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DeleteResult {
  success: boolean
  error?: string
  isLinked?: boolean
  canOverride?: boolean
  linkedCounts?: Record<string, number>
}

interface DeleteConfirmButtonProps {
  id: string
  title?: string
  description?: string
  itemName?: string
  onDelete: (id: string, force?: boolean) => Promise<DeleteResult>
  redirectUrl?: string
  iconOnly?: boolean
  className?: string
  variant?: 'destructive' | 'ghost' | 'outline'
  size?: 'default' | 'sm' | 'icon'
}

export function DeleteConfirmButton({
  id,
  title = 'Confirm Deletion',
  description,
  itemName = 'this item',
  onDelete,
  redirectUrl,
  iconOnly = false,
  className = '',
  variant = 'ghost',
  size = iconOnly ? 'icon' : 'sm',
}: DeleteConfirmButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [canOverride, setCanOverride] = useState<boolean>(false)
  const [overrideConfirmed, setOverrideConfirmed] = useState<boolean>(false)

  const handleOpen = () => {
    setErrorMessage(null)
    setCanOverride(false)
    setOverrideConfirmed(false)
    setIsOpen(true)
  }

  const handleClose = () => {
    if (isDeleting) return
    setIsOpen(false)
    setErrorMessage(null)
    setCanOverride(false)
    setOverrideConfirmed(false)
  }

  const handleDelete = async (force: boolean = false) => {
    setIsDeleting(true)
    setErrorMessage(null)

    try {
      const res = await onDelete(id, force)
      if (res && res.success) {
        setIsOpen(false)
        if (redirectUrl) {
          router.push(redirectUrl)
        } else {
          router.refresh()
        }
      } else {
        setErrorMessage(res?.error || 'Failed to delete item.')
        if (res?.canOverride) {
          setCanOverride(true)
        } else {
          setCanOverride(false)
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.')
      setCanOverride(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleOpen}
        className={`text-destructive hover:bg-destructive/10 hover:text-destructive ${className}`}
        title={`Delete ${itemName}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {!iconOnly && <span className="ml-1">Delete</span>}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-md rounded-xl border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-3">
              <div
                className={`rounded-full p-2.5 shrink-0 ${
                  canOverride
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                {canOverride ? <ShieldAlert className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  {canOverride ? '⚠️ Admin Delete Override' : title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {description || `Are you sure you want to delete ${itemName}? This action cannot be undone.`}
                </p>
              </div>
            </div>

            {errorMessage && (
              <div
                className={`rounded-lg border p-3 text-xs flex items-start gap-2 ${
                  canOverride
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
                    : 'bg-destructive/10 border-destructive/30 text-destructive'
                }`}
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="leading-snug">{errorMessage}</div>
              </div>
            )}

            {/* Admin Override Confirmation Checkbox */}
            {canOverride && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                <p className="text-[11px] font-semibold text-destructive uppercase tracking-wider">
                  Caution: Permanent Cascade Deletion
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Proceeding will permanently delete this record and cascade delete all associated appointments, OPD visits, and financial invoices.
                </p>
                <label
                  onClick={() => setOverrideConfirmed(!overrideConfirmed)}
                  className="flex items-center gap-2 pt-1 text-xs font-medium text-foreground cursor-pointer select-none"
                >
                  {overrideConfirmed ? (
                    <CheckSquare className="h-4 w-4 text-destructive shrink-0" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span>I understand and confirm force deletion</span>
                </label>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={isDeleting}
              >
                Cancel
              </Button>

              {canOverride ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(true)}
                  disabled={isDeleting || !overrideConfirmed}
                  className="gap-1.5 shadow-sm"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Overriding...
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Confirm Admin Override
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(false)}
                  disabled={isDeleting}
                  className="gap-1.5 shadow-sm"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5" />
                      Confirm Delete
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
