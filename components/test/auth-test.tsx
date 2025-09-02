'use client'

import { useAuth } from '@/hooks/use-auth'
import { useAuthFetch } from '@/hooks/use-auth-fetch'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function AuthTest() {
  const { isAuthenticated, user } = useAuth()
  const { authFetch } = useAuthFetch()
  const [testResults, setTestResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setLoading(true)
    const startTime = Date.now()
    
    try {
      const result = await testFn()
      const duration = Date.now() - startTime
      
      setTestResults(prev => [...prev, {
        name: testName,
        status: 'success',
        duration: `${duration}ms`,
        result: result,
        timestamp: new Date().toLocaleTimeString()
      }])
    } catch (error: any) {
      const duration = Date.now() - startTime
      
      setTestResults(prev => [...prev, {
        name: testName,
        status: 'error',
        duration: `${duration}ms`,
        error: error.message,
        timestamp: new Date().toLocaleTimeString()
      }])
    }
    
    setLoading(false)
  }

  const testCreateProfile = () => runTest('Create/Update User Profile', async () => {
    const response = await authFetch('/api/user/profile', {
      method: 'POST',
      body: JSON.stringify({
        age: 30,
        gender: 'other',
        height: 175,
        weight: 70,
        activityLevel: 'moderate',
        dietaryRestrictions: ['vegetarian'],
        allergies: [],
        goals: 'maintenance',
        preferences: {
          cuisineTypes: ['italian', 'asian'],
          dislikedFoods: ['mushrooms'],
          mealComplexity: 'moderate'
        }
      })
    })
    return response.json()
  })

  const testGetProfile = () => runTest('Get User Profile', async () => {
    const response = await authFetch('/api/user/profile')
    return response.json()
  })

  const testGenerateMealPlan = () => runTest('Generate Meal Plan', async () => {
    const response = await authFetch('/api/meal-plan/generate', {
      method: 'POST',
      body: JSON.stringify({
        duration: 3
      })
    })
    return response.json()
  })

  const clearResults = () => {
    setTestResults([])
  }

  if (!isAuthenticated) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Authentication Test</CardTitle>
          <CardDescription>
            Please sign in with Microsoft to test the authentication integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Sign in to see user data and test API calls</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Microsoft Authentication Test</CardTitle>
          <CardDescription>
            Testing the integration with real Microsoft user data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="font-semibold">User ID:</p>
              <p className="text-sm font-mono break-all">{user?.id}</p>
            </div>
            <div>
              <p className="font-semibold">Email:</p>
              <p className="text-sm">{user?.email}</p>
            </div>
            <div>
              <p className="font-semibold">Name:</p>
              <p className="text-sm">{user?.name}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold">API Tests</h3>
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={testCreateProfile}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                Create/Update Profile
              </Button>
              <Button 
                onClick={testGetProfile}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                Get Profile
              </Button>
              <Button 
                onClick={testGenerateMealPlan}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                Generate Meal Plan
              </Button>
              <Button 
                onClick={clearResults}
                variant="secondary"
                size="sm"
              >
                Clear Results
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {testResults.map((result, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg border ${
                  result.status === 'success' 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold">{result.name}</h4>
                  <div className="text-sm text-muted-foreground">
                    {result.timestamp} • {result.duration}
                  </div>
                </div>
                
                {result.status === 'success' ? (
                  <div>
                    <p className="text-green-700 mb-2">✓ Success</p>
                    <details className="text-sm">
                      <summary className="cursor-pointer font-medium">View Response</summary>
                      <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto">
                        {JSON.stringify(result.result, null, 2)}
                      </pre>
                    </details>
                  </div>
                ) : (
                  <div>
                    <p className="text-red-700 mb-2">✗ Error</p>
                    <p className="text-sm text-red-600">{result.error}</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}