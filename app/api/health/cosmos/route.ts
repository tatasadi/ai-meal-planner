import { NextRequest, NextResponse } from 'next/server'
import { checkCosmosDBHealth, initializeCosmosDB } from '@/lib/cosmos-db'
import { isCosmosDBConfigured } from '@/lib/cosmos-config'

/**
 * Health check endpoint for Cosmos DB
 * GET /api/health/cosmos
 */
export async function GET(request: NextRequest) {
  try {
    // Check if Cosmos DB is configured
    if (!isCosmosDBConfigured()) {
      return NextResponse.json({
        status: 'error',
        message: 'Cosmos DB not configured',
        configured: false,
        timestamp: new Date().toISOString()
      }, { status: 503 })
    }

    // Try to initialize and check health
    await initializeCosmosDB()
    const isHealthy = await checkCosmosDBHealth()

    if (isHealthy) {
      return NextResponse.json({
        status: 'healthy',
        message: 'Cosmos DB is accessible',
        configured: true,
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json({
        status: 'unhealthy',
        message: 'Cosmos DB is not accessible',
        configured: true,
        timestamp: new Date().toISOString()
      }, { status: 503 })
    }

  } catch (error: any) {
    console.error('Cosmos DB health check failed:', error)
    
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Cosmos DB health check failed',
      configured: isCosmosDBConfigured(),
      timestamp: new Date().toISOString()
    }, { status: 503 })
  }
}