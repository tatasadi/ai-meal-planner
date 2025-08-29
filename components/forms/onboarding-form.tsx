"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Combobox, ComboboxOption } from "@/components/ui/combobox"
import { Checkbox } from "@/components/ui/checkbox"
import { useMealPlanStore } from "@/store"
import { useMealGeneration } from "@/hooks/use-meal-generation"
import type { UserProfile } from "@/lib/types"

const basicInfoSchema = z.object({
  age: z.number({
    required_error: "Age is required",
    invalid_type_error: "Please enter a valid age",
  }).min(13, "Age must be at least 13").max(120, "Age must be less than 120"),
  gender: z.enum(["male", "female", "other"], {
    required_error: "Please select a gender",
  }),
  height: z.number({
    required_error: "Height is required",
    invalid_type_error: "Please enter a valid height",
  }).min(100, "Height must be at least 100cm").max(250, "Height must be less than 250cm"),
  weight: z.number({
    required_error: "Weight is required", 
    invalid_type_error: "Please enter a valid weight",
  }).min(30, "Weight must be at least 30kg").max(300, "Weight must be less than 300kg"),
  activityLevel: z.enum([
    "sedentary",
    "light",
    "moderate",
    "active",
    "very_active",
  ], {
    required_error: "Please select an activity level",
  }),
})

const preferencesSchema = z.object({
  goals: z.enum(["weight_loss", "maintenance", "weight_gain", "muscle_gain"]),
  dietaryRestrictions: z.array(z.string()),
  dislikedFoods: z.string(),
})

type BasicInfoFormData = z.infer<typeof basicInfoSchema>
type PreferencesFormData = z.infer<typeof preferencesSchema>

interface OnboardingFormProps {
  onComplete?: () => void
}

const genderOptions: ComboboxOption[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
]

const activityLevelOptions: ComboboxOption[] = [
  { value: "sedentary", label: "Sedentary" },
  { value: "light", label: "Light Exercise" },
  { value: "moderate", label: "Moderate Exercise" },
  { value: "active", label: "Active" },
  { value: "very_active", label: "Very Active" },
]

const goalsOptions: ComboboxOption[] = [
  { value: "weight_loss", label: "Weight Loss" },
  { value: "maintenance", label: "Maintenance" },
  { value: "weight_gain", label: "Weight Gain" },
  { value: "muscle_gain", label: "Muscle Gain" },
]

