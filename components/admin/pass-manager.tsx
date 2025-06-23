"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabaseClient"
import { Plus, Edit, Trash2 } from "lucide-react"
import type { Database } from "@/lib/database.types"

type PassType = Database["public"]["Tables"]["pass_types"]["Row"]
type Pass = Database["public"]["Tables"]["passes"]["Row"] & {
  pass_types: PassType
  profiles: { full_name: string } | null
}

export default function PassManager() {
  const [passTypes, setPassTypes] = useState<PassType[]>([])
  const [passes, setPasses] = useState<Pass[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPassType, setEditingPassType] = useState<PassType | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    passes_quantity: "",
    points_value: "",
    price: "",
    stripe_price_id: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [passTypesResult, passesResult] = await Promise.all([
        supabase.from("pass_types").select("*").order("points_value"),
        supabase
          .from("passes")
          .select(`
          *,
          pass_types (*),
          profiles (full_name)
        `)
          .order("purchased_at", { ascending: false }),
      ])

      if (passTypesResult.error) throw passTypesResult.error
      if (passesResult.error) throw passesResult.error

      setPassTypes(passTypesResult.data || [])
      setPasses(passesResult.data || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const passTypeData = {
        ...formData,
        passes_quantity: Number.parseInt(formData.passes_quantity),
        points_value: Number.parseInt(formData.points_value),
      }

      if (editingPassType) {
        const { error } = await supabase.from("pass_types").update(passTypeData).eq("id", editingPassType.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from("pass_types").insert([passTypeData])

        if (error) throw error
      }

      await fetchData()
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error saving pass type:", error)
    }
  }

  const handleEdit = (passType: PassType) => {
    setEditingPassType(passType)
    setFormData({
      name: passType.name,
      passes_quantity: passType.passes_quantity.toString(),
      points_value: passType.points_value.toString(),
      price: passType.price,
      stripe_price_id: passType.stripe_price_id,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this pass type?")) return

    try {
      const { error } = await supabase.from("pass_types").delete().eq("id", id)

      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error("Error deleting pass type:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      passes_quantity: "",
      points_value: "",
      price: "",
      stripe_price_id: "",
    })
    setEditingPassType(null)
  }

  if (isLoading) {
    return <div>Loading passes...</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pass Types</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Pass Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingPassType ? "Edit Pass Type" : "Add New Pass Type"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="passes_quantity">Passes Quantity</Label>
                    <Input
                      id="passes_quantity"
                      type="number"
                      value={formData.passes_quantity}
                      onChange={(e) => setFormData({ ...formData, passes_quantity: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="points_value">Points Value</Label>
                    <Input
                      id="points_value"
                      type="number"
                      value={formData.points_value}
                      onChange={(e) => setFormData({ ...formData, points_value: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="$50"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="stripe_price_id">Stripe Price ID</Label>
                  <Input
                    id="stripe_price_id"
                    value={formData.stripe_price_id}
                    onChange={(e) => setFormData({ ...formData, stripe_price_id: e.target.value })}
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingPassType ? "Update" : "Create"} Pass Type</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {passTypes.map((passType) => (
              <div key={passType.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">{passType.name}</h3>
                  <p className="text-sm text-gray-600">
                    {passType.passes_quantity} passes • {passType.points_value} points • {passType.price}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(passType)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(passType.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Purchased Passes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {passes.map((pass) => (
              <div key={pass.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">{pass.pass_types.name}</h3>
                  <p className="text-sm text-gray-600">Owner: {pass.profiles?.full_name || "Unknown"}</p>
                  <p className="text-sm text-gray-500">
                    {pass.quantity_remaining}/{pass.quantity_total} remaining • Purchased:{" "}
                    {new Date(pass.purchased_at || "").toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
