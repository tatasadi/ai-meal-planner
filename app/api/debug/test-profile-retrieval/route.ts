import { NextRequest, NextResponse } from 'next/server'
import { getContainer, initializeCosmosDB } from '@/lib/cosmos-db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 })
    }

    await initializeCosmosDB()
    const container = getContainer('userProfiles')
    
    // Try multiple approaches to debug
    const results: any = {}
    
    // 1. Direct item read (what's currently failing)
    try {
      const { resource } = await container.item(userId, userId).read()
      results.directRead = resource || 'null'
    } catch (error: any) {
      results.directReadError = `${error.code}: ${error.message}`
    }
    
    // 2. Query by ID
    try {
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: userId }]
      }
      const { resources } = await container.items.query(querySpec).fetchAll()
      results.queryById = resources.length > 0 ? resources[0] : 'not found'
      results.queryByIdCount = resources.length
    } catch (error: any) {
      results.queryByIdError = error.message
    }
    
    // 3. Get all documents to see what's actually stored
    try {
      const { resources } = await container.items.readAll().fetchAll()
      results.allDocuments = resources.map((doc: any) => ({
        id: doc.id,
        email: doc.email,
        hasIdField: !!doc.id,
        docKeys: Object.keys(doc)
      }))
      results.totalDocuments = resources.length
    } catch (error: any) {
      results.allDocumentsError = error.message
    }
    
    return NextResponse.json({
      searchedUserId: userId,
      results
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}