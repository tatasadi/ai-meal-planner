import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { model } from '@/lib/azure-openai'

export async function GET() {
  try {
    console.log('Testing Azure OpenAI connection...')
    
    const { text } = await generateText({
      model,
      prompt: 'Say "Hello, Azure OpenAI is working!" and nothing else.',
      maxTokens: 50,
      temperature: 0.1,
    })

    return NextResponse.json({
      success: true,
      message: 'Azure OpenAI connection successful',
      response: text,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Azure OpenAI test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: {
        url: error.url || 'Unknown',
        statusCode: error.statusCode || 'Unknown',
        responseBody: error.responseBody || 'Unknown',
      },
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}