export function OnboardingForm({ onComplete }: OnboardingFormProps) {
  const [step, setStep] = useState(1)
  const [basicInfo, setBasicInfo] = useState<BasicInfoFormData | null>(null)
  const { setUserProfile } = useMealPlanStore()
  const { generateMealPlan, isGeneratingMealPlan } = useMealGeneration()
  const ageInputRef = useRef<HTMLInputElement>(null)
  const goalsInputRef = useRef<HTMLButtonElement>(null)

  // Focus age input when component mounts or step changes
  useEffect(() => {
    if (step === 1) {
      // Find the age input by ID as a fallback
      const ageInput = document.getElementById('age') as HTMLInputElement
      if (ageInput) {
        setTimeout(() => {
          ageInput.focus()
        }, 100)
      }
    }
  }, [step])

  // Focus on initial mount
  useEffect(() => {
    const ageInput = document.getElementById('age') as HTMLInputElement
    if (ageInput) {
      setTimeout(() => {
        ageInput.focus()
      }, 100)
    }
  }, [])

  const basicForm = useForm<BasicInfoFormData>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      age: undefined,
      gender: undefined,
      height: undefined,
      weight: undefined,
      activityLevel: undefined,
    },
    mode: 'onSubmit'
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

  // Focus goals input when moving to step 2
  useEffect(() => {
    if (step === 2 && goalsInputRef.current) {
      setTimeout(() => {
        goalsInputRef.current?.focus()
      }, 100)
    }
  }, [step])


  const onPreferencesSubmit = async (data: PreferencesFormData) => {
    if (basicInfo) {
      const userProfile: UserProfile = {
        id: `user-${Date.now()}`,
        email: "temp@example.com", // TODO: Get from auth
        age: basicInfo.age,
        gender: basicInfo.gender,
        height: basicInfo.height,
        weight: basicInfo.weight,
        activityLevel: basicInfo.activityLevel,
        goals: data.goals,
        dietaryRestrictions: data.dietaryRestrictions.filter(Boolean),
        allergies: [], // TODO: Add allergies field to form
        preferences: {
          cuisineTypes: [], // TODO: Add cuisine preferences
          dislikedFoods: data.dislikedFoods
            ? data.dislikedFoods.split(",").map((s) => s.trim())
            : [],
          mealComplexity: "moderate", // TODO: Add complexity field
        },
      }

      setUserProfile(userProfile)
      await generateMealPlan(userProfile)
      onComplete?.()
    }
  }

  if (step === 1) {
    return (
      <Card className="w-full max-w-md mx-auto glass-effect border-0 shadow-xl">
        <CardHeader>
          <CardTitle>Tell us about yourself</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={basicForm.handleSubmit(onBasicInfoSubmit)}
            className="space-y-4"
          >
            <div className="form-group">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                {...basicForm.register("age", {
                  valueAsNumber: true,
                })}
              />
              {basicForm.formState.errors.age && (
                <p className="text-sm text-destructive">
                  {basicForm.formState.errors.age.message}
                </p>
              )}
            </div>

            <div className="form-group">
              <Label htmlFor="gender">Gender</Label>
              <Controller
                name="gender"
                control={basicForm.control}
                render={({ field }) => (
                  <Combobox
                    options={genderOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select gender"
                  />
                )}
              />
              {basicForm.formState.errors.gender && (
                <p className="text-sm text-destructive">
                  {basicForm.formState.errors.gender.message}
                </p>
              )}
            </div>

            <div className="form-group">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                {...basicForm.register("height", { valueAsNumber: true })}
              />
              {basicForm.formState.errors.height && (
                <p className="text-sm text-destructive">
                  {basicForm.formState.errors.height.message}
                </p>
              )}
            </div>

            <div className="form-group">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                {...basicForm.register("weight", { valueAsNumber: true })}
              />
              {basicForm.formState.errors.weight && (
                <p className="text-sm text-destructive">
                  {basicForm.formState.errors.weight.message}
                </p>
              )}
            </div>

            <div className="form-group">
              <Label htmlFor="activityLevel">Activity Level</Label>
              <Controller
                name="activityLevel"
                control={basicForm.control}
                render={({ field }) => (
                  <Combobox
                    options={activityLevelOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select activity level"
                  />
                )}
              />
              {basicForm.formState.errors.activityLevel && (
                <p className="text-sm text-destructive">
                  {basicForm.formState.errors.activityLevel.message}
                </p>
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
        <form
          onSubmit={preferencesForm.handleSubmit(onPreferencesSubmit)}
          className="space-y-4"
        >
          <div className="form-group">
            <Label htmlFor="goals">Goal</Label>
            <Controller
              name="goals"
              control={preferencesForm.control}
              render={({ field }) => (
                <Combobox
                  ref={goalsInputRef}
                  options={goalsOptions}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Select your goal"
                />
              )}
            />
            {preferencesForm.formState.errors.goals && (
              <p className="text-sm text-destructive">
                {preferencesForm.formState.errors.goals.message}
              </p>
            )}
          </div>

          <div className="form-group">
            <Label>Dietary Restrictions</Label>
            <div className="flex flex-wrap gap-4 mt-2">
              {["vegetarian", "gluten-free"].map((restriction) => (
                <Controller
                  key={restriction}
                  name="dietaryRestrictions"
                  control={preferencesForm.control}
                  render={({ field }) => (
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id={restriction}
                        checked={field.value?.includes(restriction)}
                        onCheckedChange={(checked) => {
                          const currentValue = field.value || []
                          if (checked) {
                            field.onChange([...currentValue, restriction])
                          } else {
                            field.onChange(
                              currentValue.filter(
                                (value: string) => value !== restriction
                              )
                            )
                          }
                        }}
                        className="mt-0.5"
                      />
                      <Label
                        htmlFor={restriction}
                        className="text-sm capitalize cursor-pointer leading-5 mb-0"
                      >
                        {restriction.replace("-", " ")}
                      </Label>
                    </div>
                  )}
                />
              ))}
            </div>
          </div>

          <div className="form-group">
            <Label htmlFor="dislikedFoods">Foods you dislike</Label>
            <Input
              id="dislikedFoods"
              placeholder="e.g., mushrooms, seafood, spicy food"
              {...preferencesForm.register("dislikedFoods")}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isGeneratingMealPlan}
            >
              {isGeneratingMealPlan ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Generating Plan...
                </>
              ) : (
                "Complete"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
