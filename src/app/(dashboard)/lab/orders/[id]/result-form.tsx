'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { collectSample, saveResult, verifyResult } from '@/app/actions/lab-result'
import { FlaskConical, CheckCircle } from 'lucide-react'

export function ResultFormClient({ order, canVerify = false }: { order: any, canVerify?: boolean }) {
  const [isCollecting, setIsCollecting] = useState(false)
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({})
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  
  // Find primary sample if any exists
  const activeSample = order.samples && order.samples.length > 0 ? order.samples[0] : null

  const handleCollectSample = async () => {
    setIsCollecting(true)
    try {
      // Just take the first test's sampleType as a default, or 'General'
      const sampleType = order.items.length > 0 && order.items[0].LabTest?.sampleType 
        ? order.items[0].LabTest.sampleType 
        : 'General'
        
      await collectSample(order.id, sampleType)
    } catch (err) {
      console.error(err)
      alert("Failed to collect sample")
    } finally {
      setIsCollecting(false)
    }
  }

  const handleSaveResult = async (item: any) => {
    const value = formValues[item.id]
    if (!value) return
    
    setLoadingItems(prev => ({ ...prev, [item.id]: true }))
    try {
      await saveResult({
        labOrderItemId: item.id,
        sampleId: activeSample.id,
        resultValue: value,
        testId: item.testId,
        patientGender: order.Patient?.gender,
        patientDob: order.Patient?.dob,
        labOrderId: order.id
      })
    } catch (err) {
      console.error(err)
      alert("Failed to save result")
    } finally {
      setLoadingItems(prev => ({ ...prev, [item.id]: false }))
    }
  }

  const handleVerify = async (resultId: string, itemId: string) => {
    setLoadingItems(prev => ({ ...prev, [itemId + '_verify']: true }))
    try {
      await verifyResult(resultId, order.id)
    } catch (err) {
      console.error(err)
      alert("Failed to verify result")
    } finally {
      setLoadingItems(prev => ({ ...prev, [itemId + '_verify']: false }))
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4">
        <CardTitle className="text-lg">Test Results</CardTitle>
        {!activeSample ? (
          <Button onClick={handleCollectSample} disabled={isCollecting} size="sm" className="gap-2">
            <FlaskConical className="h-4 w-4" />
            Collect Sample
          </Button>
        ) : (
          <div className="text-sm font-medium px-3 py-1 bg-muted rounded-md flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
            Sample: {activeSample.sampleNo} 
            <span className="text-xs text-muted-foreground font-normal ml-2">
              ({new Date(activeSample.collectedAt).toLocaleTimeString()})
            </span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {!activeSample && (
          <div className="text-center p-8 border rounded-md bg-muted/20 text-muted-foreground">
            Please collect a sample before entering results.
          </div>
        )}
        
        {activeSample && order.items.map((item: any) => {
          const test = item.LabTest
          const existingResult = order.results.find((r: any) => r.labOrderItemId === item.id)
          const isVerified = existingResult?.status === 'verified'
          
          return (
            <div key={item.id} className="p-4 border rounded-md bg-card shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-base">{test?.name}</h4>
                  <p className="text-xs text-muted-foreground">Code: {test?.code} | Sample: {test?.sampleType}</p>
                </div>
                {existingResult && (
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    existingResult.flag === 'High' ? 'bg-destructive/15 text-destructive' :
                    existingResult.flag === 'Low' ? 'bg-orange-100 text-orange-700' :
                    'bg-success/15 text-success'
                  }`}>
                    {existingResult.flag}
                  </span>
                )}
              </div>
              
              <div className="flex items-end gap-3 pt-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Result Value</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Enter value"
                      defaultValue={existingResult?.resultValue || ''}
                      onChange={e => setFormValues(prev => ({ ...prev, [item.id]: e.target.value }))}
                      disabled={isVerified}
                    />
                  </div>
                </div>
                
                {!isVerified && (
                  <Button 
                    onClick={() => handleSaveResult(item)}
                    disabled={loadingItems[item.id] || (!formValues[item.id] && !existingResult)}
                  >
                    {loadingItems[item.id] ? 'Saving...' : 'Save'}
                  </Button>
                )}
                
                {canVerify && existingResult && !isVerified && (
                  <Button 
                    variant="outline"
                    className="gap-1 border-success text-success hover:bg-success/10 hover:text-success"
                    onClick={() => handleVerify(existingResult.id, item.id)}
                    disabled={loadingItems[item.id + '_verify']}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Verify
                  </Button>
                )}

                {isVerified && (
                  <div className="px-3 py-2 bg-success/10 text-success rounded-md text-sm font-medium flex items-center gap-2 h-10">
                    <CheckCircle className="h-4 w-4" />
                    Verified
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
