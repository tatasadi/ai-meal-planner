import { NextRequest, NextResponse } from 'next/server'
import { mealPlansDAO, userProfilesDAO } from '@/lib/data'

export async function GET(request: NextRequest) {
  try {
    // Get a few recent meal plans to see what user IDs exist
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    
    if (userId) {
      const userProfile = await userProfilesDAO.getUserProfile(userId)
      const mealPlans = await mealPlansDAO.getUserMealPlans(userId, 5)
      
      return NextResponse.json({
        userProfile,
        mealPlansCount: mealPlans.length,
        mealPlans: mealPlans.map(mp => ({
          id: mp.id,
          title: mp.title,
          createdAt: mp.createdAt
        }))
      })
    }

    return NextResponse.json({
      message: "Add ?userId=<id> to check a specific user"
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 })
  }
}