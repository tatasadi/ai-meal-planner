import { NextRequest, NextResponse } from 'next/server'
import { userProfilesDAO } from '@/lib/data'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body
    
    const userProfile = await userProfilesDAO.createUserProfile({
      id: userId,
      email: `${userId}@example.com`,
      age: 30,
      gender: "male",
      height: 175,
      weight: 70,
      activityLevel: "moderate",
      dietaryRestrictions: [],
      allergies: [],
      goals: "maintenance",
      preferences: {
        cuisineTypes: ["italian"],
        dislikedFoods: ["mushrooms"],
        mealComplexity: "simple"
      }
    })
    
    return NextResponse.json(userProfile)
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 })
  }
}