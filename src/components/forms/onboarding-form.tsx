"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const basicInfoSchema = z.object({
  age: z.number().min(13).max(120),
  gender: z.enum(["male", "female", "other"]),
  height: z.number().min(100).max(250),
  weight: z.number().min(30).max(300),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
})

const preferencesSchema = z.object({
  goals: z.enum(["weight_loss", "maintenance", "weight_gain", "muscle_gain"]),
  dietaryRestrictions: z.array(z.string()),
  dislikedFoods: z.string(),
})

type BasicInfoFormData = z.infer<typeof basicInfoSchema>
type PreferencesFormData = z.infer<typeof preferencesSchema>

interface OnboardingFormProps {
  onComplete: (data: BasicInfoFormData & PreferencesFormData) => void
}

export function OnboardingForm({ onComplete }: OnboardingFormProps) {
  const [step, setStep] = useState(1)
  const [basicInfo, setBasicInfo] = useState<BasicInfoFormData | null>(null)

  const basicForm = useForm<BasicInfoFormData>({
    resolver: zodResolver(basicInfoSchema),
  })

  const preferencesForm = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      dietaryRestrictions: [],
      dislikedFoods: "",
    },
  })

  const onBasicInfoSubmit = (data: BasicInfoFormData) => {
    setBasicInfo(data)
    setStep(2)
  }

  const onPreferencesSubmit = (data: PreferencesFormData) => {
    if (basicInfo) {
      onComplete({
        ...basicInfo,
        ...data,
        dietaryRestrictions: data.dietaryRestrictions.filter(Boolean),
      })
    }
  }

  if (step === 1) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Tell us about yourself</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={basicForm.handleSubmit(onBasicInfoSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                {...basicForm.register("age", { valueAsNumber: true })}
              />
              {basicForm.formState.errors.age && (
                <p className="text-sm text-destructive">{basicForm.formState.errors.age.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                {...basicForm.register("gender")}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              {basicForm.formState.errors.gender && (
                <p className="text-sm text-destructive">{basicForm.formState.errors.gender.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                {...basicForm.register("height", { valueAsNumber: true })}
              />
              {basicForm.formState.errors.height && (
                <p className="text-sm text-destructive">{basicForm.formState.errors.height.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                {...basicForm.register("weight", { valueAsNumber: true })}
              />
              {basicForm.formState.errors.weight && (
                <p className="text-sm text-destructive">{basicForm.formState.errors.weight.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="activityLevel">Activity Level</Label>
              <select
                id="activityLevel"
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                {...basicForm.register("activityLevel")}
              >
                <option value="">Select activity level</option>
                <option value="sedentary">Sedentary</option>
                <option value="light">Light Exercise</option>
                <option value="moderate">Moderate Exercise</option>
                <option value="active">Active</option>
                <option value="very_active">Very Active</option>
              </select>
              {basicForm.formState.errors.activityLevel && (
                <p className="text-sm text-destructive">{basicForm.formState.errors.activityLevel.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full">
              Next
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Your preferences</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={preferencesForm.handleSubmit(onPreferencesSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="goals">Goal</Label>
            <select
              id="goals"
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              {...preferencesForm.register("goals")}
            >
              <option value="">Select your goal</option>
              <option value="weight_loss">Weight Loss</option>
              <option value="maintenance">Maintenance</option>
              <option value="weight_gain">Weight Gain</option>
              <option value="muscle_gain">Muscle Gain</option>
            </select>
            {preferencesForm.formState.errors.goals && (
              <p className="text-sm text-destructive">{preferencesForm.formState.errors.goals.message}</p>
            )}
          </div>

          <div>
            <Label>Dietary Restrictions</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {["vegetarian", "gluten-free"].map((restriction) => (
                <label key={restriction} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    value={restriction}
                    {...preferencesForm.register("dietaryRestrictions")}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm capitalize">{restriction.replace("-", " ")}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="dislikedFoods">Foods you dislike</Label>
            <Input
              id="dislikedFoods"
              placeholder="e.g., mushrooms, seafood, spicy food"
              {...preferencesForm.register("dislikedFoods")}
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
              Back
            </Button>
            <Button type="submit" className="flex-1">
              Complete
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}