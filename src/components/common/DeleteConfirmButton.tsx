'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DeleteConfirmButtonProps {
  id: string
  title?: string
  description?: string
  itemName?: string
  onDelete: (id: string) => Promise<{ success: boolean; error?: string }>
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

  const handleOpen = () => {
    setErrorMessage(null)
    setIsOpen(true)
  }

  const handleClose = () => {
    if (isDeleting) return
    setIsOpen(false)
    setErrorMessage(null)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setErrorMessage(null)

    try {
      const res = await onDelete(id)
      if (res && res.success) {
        setIsOpen(false)
        if (redirectUrl) {
          router.push(redirectUrl)
        } else {
          router.refresh()
        }
      } else {
        setErrorMessage(res?.error || 'Failed to delete item.')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.')
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
              <div className="rounded-full bg-destructive/10 p-2.5 text-destructive shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {description || `Are you sure you want to delete ${itemName}? This action cannot be undone.`}
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="leading-snug">{errorMessage}</div>
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
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
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
            </div>
          </div>
        </div>
      )}
    </>
  )
}
