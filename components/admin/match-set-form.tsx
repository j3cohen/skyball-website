"use client"

import type React from "react"

import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Select } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"

interface MatchSetFormProps {
  matchSet?: {
    match_id: string
    set_number: number
    p1_score: number
    p2_score: number
  }
  matches: any[]
  onSuccess?: (matchSet: any) => void
  onCancel?: () => void
}

export default function MatchSetForm({ matchSet, matches, onSuccess, onCancel }: MatchSetFormProps) {
  const isEditing = !!matchSet
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    match_id: matchSet?.match_id || '',
    set_number: matchSet?.set_number || 1,
    p1_score: matchSet?.p1_score || 0,
    p2_score: matchSet?.p2_score || 0,
  })
  
  const supabase = createClientComponentClient()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'set_number' || name === 'p1_score' || name === 'p2_score' 
        ? Number.parseInt(value, 10) 
        : value
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      let result
      
      if (isEditing) {
        result = await supabase
          .from('match_sets')
          .update({
            p1_score: formData.p1_score,
            p2_score: formData.p2_score
          })
          .eq('match_id', matchSet.match_id)
          .eq('set_number', matchSet.set_number)
          .select()
      } else {
        result = await supabase
          .from('match_sets')
          .insert(formData)
          .select()
      }

      if (result.error) throw result.error
      
      toast({
        title: isEditing ? 'Match set updated' : 'Match set created',
        description: isEditing 
          ? 'The match set has been successfully updated.' 
          : 'The match set has been successfully created.',
      })
      
      if (onSuccess && result.data?.[0]) {
        onSuccess(result.data[0])
      }
      
      if (!isEditing) {
        // Reset form if creating new match set
        setFormData({
          match_id: '',
          set_number: 1,
          p1_score: 0,
          p2_score: 0,
        })
      }
    } catch (error) {
      console.error('Error saving match set:', error)
      toast({
        title: 'Error',
        description: `Failed to ${isEditing ? 'update' : 'create'} match set. Please try again.`,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="match_id" className="block text-sm font-medium text-gray-700">
            Match
          </label>
          <Select
            value={formData.match_id}
            onValueChange={(value) => handleSelectChange('match_id', value)}\
            disabled={isEditing}
